import { existsSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { userKind, type Injected, type UserKind } from "../model/injected";
import { titleOf } from "../model/title";
import { assignTurns } from "../model/turns";
import type { Platform } from "../platform/paths";
import { toHost, wslPlace } from "../platform/wsl";
import { PI_INTERRUPT, piProfile, piShellText } from "./pi.profile";
import { canonical, parseLines, readJsonl, TypeCounter } from "./read";
import { sourceId, type Adapter, type ConvertContext, type Converted, type ConvertedRecord, type ForgetPlan, type ForgetStep, type ForgetTarget, type Peeked, type SourceRoot } from "./types";

const AGENT = "pi" as const;
/** `<time it started>_<session id>.jsonl`, the time with `-` for `:` and `.` (1.2.0). */
const FILE = /^(\d{4}-\d{2}-\d{2}T[\d-]+Z)_(.+)\.jsonl$/;
/** The full output of a long command, which Pi saves in the temporary folder. */
const FULL_OUTPUT = /^pi-bash-[0-9a-f]+\.log$/;

const str = (v: unknown): string | null => (typeof v === "string" && v ? v : null);

function isDir(p: string): boolean {
  try {
    return statSync(p).isDirectory();
  } catch {
    return false;
  }
}

/** The folder Pi keeps a directory's sessions in: the path without its first separator, `/`, `\` and `:` as `-`. */
export function piFolder(dir: string): string {
  return `--${dir.replace(/^[/\\]/, "").replace(/[/\\:]/g, "-")}--`;
}

/** `message/<role>` for a message entry; the entry type alone for the others. */
function roleOf(obj: Record<string, unknown>): string | null {
  if (obj.type !== "message") return null;
  const role = (obj.message as { role?: unknown } | undefined)?.role;
  return typeof role === "string" ? role : "(no role)";
}

const keyOf = (obj: Record<string, unknown>): string => {
  const type = typeof obj.type === "string" ? obj.type : "(no type)";
  const role = roleOf(obj);
  return role ? `${type}/${role}` : type;
};

/** An AI reply the user stopped with Esc: Pi marks it aborted ("This operation was aborted"). */
function stopped(m: Record<string, unknown>): boolean {
  return m.role === "assistant" && (m.stopReason === "aborted" || (m.stopReason === "error" && /\baborted\b/i.test(String(m.errorMessage ?? ""))));
}

/**
 * The entries of the branch the user is on: from the last entry back to the root.
 * Going back with /tree leaves the other branches in the same file. null when the
 * entries have no ids (format 1, which Pi rewrites when it opens the session).
 */
function activeBranch(lines: { obj: Record<string, unknown> }[]): Set<string> | null {
  const entries = lines.filter((l) => l.obj.type !== "session" && str(l.obj.id));
  if (!entries.length) return null;
  const byId = new Map(entries.map((l) => [l.obj.id as string, l.obj]));
  const out = new Set<string>();
  for (let e: Record<string, unknown> | undefined = entries.at(-1)!.obj; e && !out.has(e.id as string); e = byId.get(str(e.parentId) ?? "")) out.add(e.id as string);
  return out;
}

export function convertPi(text: string, ctx: ConvertContext): Converted {
  const parsed = parseLines(text);
  const header = parsed.find((l) => l.obj.type === "session")?.obj ?? {};
  const version = typeof header.version === "number" ? `session format ${header.version}` : null;
  // Record types its profile does not list (arch.md §6.1, point 4).
  const types = new TypeCounter(piProfile.recordTypes);
  for (const { obj } of parsed) types.add(typeof obj.type === "string" ? obj.type : "(no type)", roleOf(obj), version);
  const notJson = text.split("\n").filter((l) => l.trim()).length - parsed.length;
  for (let i = 0; i < notJson; i++) types.notJson(version);

  const active = activeBranch(parsed);
  const onBranch = (obj: Record<string, unknown>) => active === null || active.has(str(obj.id) ?? "");
  let name: string | null = null;
  for (const { obj } of parsed) if (obj.type === "session_info") name = str(obj.name) ?? name;

  // What trajectory leaves out, put in as user messages it reads (they keep their entry
  // ids): a `!` command with its output, a compaction summary, a left branch's summary,
  // and where the user stopped a reply.
  const why = new Map<string, Injected>();
  const lines: string[] = [];
  const asUser = (obj: Record<string, unknown>, id: string, content: string) =>
    JSON.stringify({ type: "message", id, parentId: obj.parentId ?? null, timestamp: obj.timestamp, message: { role: "user", content, timestamp: Date.parse(String(obj.timestamp ?? "")) || 0 } });
  for (const { obj } of parsed) {
    if (obj.type === "session") {
      lines.push(JSON.stringify(obj));
      continue;
    }
    if (!onBranch(obj)) continue;
    const id = str(obj.id) ?? "";
    const m = (obj.message ?? {}) as Record<string, unknown>;
    if (obj.type === "message" && m.role === "bashExecution") lines.push(asUser(obj, id, piShellText(m)));
    else if ((obj.type === "compaction" || obj.type === "branch_summary") && str(obj.summary)) {
      lines.push(asUser(obj, id, obj.summary as string));
      why.set(id, obj.type === "compaction" ? "compact_summary" : "harness");
    } else if (obj.type === "message") {
      lines.push(JSON.stringify(obj));
      if (stopped(m)) lines.push(asUser(obj, `${id}:stopped`, PI_INTERRUPT));
    }
  }

  const merged: { rec: ConvertedRecord; kind: UserKind | null }[] = [];
  const { records: canon } = canonical("pi", lines.join("\n") + "\n");
  for (const c of canon) {
    const body = JSON.parse(c.record_json) as ConvertedRecord["body"];
    const flagged = why.get(c.stable_source_record_id) ?? null;
    const kind = body.role === "user" ? (flagged ? "injected" : userKind(body.content)) : null;
    merged.push({
      kind,
      rec: {
        uid: c.record_type === "meta" ? null : c.stable_source_record_id,
        part: c.component_index,
        turn: 0,
        injected: kind === "injected" ? (flagged ?? "harness") : null,
        role: body.role,
        ts: "timestamp" in body ? body.timestamp : null,
        body,
      },
    });
  }
  const turns = assignTurns(merged.map((m) => m.kind));
  const records = merged.map((m, i) => ({ ...m.rec, turn: turns[i]! }));

  // The second layer of the alarm (plan §6 ⑦.1): conversation entries of the branch that became no record.
  const unread = new TypeCounter({});
  const produced = new Set(records.map((r) => r.uid));
  for (const { obj } of parsed) {
    const key = keyOf(obj);
    if (!piProfile.conversation.includes(key) || !onBranch(obj)) continue;
    if (produced.has(str(obj.id)) || piProfile.expectedDrop(obj)) continue;
    unread.add(key, null, version);
  }
  const cwd = str(header.cwd);
  // The header names the directory; without it the project would be guessed wrong (plan §6 ⑧, task 0).
  if (cwd === null) unread.add("start directory", null, version);
  const prompts = merged.filter((m) => m.kind === "prompt").map((m) => (m.rec.body as { content: string }).content);
  const times = records.map((r) => r.ts).filter((t): t is string => Boolean(t));

  return {
    session: {
      id: ctx.sessionId,
      agent: AGENT,
      env: ctx.root.env,
      project: ctx.project(cwd),
      title: titleOf(name, null, prompts),
      branch: null,
      startedAt: str(header.timestamp) ?? times[0] ?? null,
      endedAt: times.at(-1) ?? str(header.timestamp),
      continuedIn: null,
      forkedFrom: null,
      forkPoint: null,
    },
    records,
    unknown: types.list(),
    unread: unread.list(),
  };
}

/** The full-output files a session's long commands left in the temporary folder, as paths here. */
function fullOutputs(file: string, platform: Platform): string[] {
  const place = platform.env === "win" ? wslPlace(platform, file) : null;
  const out = new Set<string>();
  try {
    for (const { obj } of parseLines(readJsonl(file))) {
      const m = (obj.message ?? {}) as { fullOutputPath?: unknown; details?: { fullOutputPath?: unknown } };
      for (const p of [m.fullOutputPath, m.details?.fullOutputPath]) {
        if (typeof p !== "string" || !FULL_OUTPUT.test(path.basename(p))) continue;
        // A WSL session seen from Windows names a path in WSL.
        const here = place && p.startsWith("/") ? toHost(place.root, p) : p;
        if (existsSync(here)) out.add(here);
      }
    }
  } catch {}
  return [...out];
}

export const pi: Adapter = {
  agent: AGENT,

  home(platform: Platform): string {
    return platform.vars[piProfile.homeVar] || path.join(platform.home, piProfile.homeDir, "agent");
  },

  homeOf(root: SourceRoot): string {
    return path.dirname(root.path);
  },

  /**
   * Pi does not say which sessions it has open: it keeps no file open and no lock,
   * and renames its process `pi` (1.2.0). A session in a folder Pi runs in may be open.
   */
  openByFolder: {
    isProcess: (args) => args[0] === "pi" || path.basename(args[1] ?? "") === "pi" || args.some((a) => a.includes("pi-coding-agent")),
    sessionsIn(root: SourceRoot, dir: string): string[] {
      try {
        return readdirSync(path.join(root.path, piFolder(dir)))
          .map((name) => FILE.exec(name)?.[2]?.toLowerCase())
          .filter((id): id is string => Boolean(id));
      } catch {
        return [];
      }
    },
  },

  /** Pi has no delete command: its /resume list deletes the session file, as meme does (plan §6 ⑩). */
  forgetPlan(target: ForgetTarget, platform: Platform): ForgetPlan {
    const steps: ForgetStep[] = [];
    for (const file of target.files) {
      for (const out of fullOutputs(file, platform)) steps.push({ kind: "remove", path: out, dir: false, what: "the full output of a long command" });
      steps.push({ kind: "remove", path: file, dir: false, what: "the session" });
    }
    return { steps, gone: target.files, notes: [] };
  },

  launch(firstMessage: string) {
    // After `--` the message is a message even when it starts with a dash.
    return { cmd: piProfile.command, args: ["--", firstMessage] };
  },

  /** `<agent dir>/sessions`, or where PI_CODING_AGENT_SESSION_DIR says; in WSL also the Windows ones. */
  roots(platform: Platform): SourceRoot[] {
    const local = platform.vars.PI_CODING_AGENT_SESSION_DIR || path.join(this.home(platform), "sessions");
    const roots: SourceRoot[] = [{ id: sourceId(AGENT, platform.env, local), agent: AGENT, env: platform.env, path: local }];
    if (platform.env === "wsl" && platform.windowsUsersDir) {
      let users: string[] = [];
      try {
        users = readdirSync(platform.windowsUsersDir);
      } catch {}
      for (const user of users.sort()) {
        const dir = path.join(platform.windowsUsersDir, user, piProfile.homeDir, "agent", "sessions");
        if (isDir(dir)) roots.push({ id: sourceId(AGENT, "win", dir), agent: AGENT, env: "win", path: dir });
      }
    }
    // On Windows: the running WSL distributions (plan step 5).
    for (const h of platform.wsl) {
      const dir = path.join(toHost(h.root, h.home), piProfile.homeDir, "agent", "sessions");
      if (isDir(dir)) roots.push({ id: sourceId(AGENT, "wsl", dir), agent: AGENT, env: "wsl", path: dir, wsl: { distro: h.distro, root: h.root } });
    }
    return roots;
  },

  /** `--<directory>--/<time>_<id>.jsonl`, one folder per directory. */
  listFiles(root: SourceRoot): string[] {
    const files: string[] = [];
    for (const entry of readdirSync(root.path, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const dir = path.join(root.path, entry.name);
      for (const f of readdirSync(dir, { withFileTypes: true })) {
        if (f.isFile() && FILE.test(f.name)) files.push(path.join(dir, f.name));
      }
    }
    return files;
  },

  sessionId(file: string): string | null {
    return FILE.exec(path.basename(file))?.[2]?.toLowerCase() ?? null;
  },


  convert(files: string[], ctx: ConvertContext): Converted {
    // Pi keeps one file per session.
    return convertPi(readJsonl(files[0]!), ctx);
  },

  /** The header has the directory and the time it started; the last entry, the time it was last active. */
  peek(files: string[]): Peeked {
    const out: Peeked = { cwd: null, title: null, startedAt: null, endedAt: null, version: null };
    try {
      for (const { obj } of parseLines(readJsonl(files[0]!))) {
        if (obj.type === "session") {
          out.cwd = str(obj.cwd);
          out.startedAt = str(obj.timestamp);
          out.version = typeof obj.version === "number" ? `session format ${obj.version}` : null;
        }
        if (obj.type === "session_info") out.title = str(obj.name) ?? out.title;
        out.endedAt = str(obj.timestamp) ?? out.endedAt;
      }
    } catch {}
    if (!out.endedAt) {
      try {
        out.endedAt = new Date(statSync(files[0]!).mtimeMs).toISOString();
      } catch {}
    }
    return out;
  },
};
