import type { CanonicalRecord } from "@letta-ai/trajectory";
import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { zstdDecompressSync } from "node:zlib";
import { summaryText } from "../model/compaction";
import { userKind, type UserKind } from "../model/injected";
import { contentOf, type Body } from "../model/record";
import { titleOf } from "../model/title";
import { assignTurns } from "../model/turns";
import { displayPath, wslToWin, type Platform } from "../platform/paths";
import { codexProfile } from "./codex.profile";
import { canonical, dropPartialLine, TypeCounter, typeKey } from "./read";
import { commandLine, findCommand } from "../platform/spawn";
import { toHost, toLinux, wslCommand, wslExe, wslPlace } from "../platform/wsl";
import { sourceId, type Adapter, type ConvertContext, type Converted, type ConvertedRecord, type ForgetPlan, type ForgetTarget, type OpenEntry, type Peeked, type SourceRoot } from "./types";

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
  cli_version?: string;
  timestamp?: string;
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

/**
 * The second layer of the alarm (plan §6 ⑦.1): conversation lines of a session's
 * own file that became no record, matched by position (trajectory's ids for
 * Codex are the line's byte offset).
 */
function unreadLines(text: string, produced: Set<string>, dropped: Set<number>, group: string, version: string | null, unread: TypeCounter): void {
  let offset = 0;
  text.split("\n").forEach((line, i) => {
    const at = offset;
    offset += Buffer.byteLength(line, "utf8") + 1;
    if (!line.trim()) return;
    let o: { type?: unknown; payload?: { type?: unknown } } | null = null;
    try {
      o = JSON.parse(line);
    } catch {
      return; // counted as "(not JSON)" already
    }
    if (!o || typeof o !== "object") return;
    const key = typeKey(o.type, o.payload && typeof o.payload === "object" ? o.payload.type : undefined);
    if (!codexProfile.conversation.includes(key)) return;
    if (produced.has(locationId(group, at)) || dropped.has(i) || codexProfile.expectedDrop(o as Record<string, unknown>)) return;
    unread.add(key, null, version);
  });
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
function chain(file: Loaded, own: Loaded[], ctx: ConvertContext, cut: number | undefined, depth: number, unread: TypeCounter, top = ctx.sessionId): ChainRecord[] {
  const out: ChainRecord[] = [];
  const base = file.meta.history_base;
  if (base?.thread_id && typeof base.end_byte_offset === "number" && depth < 8) {
    const baseId = base.thread_id.toLowerCase();
    const candidates = (baseId === ctx.sessionId ? own : ctx.filesOf(baseId).map(load)).filter((f) => f !== file && f.path !== file.path && byAge(f, file) < 0);
    const baseFile = candidates.sort(byAge).at(-1);
    if (baseFile) out.push(...chain(baseFile, baseId === ctx.sessionId ? own : candidates, { ...ctx, sessionId: baseId }, base.end_byte_offset, depth + 1, unread, top));
  }
  const text = (cut === undefined ? file.buf : file.buf.subarray(0, cut)).toString("utf8");
  const group = file.meta.id?.toLowerCase();
  const ownRecord = (group ?? ctx.sessionId) === top;
  // Ids are per file position; a rollback's later file gets its own prefix so they never collide.
  const uidOf = (id: string) => (file.tag ? `${file.tag}:${id}` : id);
  const { records, dropped } = canonical("codex", text, { groupId: group, partial: Boolean(base) && cut === undefined });
  const trajectoryGroup = records[0]?.source_group_id ?? group ?? ctx.sessionId;
  if (ownRecord) unreadLines(text, new Set(records.map((c) => c.stable_source_record_id)), dropped, trajectoryGroup, file.meta.cli_version ?? null, unread);
  const mine: ChainRecord[] = [];
  for (const c of records) {
    const body = JSON.parse(c.record_json) as Body;
    const kind = body.role === "user" ? userKind(body.content) : null;
    mine.push({
      kind,
      own: ownRecord,
      rec: {
        uid: c.record_type === "meta" ? null : uidOf(c.stable_source_record_id),
        part: c.component_index,
        turn: 0,
        injected: kind === "injected" ? "harness" : null,
        role: body.role,
        ts: "timestamp" in body ? body.timestamp : null,
        body,
      },
    });
  }
  markCompactions(text, records, mine, trajectoryGroup, uidOf, ownRecord, ownRecord ? unread : null, file.meta.cli_version ?? null);
  out.push(...mine);
  return out;
}

interface Compacted {
  offset: number;
  ts: string | null;
  /** The summary without Codex's prefix; empty when it cannot be read. */
  summary: string;
  /** It carries an encrypted summary (server-side compaction): unreadable by design, not a format meme lost. */
  encrypted: boolean;
}

/** Where Codex compacted its context: its `compacted` items, which trajectory leaves out. */
function compactions(text: string): Compacted[] {
  if (!text.includes('"type":"compacted"')) return [];
  const out: Compacted[] = [];
  let offset = 0;
  for (const line of text.split("\n")) {
    if (line.includes('"type":"compacted"')) {
      try {
        const o = JSON.parse(line);
        if (o?.type === "compacted") {
          const message = typeof o.payload?.message === "string" ? o.payload.message : "";
          const encrypted = JSON.stringify(o.payload ?? {}).includes('"encrypted_content"');
          out.push({ offset, ts: typeof o.timestamp === "string" ? o.timestamp : null, summary: summaryText(message), encrypted });
        }
      } catch {}
    }
    offset += Buffer.byteLength(line, "utf8") + 1;
  }
  return out;
}

/** trajectory's id for a Codex line: its byte offset in the file (kind `location`). */
const locationId = (group: string, offset: number) => createHash("sha256").update(`${group}|byte|${offset}`, "utf8").digest("hex");

/**
 * Compactions (handoff.md §7.8): Codex also writes the summary as an ordinary AI
 * message right before the `compacted` item. That message is marked as the
 * summary, so it never counts as something the AI said. Without one, a record
 * for the compaction is added in its place, holding the summary if it is readable.
 */
function markCompactions(text: string, canon: CanonicalRecord[], recs: ChainRecord[], group: string, uidOf: (id: string) => string, own: boolean, unread: TypeCounter | null, version: string | null): void {
  const found = compactions(text);
  if (!found.length) return;
  const offsetOf = new Map<string, number>();
  let offset = 0;
  for (const line of text.split("\n")) {
    if (line.trim()) offsetOf.set(locationId(group, offset), offset);
    offset += Buffer.byteLength(line, "utf8") + 1;
  }
  const offsets = canon.map((c) => offsetOf.get(c.stable_source_record_id) ?? -1);
  // From the last one, so inserting a record does not move the ones still to do.
  for (const c of [...found].reverse()) {
    let at = offsets.length;
    while (at > 0 && offsets[at - 1]! > c.offset) at--;
    let matched = false;
    for (let i = at - 1; i >= 0 && c.summary; i--) {
      const r = recs[i]!;
      if (r.kind === "prompt") break;
      if (r.rec.role !== "assistant" || "tool_calls" in r.rec.body) continue;
      const said = contentOf(r.rec.body)?.trim() ?? "";
      if (said && (said === c.summary || c.summary.includes(said))) {
        r.rec.injected = "compact_summary";
        matched = true;
      }
      break;
    }
    if (matched) continue;
    // No readable summary and nothing encrypted: written in a way meme does not know (plan §6 ⑧, task 0).
    if (!c.summary && !c.encrypted) unread?.add("compacted", null, version);
    const body: Body = { role: "system", content: c.summary, timestamp: c.ts ?? "" };
    const rec: ChainRecord = {
      kind: null,
      own,
      rec: { uid: uidOf(locationId(group, c.offset)), part: 0, turn: 0, injected: c.summary ? "compact_summary" : "compaction", role: "system", ts: c.ts, body },
    };
    recs.splice(at, 0, rec);
    offsets.splice(at, 0, c.offset);
  }
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

/** Record types of a session's own files that its profile does not list (arch.md §6.1, point 4). */
function unknownTypes(own: Loaded[]): TypeCounter {
  const types = new TypeCounter(codexProfile.recordTypes);
  for (const f of own) {
    const version = typeof f.meta.cli_version === "string" ? f.meta.cli_version : null;
    for (const line of f.buf.toString("utf8").split("\n")) {
      if (!line.trim()) continue;
      let o: unknown;
      try {
        o = JSON.parse(line);
      } catch {
        types.notJson(version);
        continue;
      }
      if (!o || typeof o !== "object" || Array.isArray(o)) {
        types.notJson(version);
        continue;
      }
      const r = o as { type?: unknown; payload?: { type?: unknown } };
      const sub = r.payload && typeof r.payload === "object" && typeof r.payload.type === "string" ? r.payload.type : null;
      types.add(typeof r.type === "string" ? r.type : "(no type)", sub, version);
    }
  }
  return types;
}

/** `rollout-2026-10-12T11-33-04-…`: when it started, in local time. */
function nameTime(file: string): string | null {
  const m = FILE.exec(path.basename(file))?.[1];
  const p = m && /^(\d{4})-(\d{2})-(\d{2})T(\d{2})-(\d{2})-(\d{2})$/.exec(m);
  if (!p) return null;
  const [y, mo, d, h, mi, s] = p.slice(1).map(Number) as [number, number, number, number, number, number];
  return new Date(y, mo - 1, d, h, mi, s).toISOString();
}

/** The first line names the session and its directory; failing that, the file name has the time. */
export function peekCodex(files: string[], ctx: ConvertContext): Peeked {
  const out: Peeked = { cwd: null, title: threadNames(ctx.root.path).get(ctx.sessionId) ?? null, startedAt: null, endedAt: null, version: null };
  for (const file of [...files].sort()) {
    try {
      const f = load(file);
      out.cwd ??= f.meta.cwd ?? null;
      out.version = f.meta.cli_version ?? out.version;
      out.startedAt ??= f.meta.timestamp ?? null;
      out.endedAt = lastActivity(f.buf) ?? out.endedAt;
    } catch {}
    out.startedAt ??= nameTime(file);
    if (!out.endedAt) {
      try {
        out.endedAt = new Date(statSync(file).mtimeMs).toISOString();
      } catch {}
    }
  }
  return out;
}

export function convertCodex(files: string[], ctx: ConvertContext): Converted {
  const own = files.map(load).sort(byAge);
  const active = own.at(-1)!;
  // One meta record for the session: the oldest one in the chain.
  const unread = new TypeCounter({});
  const all = chain(active, own, ctx, undefined, 0, unread);
  const firstMeta = all.findIndex((r) => r.rec.role === "meta");
  const records = all.filter((r, i) => r.rec.role !== "meta" || i === firstMeta);
  const turns = assignTurns(records.map((r) => r.kind));
  const out = records.map((r, i) => ({ ...r.rec, turn: turns[i]! }));
  // A fork is named after its own first message, not its parent's.
  const prompts = records.filter((r) => r.kind === "prompt" && r.own).map((r) => (r.rec.body as { content: string }).content);
  const first = own[0]!;
  const times = out.map((r) => r.ts).filter((t): t is string => Boolean(t));
  // session_meta names the directory; without it the project would be guessed wrong (plan §6 ⑧, task 0).
  if (!first.meta.cwd && !active.meta.cwd) unread.add("start directory", null, first.meta.cli_version ?? null);
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
    unknown: unknownTypes(own).list(),
    unread: unread.list(),
  };
}

/**
 * How to run the codex of the side a session is on: here, in WSL from Windows
 * (through wsl.exe and the user's login shell), or on Windows from WSL (a .cmd
 * through cmd.exe). Codex deletes its own sessions; meme never writes its files.
 */
interface CodexRunner {
  /** The command; `commandLine` still applies (a .cmd on Windows). */
  line: (args: string[]) => string[];
  cwd?: string;
  /** Where, for the user: "in WSL (Ubuntu)"; empty here. */
  where: string;
  history: string;
}

function codexRunner(target: ForgetTarget, platform: Platform, home: string): CodexRunner | string {
  if (target.env === platform.env) {
    const exe = findCommand("codex", platform.vars);
    if (!exe) return "`codex delete` is not available here";
    return { line: (args) => [exe, ...args], where: "", history: displayPath(path.join(home, "history.jsonl"), platform.home) };
  }
  const file = target.files[0];
  if (platform.env === "win" && target.env === "wsl" && file) {
    const place = wslPlace(platform, file);
    const exe = wslExe(platform);
    const linux = place && toLinux(place.root, file);
    const codexHome = linux && /^(.*\/\.codex)\//.exec(linux)?.[1];
    if (!place || !exe || !codexHome) return "this Codex session is in WSL, and wsl.exe is not available here";
    const dir = path.posix.dirname(codexHome);
    return { line: (args) => wslCommand(exe, place.distro, dir, ["codex", ...args]), where: `in WSL (${place.distro})`, history: `${codexHome}/history.jsonl in WSL` };
  }
  if (platform.env === "wsl" && target.env === "win" && file && platform.windowsUsersDir) {
    const user = path.relative(platform.windowsUsersDir, file).split("/")[0];
    const codexHome = /^(.*\/\.codex)\//.exec(file)?.[1] ?? path.join(platform.windowsUsersDir, user ?? "", ".codex");
    const npm = user ? path.join(platform.windowsUsersDir, user, "AppData", "Roaming", "npm", "codex.cmd") : null;
    const exe = findCommand("codex.cmd", platform.vars) ?? findCommand("codex.exe", platform.vars) ?? (npm && existsSync(npm) ? npm : null);
    if (!exe) return "this Codex session is on the Windows side, and Codex is not installed there (or not on the PATH WSL sees)";
    const viaCmd = /\.(cmd|bat)$/i.test(exe);
    return {
      line: (args) => (viaCmd ? ["cmd.exe", "/d", "/c", wslToWin(exe), ...args] : [exe, ...args]),
      // cmd.exe cannot start in a WSL directory.
      cwd: platform.windowsUsersDir,
      where: "on the Windows side",
      history: wslToWin(`${codexHome}/history.jsonl`),
    };
  }
  return `this Codex session is on ${target.env}`;
}

/** Older Codex versions have no `delete`, and without a terminal it needs `--force`. */
function canDelete(r: CodexRunner): boolean {
  try {
    const [exe, ...args] = r.line(["delete", "--help"]);
    const line = commandLine(exe!, args);
    const p = Bun.spawnSync(line, { cwd: r.cwd, stdin: "ignore", stdout: "pipe", stderr: "pipe", timeout: 30_000, windowsVerbatimArguments: line[0] === "cmd.exe" });
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
    return platform.vars[codexProfile.homeVar] || path.join(platform.home, codexProfile.homeDir);
  },

  homeOf(root: SourceRoot): string {
    return root.path;
  },

  /** A rename appends to `session_index.jsonl`, not to the session's file. */
  rootState(root: SourceRoot): string | null {
    try {
      const st = statSync(path.join(root.path, "session_index.jsonl"));
      return `${st.size}:${st.mtimeMs}`;
    } catch {
      return null;
    }
  },

  /**
   * Codex (0.162) keeps `<home>/thread-writer-locks/<session id>.lock` locked with
   * flock while a session is open, and removes it when it quits; a killed one
   * leaves it unlocked (plan §6 ⑧.4).
   */
  openSessions(root: SourceRoot): OpenEntry[] | null {
    const dir = path.join(root.path, "thread-writer-locks");
    let names: string[];
    try {
      names = readdirSync(dir);
    } catch {
      return null;
    }
    const out: OpenEntry[] = [];
    for (const name of names) {
      const m = /^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\.lock$/i.exec(name);
      if (m) out.push({ session: m[1]!.toLowerCase(), lockFile: path.join(dir, name) });
    }
    return out;
  },

  /**
   * Codex deletes its own sessions: `codex delete --force <uuid>` removes the
   * files and its database rows (sessions.md §7.1). meme never touches them itself,
   * and only deletes sessions of the environment it runs in.
   */
  forgetPlan(target: ForgetTarget, platform: Platform): ForgetPlan {
    // `codex delete` is suggested only where meme could not look for it: on the other side.
    const inCodex = "delete it in Codex with /delete";
    const r = codexRunner(target, platform, this.home(platform));
    if (typeof r === "string") {
      const there = target.env !== platform.env ? `${inCodex}, or with \`codex delete ${target.id}\` there` : inCodex;
      return { steps: [], gone: [], notes: [], blocked: `${r}; ${there}. meme's copy follows on its own.` };
    }
    if (!canDelete(r)) {
      return { steps: [], gone: [], notes: [], blocked: `\`codex delete\` is not available ${r.where || "here"}; ${inCodex}${r.where ? " there" : ""}. meme's copy follows on its own.` };
    }
    const shown = r.where ? `codex delete --force ${target.id} ${r.where}` : undefined;
    return {
      steps: [{ kind: "run", cmd: r.line(["delete", "--force", target.id]), cwd: r.cwd, shown, what: "Codex removes the session's files and its database rows" }],
      gone: target.files,
      notes: [`Codex keeps what you typed in its own input history (${r.history}).`],
    };
  },

  launch(firstMessage: string) {
    return { cmd: codexProfile.command, args: [firstMessage] };
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
    // On Windows: the running WSL distributions (plan step 5).
    for (const h of platform.wsl) {
      const dir = path.join(toHost(h.root, h.home), ".codex");
      if (isDir(path.join(dir, "sessions")) || isDir(path.join(dir, "archived_sessions"))) roots.push({ id: sourceId(AGENT, "wsl", dir), agent: AGENT, env: "wsl", path: dir, wsl: { distro: h.distro, root: h.root } });
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

  peek(files: string[], ctx: ConvertContext): Peeked {
    return peekCodex(files, ctx);
  },
};
