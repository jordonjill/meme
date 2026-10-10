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
  root: SourceRoot;
  /** Start directory → project (plan §4.6.9). */
  project: (cwd: string | null) => string | null;
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
  convert(text: string, ctx: ConvertContext): Converted;
  /** The agent's own home (e.g. `~/.claude`); its presence means the agent is installed. */
  home(platform: Platform): string;
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
