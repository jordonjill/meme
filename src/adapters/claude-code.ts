import { NormalizationError, normalizeToCanonical, type CanonicalRecord } from "@letta-ai/trajectory";
import { readdirSync, statSync } from "node:fs";
import path from "node:path";
import { userKind, type UserKind } from "../model/injected";
import type { Body } from "../model/record";
import { titleOf } from "../model/title";
import { assignTurns } from "../model/turns";
import type { Platform } from "../platform/paths";
import { parseLines, readJsonl } from "./read";
import { sourceId, type Adapter, type ConvertContext, type Converted, type ConvertedRecord, type ForgetPlan, type ForgetStep, type ForgetTarget, type SourceRoot } from "./types";

const AGENT = "claude-code" as const;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Read in full: trajectory's default truncation would not be faithful. */
export const BOUNDS = { toolArguments: { maxCharacters: null }, toolResults: { maxCharacters: null } };

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
    return platform.vars.CLAUDE_CONFIG_DIR || path.join(platform.home, ".claude");
  },

  /**
   * Claude Code has no delete command; a session lives in 4 places under its home
   * (release.md §4). Folders go first and the main file last.
   */
  forgetPlan(target: ForgetTarget): ForgetPlan {
    const steps: ForgetStep[] = [];
    for (const file of target.files) {
      const projectDir = path.dirname(file);
      const home = path.dirname(path.dirname(projectDir));
      const dirs: [string, string][] = [
        [path.join(projectDir, target.id), "subagents and large tool output"],
        [path.join(home, "file-history", target.id), "backups of files before Claude Code edited them"],
        [path.join(home, "session-env", target.id), "the session's environment"],
      ];
      for (const [dir, what] of dirs) if (isDir(dir)) steps.push({ kind: "remove", path: dir, dir: true, what });
      steps.push({ kind: "remove", path: file, dir: false, what: "the session" });
    }
    return { steps, gone: target.files, notes: [] };
  },

  launch(firstMessage: string) {
    // The message goes first: --allowedTools takes a list and would swallow it.
    return { cmd: "claude", args: [firstMessage, "--allowedTools", "Bash(meme:*)"] };
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
    return roots;
  },

  /** `<project>/<uuid>.jsonl` only; subagents and workflow journals live one level deeper. */
  listFiles(root: SourceRoot): string[] {
    const files: string[] = [];
    for (const entry of readdirSync(root.path, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
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

  readText: readJsonl,

  convert(files: string[], ctx: ConvertContext): Converted {
    // Claude Code keeps one file per session.
    return convertClaude(readJsonl(files[0]!), ctx);
  },
};

interface Line {
  index: number;
  obj: Record<string, unknown>;
}

const str = (v: unknown): string | null => (typeof v === "string" && v ? v : null);

export function convertClaude(text: string, ctx: ConvertContext): Converted {
  const lines = parseLines(text).filter((l) => l.obj.isSidechain !== true);
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
  // something the user typed (`/statusline`, `/model`), so meme puts it back.
  const commands: { line: number; rec: ConvertedRecord }[] = [];
  for (const l of lines) {
    const command = commandOf(l.obj);
    if (!command) continue;
    const ts = str(l.obj.timestamp);
    const body: Body = { role: "user", content: command, timestamp: ts ?? "" };
    commands.push({ line: l.index, rec: { uid: str(l.obj.uuid), part: 0, turn: 0, injected: false, role: "user", ts, body } });
  }

  const merged: { rec: ConvertedRecord; kind: UserKind | null }[] = [];
  let next = 0;
  const flushCommands = (beforeLine: number) => {
    while (next < commands.length && commands[next]!.line < beforeLine) merged.push({ rec: commands[next++]!.rec, kind: "prompt" });
  };
  for (const c of canonical(text, ctx.sessionId)) {
    const body = JSON.parse(c.record_json) as Body;
    const raw = c.source_identity_kind === "native" ? byUuid.get(c.stable_source_record_id) : undefined;
    if (raw) flushCommands(raw.index);
    const kind = body.role === "user" ? userKind(body.content, raw?.obj) : null;
    merged.push({
      kind,
      rec: {
        uid: c.record_type === "meta" ? null : c.stable_source_record_id,
        part: c.component_index,
        turn: 0,
        injected: kind === "injected",
        role: body.role,
        ts: "timestamp" in body ? body.timestamp : null,
        body,
      },
    });
  }
  flushCommands(Number.POSITIVE_INFINITY);

  const turns = assignTurns(merged.map((m) => m.kind));
  const records = merged.map((m, i) => ({ ...m.rec, turn: turns[i]! }));
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
  };
}

/** `/name args` from a local-command line, in either the old (user) or new (system) form. */
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

/**
 * Canonical records carry the source line's `uuid` (plan §4.6.2). A session with
 * no conversation at all (only `/model`, say) is not an error: it has no records.
 */
function canonical(text: string, sessionId: string): CanonicalRecord[] {
  const run = (groupId?: string) =>
    normalizeToCanonical({
      source: "claude-code",
      transcript: text,
      bounds: BOUNDS,
      ...(groupId ? { sourceContext: { groupId } } : {}),
    }).records;
  try {
    return run(sessionId);
  } catch (err) {
    if (err instanceof NormalizationError) {
      if (err.code === "missing_user_records" || err.code === "missing_assistant_records") return [];
      if (err.code === "source_group_conflict") return run();
    }
    throw err;
  }
}
