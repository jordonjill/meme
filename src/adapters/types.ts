import type { Body } from "../model/record";
import type { Env } from "../platform/env";
import type { Platform } from "../platform/paths";

export type Agent = "claude-code" | "codex";

/** One directory meme reads sessions from, e.g. WSL's `~/.claude/projects`. */
export interface SourceRoot {
  id: string;
  agent: Agent;
  env: Env;
  path: string;
}

/** The 8 per-session fields of format.md §2 (the files are tracked by the store). */
export interface SessionFields {
  id: string;
  agent: Agent;
  env: Env;
  project: string | null;
  title: string | null;
  branch: string | null;
  startedAt: string | null;
  endedAt: string | null;
  continuedIn: string | null;
  /** The session this one was forked from (Codex); its records before the fork point are copied in. */
  forkedFrom: string | null;
  /** Index of this fork's first own record; the ones before it came from `forkedFrom`. */
  forkPoint: number | null;
}

/** One record before redaction: the trajectory record plus meme's outer fields. */
export interface ConvertedRecord {
  uid: string | null;
  part: number;
  turn: number;
  injected: boolean;
  role: string;
  ts: string | null;
  body: Body;
}

export interface Converted {
  session: SessionFields;
  records: ConvertedRecord[];
}

export interface ConvertContext {
  sessionId: string;
  /** Files of another session under the same root, for a fork's parent. */
  filesOf: (sessionId: string) => string[];
  root: SourceRoot;
  /** Start directory → project (plan §4.6.9). */
  project: (cwd: string | null) => string | null;
}

/** One thing `meme forget` does to remove a session from the agent (plan §3.5). */
export type ForgetStep =
  | { kind: "remove"; path: string; dir: boolean; what: string }
  | { kind: "run"; cmd: string[]; what: string };

export interface ForgetPlan {
  /** In order; the session's main file comes last, so a failure leaves the session whole. */
  steps: ForgetStep[];
  /** Files that must be gone afterwards for the deletion to count. */
  gone: string[];
  /** Said before asking, e.g. what the agent keeps. */
  notes: string[];
  /** Why meme cannot delete it here, and what the user can do instead. */
  blocked?: string;
}

export interface ForgetTarget {
  id: string;
  env: Env;
  files: string[];
}

export interface Adapter {
  agent: Agent;
  /** Session source directories; in WSL also the Windows ones under /mnt/c. */
  roots(platform: Platform): SourceRoot[];
  /** Main session files under a root. Throws when the root cannot be read. */
  listFiles(root: SourceRoot): string[];
  sessionId(path: string): string | null;
  /** The file's text without a half-written last line. */
  readText(path: string): string;
  /** One session from all its files (Codex can have several after a rollback). */
  convert(files: string[], ctx: ConvertContext): Converted;
  /** The agent's own home (e.g. `~/.claude`); its presence means the agent is installed. */
  home(platform: Platform): string;
  /** How to delete a session from the agent itself (plan §3.5). */
  forgetPlan(target: ForgetTarget, platform: Platform): ForgetPlan;
  /**
   * The command that starts the agent with a first message (plan §2.3). The message
   * asks it to run `meme continue <id>` itself, so the agent should be allowed to
   * run meme without asking.
   */
  launch(firstMessage: string): { cmd: string; args: string[] };
}

export function sourceId(agent: Agent, env: Env, path: string): string {
  return `${agent}:${env}:${path}`;
}
