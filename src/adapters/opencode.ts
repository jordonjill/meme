import { constants, Database } from "bun:sqlite";
import { createHash } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { userKind, type Injected, type UserKind } from "../model/injected";
import { titleOf } from "../model/title";
import { assignTurns } from "../model/turns";
import { displayPath, wslToWin, type Platform } from "../platform/paths";
import { commandLine, findCommand } from "../platform/spawn";
import { toHost, toLinux, wslCommand, wslExe, wslPlace } from "../platform/wsl";
import { OPENCODE_INTERRUPT, OPENCODE_SHELL_MARK, openCodeProfile, openCodeShellText } from "./opencode.profile";
import { canonical, TypeCounter } from "./read";
import { sourceId, type Adapter, type ConvertContext, type Converted, type ConvertedRecord, type ForgetPlan, type ForgetStep, type ForgetTarget, type Peeked, type SourceRoot } from "./types";

const AGENT = "opencode" as const;
/** A session in the database is named `<database>#<session id>`. */
const SEP = "#";
/** The title OpenCode gives a session before it has generated one. */
const DEFAULT_TITLE = /^(?:New|Child) session - \d{4}-\d{2}-\d{2}T/;
/** The full output of a long command, which OpenCode saves in its data folder. */
const FULL_OUTPUT = /^tool_[0-9A-Za-z]+$/;

type Obj = Record<string, unknown>;

const str = (v: unknown): string | null => (typeof v === "string" && v ? v : null);
const isObj = (v: unknown): v is Obj => Boolean(v) && typeof v === "object" && !Array.isArray(v);
const iso = (ms: unknown): string | null => (typeof ms === "number" && Number.isFinite(ms) ? new Date(ms).toISOString() : null);

function parse(json: string): Obj {
  try {
    const v = JSON.parse(json);
    return isObj(v) ? v : {};
  } catch {
    return {};
  }
}

/** A session in the database, by its file name; `id` is OpenCode's own (`ses_…`). */
export function splitFile(file: string): { db: string; id: string } {
  const at = file.lastIndexOf(SEP);
  return { db: file.slice(0, at), id: file.slice(at + 1) };
}

/**
 * meme's id for an OpenCode session: its own without the `ses_` every one starts
 * with, in lower case. Its first 12 characters are the hex of when it started, so
 * the short ids read like the other agents' and are typed the same way.
 */
const memeId = (id: string): string => id.replace(/^ses_/, "").toLowerCase();

/**
 * The database is read where it is when it is on this side; meme never writes it.
 * With no write-ahead log next to it, nothing writes it now and it is opened
 * `immutable`, so SQLite creates no files there. On the other side (Windows
 * reading WSL, WSL reading Windows) SQLite's locks do not work: it is read from a copy.
 */
const handles = new Map<string, { stamp: string; db: Database }>();
function stampOf(file: string): string {
  const one = (f: string) => {
    try {
      const st = statSync(f);
      return `${st.size}:${st.mtimeMs}`;
    } catch {
      return "-";
    }
  };
  return `${one(file)}|${one(file + "-wal")}`;
}

function copyDir(file: string): string {
  return path.join(tmpdir(), "meme-opencode", createHash("sha256").update(file).digest("hex").slice(0, 16));
}

function openDb(file: string, local: boolean): Database {
  const stamp = stampOf(file);
  const cached = handles.get(file);
  if (cached && cached.stamp === stamp) return cached.db;
  cached?.db.close();
  let db: Database;
  if (!local) {
    // The copy stays for the next run, which copies again only once the database changed.
    const dir = copyDir(file);
    const copy = path.join(dir, "opencode.db");
    const stampFile = path.join(dir, "stamp");
    let fresh = false;
    try {
      fresh = readFileSync(stampFile, "utf8") === stamp && existsSync(copy);
    } catch {}
    if (!fresh) {
      rmSync(dir, { recursive: true, force: true });
      mkdirSync(dir, { recursive: true });
      copyFileSync(file, copy);
      if (existsSync(file + "-wal")) copyFileSync(file + "-wal", copy + "-wal");
      writeFileSync(stampFile, stamp);
    }
    db = new Database(copy, { readonly: true });
  } else if (existsSync(file + "-wal")) db = new Database(file, { readonly: true });
  else {
    const uri = "file:" + encodeURI(file.replace(/\\/g, "/").replace(/^(?=[A-Za-z]:)/, "/")).replace(/[?#]/g, encodeURIComponent);
    db = new Database(`${uri}?immutable=1`, constants.SQLITE_OPEN_READONLY | constants.SQLITE_OPEN_URI);
  }
  handles.set(file, { stamp, db });
  return db;
}

/** On the side meme runs on: not a WSL root seen from Windows, nor a Windows one seen from WSL. */
const localRoot = (root: Pick<SourceRoot, "wsl" | "env" | "path">) => !root.wsl && !(root.env === "win" && root.path.startsWith("/"));

function dbFor(root: SourceRoot): Database {
  if (!existsSync(root.path)) throw new Error(`no ${path.basename(root.path)} in ${path.dirname(root.path)}`);
  return openDb(root.path, localRoot(root));
}

interface SessionRow {
  id: string;
  directory: string;
  title: string;
  version: string;
  time_created: number;
  time_updated: number;
  revert: string | null;
  /** The bytes of its messages and parts, as OpenCode stores them. */
  bytes: number;
}

/** Sessions of a database by file, as last listed: their size and time for the import. */
const listed = new Map<string, SessionRow>();

// octet_length reads only the length SQLite keeps with each value, not the value.
const SESSIONS = `SELECT id, directory, title, version, time_created, time_updated, revert,
  (SELECT coalesce(sum(octet_length(data)), 0) FROM message m WHERE m.session_id = s.id) +
  (SELECT coalesce(sum(octet_length(data)), 0) FROM part p WHERE p.session_id = s.id) AS bytes
  FROM session s WHERE parent_id IS NULL`;

function sessionRow(db: Database, id: string): SessionRow | null {
  return db.query<SessionRow, [string]>(`${SESSIONS} AND id = ?`).get(id);
}

/** OpenCode 2.0 keeps a session's messages in `session_message` (it shares the database file). */
function v2Messages(db: Database, id: string): number {
  try {
    return db.query<{ n: number }, [string]>("SELECT count(*) AS n FROM session_message WHERE session_id = ?").get(id)?.n ?? 0;
  } catch {
    return 0;
  }
}

interface Message {
  info: Obj;
  parts: Obj[];
}

/** The session as `opencode export` writes it, `{ info, messages: [{ info, parts }] }`, which trajectory reads. */
function exportOf(db: Database, s: SessionRow): Message[] {
  const parts = new Map<string, Obj[]>();
  for (const p of db.query<{ id: string; message_id: string; data: string }, [string]>("SELECT id, message_id, data FROM part WHERE session_id = ? ORDER BY id").all(s.id)) {
    (parts.get(p.message_id) ?? parts.set(p.message_id, []).get(p.message_id)!).push({ ...parse(p.data), id: p.id, messageID: p.message_id, sessionID: s.id });
  }
  return db
    .query<{ id: string; data: string }, [string]>("SELECT id, data FROM message WHERE session_id = ? ORDER BY id")
    .all(s.id)
    .map((m) => ({ info: { ...parse(m.data), id: m.id, sessionID: s.id }, parts: parts.get(m.id) ?? [] }));
}

const textPart = (id: string, text: string, time: unknown): Obj => ({ id, type: "text", text, ...(isObj(time) ? { time: { start: time.created } } : {}) });

/**
 * What trajectory reads differently from what happened, put right before it reads:
 * messages the user undid (`/undo`) are left out; a `!` command, which OpenCode keeps
 * as a marker message and a bash call made for the user, becomes one user message
 * with its output; where the user stopped a reply, a user message says so.
 */
function rewrite(messages: Message[], revert: string | null): Message[] {
  let out = messages;
  const undoneFrom = str(parse(revert ?? "").messageID);
  if (undoneFrom) {
    const at = out.findIndex((m) => m.info.id === undoneFrom);
    if (at >= 0) out = out.slice(0, at);
  }
  const result: Message[] = [];
  for (let i = 0; i < out.length; i++) {
    const m = out[i]!;
    const next = out[i + 1];
    const marker = m.info.role === "user" && m.parts.length === 1 && m.parts[0]!.synthetic === true && m.parts[0]!.text === OPENCODE_SHELL_MARK;
    const call = next?.info.role === "assistant" && next.parts.length === 1 && next.parts[0]!.type === "tool" && next.parts[0]!.tool === "bash" ? next.parts[0]! : null;
    if (marker && call) {
      const state = isObj(call.state) ? call.state : {};
      const input = isObj(state.input) ? state.input : {};
      const output = typeof state.output === "string" ? state.output : isObj(state.metadata) && typeof state.metadata.output === "string" ? state.metadata.output : "";
      result.push({ info: m.info, parts: [textPart(m.parts[0]!.id as string, openCodeShellText(String(input.command ?? ""), output.replace(/\n$/, "")), m.info.time)] });
      i++;
      continue;
    }
    result.push(m);
    const error = isObj(m.info.error) ? m.info.error : null;
    if (m.info.role === "assistant" && error?.name === "MessageAbortedError") {
      const id = `${m.info.id}:stopped`;
      result.push({ info: { id, role: "user", time: m.info.time, sessionID: m.info.sessionID }, parts: [textPart(id, OPENCODE_INTERRUPT, m.info.time)] });
    }
  }
  return result;
}

export function convertOpenCode(db: Database, s: SessionRow, ctx: ConvertContext): Converted {
  const version = str(s.version);
  const types = new TypeCounter(openCodeProfile.recordTypes);
  const unread = new TypeCounter({});
  const original = exportOf(db, s);
  for (const m of original) {
    types.add("message", str(m.info.role) ?? "(no role)", version);
    for (const p of m.parts) types.add("part", str(p.type) ?? "(no type)", version);
  }
  // Written by OpenCode 2.0, which meme does not read yet (plan §6 ⑩).
  if (!original.length && v2Messages(db, s.id)) unread.add("session_message (OpenCode 2.0)", null, version);

  const messages = rewrite(original, s.revert);
  // Parts that are the harness's: a compaction summary, and text marked synthetic (an attached file read for the user).
  const why = new Map<string, Injected>();
  for (const m of messages) {
    for (const p of m.parts) {
      const id = str(p.id);
      if (!id) continue;
      if (m.info.role === "assistant" && m.info.summary === true) why.set(id, "compact_summary");
      else if (p.synthetic === true) why.set(id, "harness");
    }
  }
  const info = { id: s.id, directory: s.directory, title: s.title, version: s.version, time: { created: s.time_created, updated: s.time_updated } };
  const merged: { rec: ConvertedRecord; kind: UserKind | null }[] = [];
  if (messages.length) {
    const { records: canon } = canonical("opencode", JSON.stringify({ info, messages }));
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
          injected: flagged && (kind === "injected" || body.role === "assistant") ? flagged : null,
          role: body.role,
          ts: "timestamp" in body ? body.timestamp : null,
          body,
        },
      });
    }
  }
  const turns = assignTurns(merged.map((m) => m.kind));
  const records = merged.map((m, i) => ({ ...m.rec, turn: turns[i]! }));

  // The second layer of the alarm (plan §6 ⑦.1): parts of a conversation type that became no record.
  const produced = new Set(records.map((r) => r.uid));
  for (const m of messages) {
    for (const p of m.parts) {
      const key = `part/${String(p.type)}`;
      if (!openCodeProfile.conversation.includes(key) || produced.has(str(p.id))) continue;
      if (openCodeProfile.expectedDrop({ ...p, role: m.info.role })) continue;
      unread.add(key, null, version);
    }
  }
  if (!str(s.directory)) unread.add("start directory", null, version);
  const prompts = merged.filter((m) => m.kind === "prompt").map((m) => (m.rec.body as { content: string }).content);
  const times = records.map((r) => r.ts).filter((t): t is string => Boolean(t));
  return {
    session: {
      id: ctx.sessionId,
      agent: AGENT,
      env: ctx.root.env,
      project: ctx.project(str(s.directory)),
      title: titleOf(null, DEFAULT_TITLE.test(s.title) ? null : s.title, prompts),
      branch: null,
      startedAt: iso(s.time_created) ?? times[0] ?? null,
      endedAt: times.at(-1) ?? iso(s.time_updated),
      continuedIn: null,
      forkedFrom: null,
      forkPoint: null,
    },
    records,
    unknown: types.list(),
    unread: unread.list(),
  };
}

/** The full-output files of a session's long commands, as paths here. */
function fullOutputs(db: Database, id: string, dataDir: string): string[] {
  const out = new Set<string>();
  for (const { data } of db.query<{ data: string }, [string]>("SELECT data FROM part WHERE session_id = ? AND data LIKE '%outputPath%'").all(id)) {
    const state = parse(data).state;
    const meta = isObj(state) && isObj(state.metadata) ? state.metadata : {};
    const p = str(meta.outputPath);
    if (!p || !FULL_OUTPUT.test(path.basename(p.replace(/\\/g, "/")))) continue;
    // Seen from the other side, the file is where the database is, under its own name.
    const here = path.join(dataDir, "tool-output", path.basename(p.replace(/\\/g, "/")));
    if (existsSync(here)) out.add(here);
  }
  return [...out];
}

/** How to run the opencode of the side a session is on (as for Codex): here, in WSL from Windows, on Windows from WSL. */
function runner(target: ForgetTarget, platform: Platform, db: string): { line: (args: string[]) => string[]; cwd?: string; where: string } | string {
  if (target.env === platform.env) {
    const exe = findCommand(openCodeProfile.command, platform.vars);
    return exe ? { line: (args) => [exe, ...args], where: "" } : "`opencode` is not available here";
  }
  if (platform.env === "win" && target.env === "wsl") {
    const place = wslPlace(platform, db);
    const exe = wslExe(platform);
    const linux = place && toLinux(place.root, db);
    const home = linux && /^(.*?)\/\.local\/share\/opencode\//.exec(linux)?.[1];
    if (!place || !exe || !home) return "this OpenCode session is in WSL, and wsl.exe is not available here";
    return { line: (args) => wslCommand(exe, place.distro, home, [openCodeProfile.command, ...args]), where: `in WSL (${place.distro})` };
  }
  if (platform.env === "wsl" && target.env === "win" && platform.windowsUsersDir) {
    const user = path.relative(platform.windowsUsersDir, db).split("/")[0];
    const npm = user ? path.join(platform.windowsUsersDir, user, "AppData", "Roaming", "npm", "opencode.cmd") : null;
    const exe = findCommand("opencode.cmd", platform.vars) ?? findCommand("opencode.exe", platform.vars) ?? (npm && existsSync(npm) ? npm : null);
    if (!exe) return "this OpenCode session is on the Windows side, and OpenCode is not installed there (or not on the PATH WSL sees)";
    const viaCmd = /\.(cmd|bat)$/i.test(exe);
    // cmd.exe cannot start in a WSL directory.
    return { line: (args) => (viaCmd ? ["cmd.exe", "/d", "/c", wslToWin(exe), ...args] : [exe, ...args]), cwd: platform.windowsUsersDir, where: "on the Windows side" };
  }
  return `this OpenCode session is on ${target.env}`;
}

/** Older versions have no `session delete`. */
function canDelete(r: { line: (args: string[]) => string[]; cwd?: string }): boolean {
  try {
    const [exe, ...args] = r.line(["session", "delete", "--help"]);
    const line = commandLine(exe!, args);
    const p = Bun.spawnSync(line, { cwd: r.cwd, stdin: "ignore", stdout: "pipe", stderr: "pipe", timeout: 30_000, env: { ...process.env, OPENCODE_DISABLE_AUTOUPDATE: "1" }, windowsVerbatimArguments: line[0] === "cmd.exe" });
    return p.exitCode === 0 && /delete a session/i.test(p.stdout.toString() + p.stderr.toString());
  } catch {
    return false;
  }
}

function dataDir(platform: Platform): string {
  return path.join(platform.vars.XDG_DATA_HOME || path.join(platform.home, ".local", "share"), "opencode");
}

export const openCode: Adapter = {
  agent: AGENT,

  home(platform: Platform): string {
    return dataDir(platform);
  },

  /** A root is the database file; OpenCode is installed where its data folder is. */
  homeOf(root: SourceRoot): string {
    return path.dirname(root.path);
  },

  /**
   * OpenCode does not say which sessions it has open: its process holds the one
   * database every session is in (1.19). A session of a folder it runs in may be open.
   */
  openByFolder: {
    isProcess: (args) => /^opencode(\.exe)?$/i.test(path.basename(args[0] ?? "")) || /opencode-(linux|darwin|windows)/.test(args[0] ?? ""),
    sessionsIn(root: SourceRoot, dir: string): string[] {
      try {
        return dbFor(root).query<{ id: string }, [string]>("SELECT id FROM session WHERE parent_id IS NULL AND directory = ?").all(dir).map((r) => memeId(r.id));
      } catch {
        return [];
      }
    },
  },

  /** OpenCode deletes its own sessions (`opencode session delete`, 1.19); meme removes the full outputs it saved. */
  forgetPlan(target: ForgetTarget, platform: Platform): ForgetPlan {
    const inOpenCode = "delete it in OpenCode (/sessions, then ctrl+d)";
    const file = target.files[0];
    if (!file) return { steps: [], gone: [], notes: [], blocked: `meme does not know where this OpenCode session is; ${inOpenCode}.` };
    const { db, id } = splitFile(file);
    const r = runner(target, platform, db);
    if (typeof r === "string") return { steps: [], gone: [], notes: [], blocked: `${r}; ${inOpenCode}. meme's copy follows on its own.` };
    if (!canDelete(r)) return { steps: [], gone: [], notes: [], blocked: `\`opencode session delete\` is not available ${r.where || "here"}; ${inOpenCode}${r.where ? " there" : ""}. meme's copy follows on its own.` };
    const steps: ForgetStep[] = [];
    try {
      const local = target.env === platform.env;
      for (const out of fullOutputs(openDb(db, local), id, path.dirname(db))) steps.push({ kind: "remove", path: out, dir: false, what: "the full output of a long command" });
    } catch {}
    steps.push({ kind: "run", cmd: r.line(["session", "delete", id]), cwd: r.cwd, shown: r.where ? `opencode session delete ${id} ${r.where}` : undefined, what: "OpenCode removes the session from its database" });
    const state = path.join(path.dirname(path.dirname(path.dirname(path.dirname(db)))), ".local", "state", "opencode", "prompt-history.jsonl");
    const history = r.where ? `~/.local/state/opencode/prompt-history.jsonl ${r.where}` : displayPath(state, platform.home);
    // A session in a database leaves no file of its own to check: the command's exit code says.
    return { steps, gone: [], notes: [`OpenCode keeps what you typed in its own prompt history (${history}).`] };
  },

  launch(firstMessage: string) {
    return { cmd: openCodeProfile.command, args: ["--prompt", firstMessage] };
  },

  /** Its database, `<data>/opencode.db` (or OPENCODE_DB); in WSL also the Windows ones, on Windows the WSL ones. */
  roots(platform: Platform): SourceRoot[] {
    const own = platform.vars[openCodeProfile.homeVar];
    const local = own && path.isAbsolute(own) ? own : path.join(dataDir(platform), own || "opencode.db");
    const roots: SourceRoot[] = [{ id: sourceId(AGENT, platform.env, local), agent: AGENT, env: platform.env, path: local }];
    if (platform.env === "wsl" && platform.windowsUsersDir) {
      let users: string[] = [];
      try {
        users = readdirSync(platform.windowsUsersDir);
      } catch {}
      for (const user of users.sort()) {
        const db = path.join(platform.windowsUsersDir, user, openCodeProfile.homeDir, "opencode.db");
        if (existsSync(db)) roots.push({ id: sourceId(AGENT, "win", db), agent: AGENT, env: "win", path: db });
      }
    }
    // On Windows: the running WSL distributions (plan step 5).
    for (const h of platform.wsl) {
      const db = path.join(toHost(h.root, h.home), openCodeProfile.homeDir, "opencode.db");
      if (existsSync(db)) roots.push({ id: sourceId(AGENT, "wsl", db), agent: AGENT, env: "wsl", path: db, wsl: { distro: h.distro, root: h.root } });
    }
    return roots;
  },

  /** Its sessions as `<database>#<id>`; a subagent's session is part of the one that started it. */
  listFiles(root: SourceRoot): string[] {
    const db = dbFor(root);
    const out: string[] = [];
    for (const s of db.query<SessionRow, []>(SESSIONS).all()) {
      const file = `${root.path}${SEP}${s.id}`;
      listed.set(file, s);
      out.push(file);
    }
    return out;
  },

  /** How big it is and when it last changed, as listed. */
  stat(file: string): { size: number; mtime: number } {
    const s = listed.get(file);
    if (!s) throw new Error(`not listed: ${file}`);
    return { size: s.bytes, mtime: s.time_updated };
  },

  sessionId(file: string): string | null {
    const { id } = splitFile(file);
    return /^ses_[0-9A-Za-z]+$/.test(id) ? memeId(id) : null;
  },

  readText(file: string): string {
    const { db, id } = splitFile(file);
    const handle = openDb(db, true);
    const s = sessionRow(handle, id);
    return s ? JSON.stringify({ info: { id: s.id, directory: s.directory, title: s.title }, messages: rewrite(exportOf(handle, s), s.revert) }) : "";
  },

  convert(files: string[], ctx: ConvertContext): Converted {
    const handle = dbFor(ctx.root);
    const s = sessionRow(handle, splitFile(files[0]!).id);
    if (!s) throw new Error(`the session is not in ${path.basename(ctx.root.path)}`);
    return convertOpenCode(handle, s, ctx);
  },

  peek(files: string[], ctx: ConvertContext): Peeked {
    const out: Peeked = { cwd: null, title: null, startedAt: null, endedAt: null, version: null };
    try {
      const s = sessionRow(dbFor(ctx.root), splitFile(files[0]!).id);
      if (s) {
        out.cwd = str(s.directory);
        out.title = DEFAULT_TITLE.test(s.title) ? null : s.title;
        out.startedAt = iso(s.time_created);
        out.endedAt = iso(s.time_updated);
        out.version = str(s.version);
      }
    } catch {}
    return out;
  },
};
