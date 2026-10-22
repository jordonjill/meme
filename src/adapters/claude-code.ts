import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { userKind, type Injected, type UserKind } from "../model/injected";
import { contentOf, type Body } from "../model/record";
import { titleOf } from "../model/title";
import { assignTurns } from "../model/turns";
import { displayPath, type Platform } from "../platform/paths";
import { toHost } from "../platform/wsl";
import { claudeCodeProfile } from "./claude-code.profile";
import { canonical, parseLines, readJsonl, TypeCounter, typeKey } from "./read";
import { sourceId, type Adapter, type ConvertContext, type Converted, type ConvertedRecord, type ForgetPlan, type ForgetStep, type ForgetTarget, type OpenEntry, type Peeked, type SourceRoot } from "./types";

const AGENT = "claude-code" as const;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The session a background job of Claude Code belongs to, from its state.json. */
function jobOf(dir: string): string | null {
  try {
    const id = (JSON.parse(readFileSync(path.join(dir, "state.json"), "utf8")) as { sessionId?: unknown }).sessionId;
    return typeof id === "string" ? id.toLowerCase() : null;
  } catch {
    return null;
  }
}

function isDir(p: string): boolean {
  try {
    return statSync(p).isDirectory();
  } catch {
    return false;
  }
}

export const claudeCode: Adapter = {
  agent: AGENT,

  home(platform: Platform): string {
    return platform.vars[claudeCodeProfile.homeVar] || path.join(platform.home, claudeCodeProfile.homeDir);
  },

  homeOf(root: SourceRoot): string {
    return path.dirname(root.path);
  },

  /**
   * Claude Code lists each open session in `<home>/sessions/<pid>.json` and removes
   * the file when it quits (2.1.296: `sessionId`, `pid`, and `procStart`, which on
   * Linux is field 22 of /proc/<pid>/stat). A killed one leaves its file behind.
   */
  openSessions(root: SourceRoot): OpenEntry[] | null {
    const dir = path.join(this.homeOf(root), "sessions");
    let names: string[];
    try {
      names = readdirSync(dir);
    } catch {
      return null;
    }
    const out: OpenEntry[] = [];
    for (const name of names) {
      if (!/^\d+\.json$/.test(name)) continue;
      try {
        const j = JSON.parse(readFileSync(path.join(dir, name), "utf8")) as Record<string, unknown>;
        const started = typeof j.procStart === "string" || typeof j.procStart === "number" ? String(j.procStart) : null;
        if (typeof j.sessionId === "string" && Number.isSafeInteger(j.pid)) out.push({ session: j.sessionId.toLowerCase(), pid: j.pid as number, started });
      } catch {}
    }
    return out;
  },

  /**
   * Claude Code has no delete command; a session lives in 4 places under its home
   * (release.md §4). Folders go first and the main file last.
   */
  forgetPlan(target: ForgetTarget, platform: Platform): ForgetPlan {
    const steps: ForgetStep[] = [];
    const homes = new Set<string>();
    // Claude Desktop's copy of a session it ran in WSL, in Windows' projects/ssh-<id>, which meme does not read (plan §6 ⑪, F10).
    const copies = claudeCode.roots(platform).map((r) => path.join(r.path, `ssh-${target.id}`)).filter(isDir);
    for (const dir of copies) steps.push({ kind: "remove", path: dir, dir: true, what: "Claude Desktop's copy of the session on Windows" });
    for (const file of target.files) {
      const projectDir = path.dirname(file);
      const home = path.dirname(path.dirname(projectDir));
      const dirs: [string, string][] = [
        [path.join(projectDir, target.id), "subagents and large tool output"],
        [path.join(home, "file-history", target.id), "backups of files before Claude Code edited them"],
        [path.join(home, "session-env", target.id), "the session's environment"],
      ];
      // A background job's folder is named after the session's short id; its state.json says whose it is (R29).
      const job = path.join(home, "jobs", target.id.slice(0, 8));
      if (jobOf(job) === target.id) dirs.push([job, "the background job: its state and what it did"]);
      for (const [dir, what] of dirs) if (isDir(dir)) steps.push({ kind: "remove", path: dir, dir: true, what });
      steps.push({ kind: "remove", path: file, dir: false, what: "the session" });
      homes.add(home);
    }
    const notes = [...homes].map((h) => `${claudeCodeProfile.name} keeps what you typed in its own input history (${displayPath(path.join(h, "history.jsonl"), platform.home)}).`);
    return { steps, gone: [...copies, ...target.files], notes };
  },

  launch(firstMessage: string) {
    // The message goes first: --allowedTools takes a list and would swallow it.
    return { cmd: claudeCodeProfile.command, args: [firstMessage, "--allowedTools", "Bash(meme:*)"] };
  },

  roots(platform: Platform): SourceRoot[] {
    const local = path.join(this.home(platform), "projects");
    const roots: SourceRoot[] = [{ id: sourceId(AGENT, platform.env, local), agent: AGENT, env: platform.env, path: local }];
    if (platform.env === "wsl" && platform.windowsUsersDir) {
      let users: string[] = [];
      try {
        users = readdirSync(platform.windowsUsersDir);
      } catch {}
      for (const user of users.sort()) {
        const dir = path.join(platform.windowsUsersDir, user, ".claude", "projects");
        if (isDir(dir)) roots.push({ id: sourceId(AGENT, "win", dir), agent: AGENT, env: "win", path: dir });
      }
    }
    // On Windows: the running WSL distributions (plan step 5).
    for (const h of platform.wsl) {
      const dir = path.join(toHost(h.root, h.home), ".claude", "projects");
      if (isDir(dir)) roots.push({ id: sourceId(AGENT, "wsl", dir), agent: AGENT, env: "wsl", path: dir, wsl: { distro: h.distro, root: h.root } });
    }
    return roots;
  },

  /** `<project>/<uuid>.jsonl` only; subagents and workflow journals live one level deeper. */
  listFiles(root: SourceRoot): string[] {
    const files: string[] = [];
    for (const entry of readdirSync(root.path, { withFileTypes: true })) {
      // Claude Desktop copies each session it runs in WSL to Windows' projects/ssh-<id>, a turn behind (plan §6 ⑪, F10).
      if (!entry.isDirectory() || entry.name.startsWith("ssh-")) continue;
      const dir = path.join(root.path, entry.name);
      for (const f of readdirSync(dir, { withFileTypes: true })) {
        if (f.isFile() && f.name.endsWith(".jsonl") && UUID.test(f.name.slice(0, -6))) files.push(path.join(dir, f.name));
      }
    }
    return files;
  },

  sessionId(file: string): string | null {
    const name = path.basename(file);
    if (!name.endsWith(".jsonl")) return null;
    const id = name.slice(0, -6);
    return UUID.test(id) ? id.toLowerCase() : null;
  },


  convert(files: string[], ctx: ConvertContext): Converted {
    // Claude Code keeps one file per session.
    return convertClaude(readJsonl(files[0]!), ctx);
  },

  /** Every line has the time, the directory and the version; titles have lines of their own. */
  peek(files: string[]): Peeked {
    const out: Peeked = { cwd: null, title: null, startedAt: null, endedAt: null, version: null };
    let custom: string | null = null;
    try {
      for (const { obj } of parseLines(readJsonl(files[0]!))) {
        out.cwd ??= str(obj.cwd);
        out.version = str(obj.version) ?? out.version;
        const ts = str(obj.timestamp);
        if (ts) {
          out.startedAt ??= ts;
          out.endedAt = ts;
        }
        if (obj.type === "custom-title") custom = str(obj.customTitle) ?? custom;
        if (obj.type === "ai-title") out.title = str(obj.aiTitle) ?? out.title;
      }
    } catch {}
    out.title = custom ?? out.title;
    if (!out.endedAt) {
      try {
        out.endedAt = new Date(statSync(files[0]!).mtimeMs).toISOString();
      } catch {}
    }
    return out;
  },
};

interface Line {
  index: number;
  obj: Record<string, unknown>;
}

const str = (v: unknown): string | null => (typeof v === "string" && v ? v : null);

export function convertClaude(text: string, ctx: ConvertContext): Converted {
  const parsed = parseLines(text);
  // Record types its profile does not list, with the version that wrote them (arch.md §6.1, point 4).
  const types = new TypeCounter(claudeCodeProfile.recordTypes);
  let version: string | null = null;
  for (const { obj } of parsed) {
    version = str(obj.version) ?? version;
    types.add(typeof obj.type === "string" ? obj.type : "(no type)", typeof obj.subtype === "string" ? obj.subtype : null, version);
  }
  const notJson = text.split("\n").filter((l) => l.trim()).length - parsed.length;
  for (let i = 0; i < notJson; i++) types.notJson(version);
  const lines = parsed.filter((l) => l.obj.isSidechain !== true);
  const abandoned = rewound(lines);
  const byUuid = new Map<string, Line>();
  for (const l of lines) {
    const uuid = str(l.obj.uuid);
    if (uuid && !byUuid.has(uuid)) byUuid.set(uuid, l);
  }

  let custom: string | null = null;
  let generated: string | null = null;
  let continuedIn: string | null = null;
  let cwd: string | null = null;
  let branch: string | null = null;
  let startedAt: string | null = null;
  let endedAt: string | null = null;
  for (const { obj } of lines) {
    if (obj.type === "custom-title") custom = str(obj.customTitle) ?? custom;
    if (obj.type === "ai-title") generated = str(obj.aiTitle) ?? generated;
    if (obj.type === "continued-in") {
      const next = str(obj.continuedInSessionId)?.toLowerCase();
      if (next && next !== ctx.sessionId) continuedIn = next;
    }
    cwd ??= str(obj.cwd);
    branch = str(obj.gitBranch) ?? branch;
    const ts = str(obj.timestamp);
    if (ts) {
      startedAt ??= ts;
      endedAt = ts;
    }
  }

  // trajectory drops `<command-name>` lines as harness noise, but the command is
  // something the user typed (`/statusline`, `/model`), so meme puts it back; and it
  // skips attachments, where Claude Code keeps what the user sent while it worked (R1).
  const commands: { line: number; rec: ConvertedRecord; queued: boolean }[] = [];
  for (const l of lines) {
    if (abandoned.has(str(l.obj.uuid) ?? "")) continue;
    const queued = queuedPrompt(l.obj);
    const content = queued ?? commandOf(l.obj);
    if (!content) continue;
    const ts = str(l.obj.timestamp);
    const body: Body = { role: "user", content, timestamp: ts ?? "" };
    commands.push({ line: l.index, rec: { uid: str(l.obj.uuid), part: 0, turn: 0, injected: null, role: "user", ts, body }, queued: queued !== null });
  }

  const merged: { rec: ConvertedRecord; kind: UserKind | null; restored?: boolean }[] = [];
  const repeats = new Set<string>();
  let next = 0;
  const flushCommands = (beforeLine: number) => {
    while (next < commands.length && commands[next]!.line < beforeLine) {
      const { rec, queued } = commands[next++]!;
      if (queued || !repeatsTypedCommand(rec)) merged.push({ rec, kind: "prompt", restored: true });
      else if (rec.uid) repeats.add(rec.uid);
    }
  };
  // `/compact` is written twice: as typed before compacting, and as a command line
  // after the summary. Nothing the AI did comes between them; it is one turn.
  const repeatsTypedCommand = (rec: ConvertedRecord): boolean => {
    for (let i = merged.length - 1; i >= 0; i--) {
      const m = merged[i]!;
      if (m.kind === "prompt") return !m.restored && contentOf(m.rec.body)?.trim() === contentOf(rec.body);
      if (m.rec.role === "assistant" || m.rec.role === "tool") return false;
    }
    return false;
  };
  // Canonical records carry the source line's `uuid` (plan §4.6.2).
  const { records: canon, dropped } = canonical("claude-code", text, { groupId: ctx.sessionId });
  for (const c of canon) {
    const body = JSON.parse(c.record_json) as Body;
    const raw = c.source_identity_kind === "native" ? byUuid.get(c.stable_source_record_id) : undefined;
    if (c.source_identity_kind === "native" && abandoned.has(c.stable_source_record_id)) continue;
    if (raw) flushCommands(raw.index);
    // Lines it flags as its own: expanded commands and reminders (isMeta), compaction summaries.
    const flagged: Injected | null = raw?.obj.isCompactSummary === true ? "compact_summary" : raw?.obj.isMeta === true ? "harness" : null;
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
  flushCommands(Number.POSITIVE_INFINITY);

  const turns = assignTurns(merged.map((m) => m.kind));
  const records = merged.map((m, i) => ({ ...m.rec, turn: turns[i]! }));

  // The second layer of the alarm (plan §6 ⑦.1): conversation lines that became no
  // record. Matched by uuid; meme skips a subagent's lines and the repeated /compact.
  const unread = new TypeCounter({});
  const produced = new Set(merged.map((m) => m.rec.uid));
  let lineVersion: string | null = null;
  for (const { index, obj } of parsed) {
    lineVersion = str(obj.version) ?? lineVersion;
    const key = typeKey(obj.type, obj.subtype);
    if (!claudeCodeProfile.conversation.includes(key)) continue;
    const uuid = str(obj.uuid);
    if (uuid && (produced.has(uuid) || repeats.has(uuid) || abandoned.has(uuid))) continue;
    if (obj.isSidechain === true || dropped.has(index) || claudeCodeProfile.expectedDrop(obj)) continue;
    unread.add(key, null, lineVersion);
  }
  // Every conversation line carries the directory; without it the project would be guessed wrong (plan §6 ⑧, task 0).
  if (cwd === null && parsed.some(({ obj }) => claudeCodeProfile.conversation.includes(typeKey(obj.type, obj.subtype)))) unread.add("start directory", null, lineVersion);
  const prompts = merged.filter((m) => m.kind === "prompt").map((m) => (m.rec.body as { content: string }).content);

  return {
    session: {
      id: ctx.sessionId,
      agent: AGENT,
      env: ctx.root.env,
      project: ctx.project(cwd),
      title: titleOf(custom, generated, prompts),
      branch,
      startedAt,
      endedAt,
      continuedIn,
      forkedFrom: null,
      forkPoint: null,
    },
    records,
    unknown: types.list(),
    unread: unread.list(),
  };
}

/** `/name args` from a local-command line, in either the old (user) or new (system) form. */
/**
 * What the user sent while Claude Code worked: an `attachment` line with a
 * `queued_command` (plan §6 ⑨, R1). 2.1.296 says whose it is: origin "human" is the
 * user, "task-notification" and "peer" are not. Before (2.1.278–2.1.284) there was no
 * origin, and the only ones seen were notices, which read as the harness's text.
 */
function queuedPrompt(obj: Record<string, unknown>): string | null {
  if (obj.type !== "attachment" || !obj.attachment || typeof obj.attachment !== "object") return null;
  const a = obj.attachment as { type?: unknown; origin?: { kind?: unknown }; commandMode?: unknown; prompt?: unknown };
  const origin = a.origin?.kind;
  if (a.type !== "queued_command" || (origin !== undefined && origin !== "human") || (a.commandMode !== undefined && a.commandMode !== "prompt")) return null;
  let text: string | null = null;
  if (typeof a.prompt === "string") text = a.prompt.trim() ? a.prompt : null;
  else if (Array.isArray(a.prompt)) {
    text = a.prompt.map((b) => (b && typeof b === "object" && (b as { type?: unknown }).type === "text" ? String((b as { text?: unknown }).text ?? "") : "")).join("\n").trim() || null;
  }
  if (text !== null && origin === undefined && userKind(text) !== "prompt") return null;
  return text;
}

/** A line that is a prompt the user typed (not a tool result, a command or the harness's text). */
function typedPrompt(obj: Record<string, unknown>): boolean {
  if (obj.type !== "user" || obj.isMeta === true || obj.isCompactSummary === true || commandOf(obj)) return false;
  const content = (obj.message as { content?: unknown } | undefined)?.content;
  if (typeof content === "string") return userKind(content) === "prompt";
  if (!Array.isArray(content) || content.some((b) => (b as { type?: unknown })?.type === "tool_result")) return false;
  const text = content.map((b) => ((b as { type?: unknown })?.type === "text" ? String((b as { text?: unknown }).text ?? "") : "")).join("\n");
  return Boolean(text.trim()) && userKind(text) === "prompt";
}

/**
 * A prompt the user rewound (Esc Esc, or editing an earlier message) stays in the
 * file, under the same parent as the prompt that replaced it (46083e3d). The earlier
 * ones and everything below them are left out (plan §6 ⑨, R12).
 */
function rewound(lines: Line[]): Set<string> {
  const byParent = new Map<string, string[]>();
  for (const { obj } of lines) {
    const parent = str(obj.parentUuid);
    const uuid = str(obj.uuid);
    if (!parent || !uuid || !typedPrompt(obj)) continue;
    (byParent.get(parent) ?? byParent.set(parent, []).get(parent)!).push(uuid);
  }
  const out = new Set<string>();
  for (const kids of byParent.values()) for (const k of kids.slice(0, -1)) out.add(k);
  if (!out.size) return out;
  // Children come after their parents in the file: one pass takes the whole branch.
  for (const { obj } of lines) {
    const parent = str(obj.parentUuid);
    const uuid = str(obj.uuid);
    if (parent && uuid && out.has(parent)) out.add(uuid);
  }
  return out;
}

function commandOf(obj: Record<string, unknown>): string | null {
  let content: unknown;
  if (obj.type === "user" && obj.message && typeof obj.message === "object") content = (obj.message as { content?: unknown }).content;
  else if (obj.type === "system" && obj.subtype === "local_command") content = obj.content;
  if (typeof content !== "string") return null;
  const name = /<command-name>([\s\S]*?)<\/command-name>/.exec(content)?.[1]?.trim();
  if (!name) return null;
  const args = /<command-args>([\s\S]*?)<\/command-args>/.exec(content)?.[1]?.trim();
  const command = name.startsWith("/") ? name : "/" + name;
  return args ? `${command} ${args}` : command;
}

