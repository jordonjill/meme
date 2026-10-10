import { NormalizationError, normalizeToCanonical, type CanonicalRecord } from "@letta-ai/trajectory";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { zstdDecompressSync } from "node:zlib";
import { userKind, type UserKind } from "../model/injected";
import type { Body } from "../model/record";
import { titleOf } from "../model/title";
import { assignTurns } from "../model/turns";
import { displayPath, type Platform } from "../platform/paths";
import { BOUNDS } from "./claude-code";
import { dropPartialLine } from "./read";
import { commandLine, findCommand } from "../platform/spawn";
import { sourceId, type Adapter, type ConvertContext, type Converted, type ConvertedRecord, type ForgetPlan, type ForgetTarget, type SourceRoot } from "./types";

const AGENT = "codex" as const;
const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
/** `rollout-<time>-<session id>[_<file id>].jsonl[.zst]`; the second id is a file started by a rollback. */
const FILE = new RegExp(`^rollout-(\\d{4}-\\d{2}-\\d{2}T\\d{2}-\\d{2}-\\d{2})-(${UUID})(?:_(${UUID}))?\\.jsonl(\\.zst)?$`, "i");

function isDir(p: string): boolean {
  try {
    return statSync(p).isDirectory();
  } catch {
    return false;
  }
}

/** The text of a rollout file, unpacked if compressed, without a half-written last line. */
export function readRollout(file: string): Buffer {
  let buf = readFileSync(file);
  if (file.endsWith(".zst")) buf = zstdDecompressSync(buf);
  const text = buf.toString("utf8");
  const kept = dropPartialLine(text);
  return kept.length === text.length ? buf : Buffer.from(kept, "utf8");
}

interface HistoryBase {
  thread_id?: string;
  end_byte_offset?: number;
}

interface SessionMeta {
  id?: string;
  cwd?: string;
  forked_from_id?: string;
  history_base?: HistoryBase;
  git?: { branch?: string };
}

interface Loaded {
  path: string;
  /** The second id in the name: a file a rollback started. */
  tag: string | null;
  time: string;
  buf: Buffer;
  meta: SessionMeta;
}

function load(file: string): Loaded {
  const m = FILE.exec(path.basename(file));
  const buf = readRollout(file);
  let meta: SessionMeta = {};
  const nl = buf.indexOf(10);
  try {
    const first = JSON.parse(buf.subarray(0, nl < 0 ? buf.length : nl).toString("utf8"));
    if (first?.type === "session_meta" && first.payload && typeof first.payload === "object") meta = first.payload;
  } catch {}
  return { path: file, tag: m?.[3]?.toLowerCase() ?? null, time: m?.[1] ?? "", buf, meta };
}

/** Oldest first: by the time in the name, the original file before a rollback's. */
function byAge(a: Loaded, b: Loaded): number {
  return a.time.localeCompare(b.time) || Number(a.tag !== null) - Number(b.tag !== null) || a.path.localeCompare(b.path);
}

/** Thread names from `session_index.jsonl`; a rename appends a line, so the last one wins. */
const indexCache = new Map<string, { mtime: number; names: Map<string, string> }>();
function threadNames(home: string): Map<string, string> {
  const file = path.join(home, "session_index.jsonl");
  let mtime: number;
  try {
    mtime = statSync(file).mtimeMs;
  } catch {
    return new Map();
  }
  const cached = indexCache.get(file);
  if (cached && cached.mtime === mtime) return cached.names;
  const names = new Map<string, string>();
  for (const line of readFileSync(file, "utf8").split("\n")) {
    try {
      const o = JSON.parse(line);
      if (typeof o?.id === "string" && typeof o.thread_name === "string") names.set(o.id.toLowerCase(), o.thread_name);
    } catch {}
  }
  indexCache.set(file, { mtime, names });
  return names;
}

function canonical(text: string, groupId: string | undefined, partial: boolean): CanonicalRecord[] {
  const run = (group?: string) =>
    normalizeToCanonical({
      source: "codex",
      transcript: text,
      bounds: BOUNDS,
      ...(group || partial ? { sourceContext: { ...(group ? { groupId: group } : {}), ...(partial ? { partial } : {}) } } : {}),
    }).records;
  try {
    return run(groupId);
  } catch (err) {
    if (err instanceof NormalizationError) {
      if (err.code === "missing_user_records" || err.code === "missing_assistant_records") return [];
      if (err.code === "source_group_conflict") return run();
    }
    throw err;
  }
}

interface ChainRecord {
  rec: ConvertedRecord;
  kind: UserKind | null;
  /** From this session's own files, not a fork parent's. */
  own: boolean;
}

/**
 * The conversation a file stands for (sessions.md §7.1): what its `history_base`
 * points to, cut at the recorded byte offset, then the file's own records. A
 * rollback's base is the session's previous file; a fork's is its parent's file.
 */
function chain(file: Loaded, own: Loaded[], ctx: ConvertContext, cut: number | undefined, depth: number, top = ctx.sessionId): ChainRecord[] {
  const out: ChainRecord[] = [];
  const base = file.meta.history_base;
  if (base?.thread_id && typeof base.end_byte_offset === "number" && depth < 8) {
    const baseId = base.thread_id.toLowerCase();
    const candidates = (baseId === ctx.sessionId ? own : ctx.filesOf(baseId).map(load)).filter((f) => f !== file && f.path !== file.path && byAge(f, file) < 0);
    const baseFile = candidates.sort(byAge).at(-1);
    if (baseFile) out.push(...chain(baseFile, baseId === ctx.sessionId ? own : candidates, { ...ctx, sessionId: baseId }, base.end_byte_offset, depth + 1, top));
  }
  const text = (cut === undefined ? file.buf : file.buf.subarray(0, cut)).toString("utf8");
  const group = file.meta.id?.toLowerCase();
  for (const c of canonical(text, group, Boolean(base) && cut === undefined)) {
    const body = JSON.parse(c.record_json) as Body;
    const kind = body.role === "user" ? userKind(body.content) : null;
    out.push({
      kind,
      own: (group ?? ctx.sessionId) === top,
      rec: {
        // Ids are per file position; a rollback's later file gets its own prefix so they never collide.
        uid: c.record_type === "meta" ? null : file.tag ? `${file.tag}:${c.stable_source_record_id}` : c.stable_source_record_id,
        part: c.component_index,
        turn: 0,
        injected: kind === "injected",
        role: body.role,
        ts: "timestamp" in body ? body.timestamp : null,
        body,
      },
    });
  }
  return out;
}

/**
 * When the session was last active. Codex appends bookkeeping events (such as
 * `thread_settings_applied`) to old files when it starts, so only conversation
 * lines and turn events count.
 */
const ACTIVITY = /"type":"(?:response_item|event_msg)"[^]*?"payload":\{"type":"(?:message|reasoning|custom_tool_call|custom_tool_call_output|function_call|function_call_output|task_started|task_complete|turn_aborted|user_message|agent_message)"/;
function lastActivity(buf: Buffer): string | null {
  const lines = buf.toString("utf8").trimEnd().split("\n");
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i]!;
    if (!ACTIVITY.test(line)) continue;
    const m = /"timestamp":"([^"]+)"/.exec(line);
    if (m) return m[1]!;
  }
  return null;
}

export function convertCodex(files: string[], ctx: ConvertContext): Converted {
  const own = files.map(load).sort(byAge);
  const active = own.at(-1)!;
  // One meta record for the session: the oldest one in the chain.
  const all = chain(active, own, ctx, undefined, 0);
  const firstMeta = all.findIndex((r) => r.rec.role === "meta");
  const records = all.filter((r, i) => r.rec.role !== "meta" || i === firstMeta);
  const turns = assignTurns(records.map((r) => r.kind));
  const out = records.map((r, i) => ({ ...r.rec, turn: turns[i]! }));
  // A fork is named after its own first message, not its parent's.
  const prompts = records.filter((r) => r.kind === "prompt" && r.own).map((r) => (r.rec.body as { content: string }).content);
  const first = own[0]!;
  const times = out.map((r) => r.ts).filter((t): t is string => Boolean(t));
  return {
    session: {
      id: ctx.sessionId,
      agent: AGENT,
      env: ctx.root.env,
      project: ctx.project(first.meta.cwd ?? active.meta.cwd ?? null),
      title: titleOf(threadNames(ctx.root.path).get(ctx.sessionId) ?? null, null, prompts),
      branch: active.meta.git?.branch ?? first.meta.git?.branch ?? null,
      startedAt: times[0] ?? null,
      endedAt: lastActivity(active.buf) ?? times.at(-1) ?? null,
      continuedIn: null,
      forkedFrom: first.meta.forked_from_id?.toLowerCase() ?? null,
      forkPoint: first.meta.forked_from_id ? Math.max(0, records.findIndex((r) => r.own && r.rec.role !== "meta")) : null,
    },
    records: out,
  };
}

/** Older Codex versions have no `delete`, and without a terminal it needs `--force`. */
function codexCanDelete(exe: string): boolean {
  try {
    const p = Bun.spawnSync(commandLine(exe, ["delete", "--help"]), { stdout: "pipe", stderr: "pipe" });
    return p.exitCode === 0 && p.stdout.toString().includes("--force");
  } catch {
    return false;
  }
}

function walk(dir: string, out: string[]): void {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p, out);
    else if (entry.isFile() && FILE.test(entry.name)) out.push(p);
  }
}

export const codex: Adapter = {
  agent: AGENT,

  home(platform: Platform): string {
    return platform.vars.CODEX_HOME || path.join(platform.home, ".codex");
  },

  /**
   * Codex deletes its own sessions: `codex delete --force <uuid>` removes the
   * files and its database rows (sessions.md §7.1). meme never touches them itself,
   * and only deletes sessions of the environment it runs in.
   */
  forgetPlan(target: ForgetTarget, platform: Platform): ForgetPlan {
    const instead = `delete it in Codex with /delete, or with \`codex delete ${target.id}\``;
    if (target.env !== platform.env) {
      return { steps: [], gone: [], notes: [], blocked: `this Codex session is on the ${target.env === "win" ? "Windows" : target.env} side; ${instead} there. meme's copy follows on its own.` };
    }
    const exe = findCommand("codex", platform.vars);
    if (!exe || !codexCanDelete(exe)) {
      return { steps: [], gone: [], notes: [], blocked: `\`codex delete\` is not available here; ${instead}. meme's copy follows on its own.` };
    }
    return {
      steps: [{ kind: "run", cmd: [exe, "delete", "--force", target.id], what: "Codex removes the session's files and its database rows" }],
      gone: target.files,
      notes: [`Codex keeps what you typed in its own input history (${displayPath(path.join(this.home(platform), "history.jsonl"), platform.home)}).`],
    };
  },

  launch(firstMessage: string) {
    return { cmd: "codex", args: [firstMessage] };
  },

  /** `~/.codex` (sessions/ and archived_sessions/ together, so archiving is a move, not a delete); in WSL also the Windows one. */
  roots(platform: Platform): SourceRoot[] {
    const local = this.home(platform);
    const roots: SourceRoot[] = [{ id: sourceId(AGENT, platform.env, local), agent: AGENT, env: platform.env, path: local }];
    if (platform.env === "wsl" && platform.windowsUsersDir) {
      let users: string[] = [];
      try {
        users = readdirSync(platform.windowsUsersDir);
      } catch {}
      for (const user of users.sort()) {
        const dir = path.join(platform.windowsUsersDir, user, ".codex");
        if (isDir(path.join(dir, "sessions")) || isDir(path.join(dir, "archived_sessions"))) roots.push({ id: sourceId(AGENT, "win", dir), agent: AGENT, env: "win", path: dir });
      }
    }
    return roots;
  },

  listFiles(root: SourceRoot): string[] {
    const dirs = ["sessions", "archived_sessions"].map((d) => path.join(root.path, d)).filter(isDir);
    if (!dirs.length) throw new Error(`no sessions folder in ${root.path}`);
    const files: string[] = [];
    for (const d of dirs) walk(d, files);
    // A file both plain and compressed: read the plain one.
    const plain = new Set(files.filter((f) => !f.endsWith(".zst")));
    return files.filter((f) => !f.endsWith(".zst") || !plain.has(f.slice(0, -4)));
  },

  sessionId(file: string): string | null {
    return FILE.exec(path.basename(file))?.[2]?.toLowerCase() ?? null;
  },

  readText(file: string): string {
    return readRollout(file).toString("utf8");
  },

  convert(files: string[], ctx: ConvertContext): Converted {
    return convertCodex(files, ctx);
  },
};
