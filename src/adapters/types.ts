import type { Injected } from "../model/injected";
import type { Body } from "../model/record";
import type { Env } from "../platform/env";
import type { Platform } from "../platform/paths";
import type { WslPlace } from "../platform/wsl";

export type Agent = "claude-code" | "codex";

/** One directory meme reads sessions from, e.g. WSL's `~/.claude/projects`. */
export interface SourceRoot {
  id: string;
  agent: Agent;
  env: Env;
  path: string;
  /** Windows reading a WSL distribution: its paths are WSL paths under this root. */
  wsl?: WslPlace;
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
  injected: Injected | null;
  role: string;
  ts: string | null;
  body: Body;
}

export interface Converted {
  session: SessionFields;
  records: ConvertedRecord[];
  /** Lines of record types its profile does not list (arch.md §6.1, point 4). */
  unknown: UnknownType[];
}

/** Lines of one record type meme does not know, and the agent version that wrote them. */
export interface UnknownType {
  type: string;
  version: string | null;
  count: number;
}

/**
 * What can be told about a session without converting it, for one meme cannot
 * read (arch.md §6.1, point 2): from the first and last lines, or the file name.
 */
export interface Peeked {
  cwd: string | null;
  title: string | null;
  startedAt: string | null;
  endedAt: string | null;
  /** The agent version that wrote it. */
  version: string | null;
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
  | {
      kind: "run";
      cmd: string[];
      what: string;
      /** What the user is shown instead of `cmd`, when that runs the agent on the other side (WSL, Windows). */
      shown?: string;
      cwd?: string;
    };

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
  /** What can be told about the session without converting it; never throws. */
  peek(files: string[], ctx: ConvertContext): Peeked;
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

/**
 * Text formats an agent writes into its records that meme reads beyond
 * trajectory's records (arch.md §6.1). The model applies every agent's together:
 * they never overlap, and a record does not say which agent wrote it.
 */
export interface Formats {
  /** User text the harness wrote (reminders, notices, instructions), not the user. */
  injected: RegExp[];
  /** Marks a turn as interrupted by the user. */
  interrupt?: RegExp;
  /** Output of a command the user ran; it belongs to that turn. */
  output?: RegExp;
  /** A shell command typed with `!`: group 1 is the command. */
  shellInput?: RegExp;
  /** That command's output, in the same record or the next one: group 1. */
  shellOutput?: RegExp;
  /** What the agent puts first when a command's output was too long, before a preview of it. */
  longOutput?: RegExp;
  /** Lines a tool result starts with before the output itself. */
  resultHeader?: RegExp;
  /** A tool result's exit code: group 1. */
  exitCode?: RegExp;
  /** A tool result that says it failed, without an exit code. */
  failed?: RegExp;
  /** The agent's wrapping around a compaction summary, meant for the model: before it. */
  summaryPrefix?: RegExp;
  /** …and paragraphs after it, by how they start. */
  summaryClosing?: string[];
}

/** What an agent's tool calls mean (arch.md §6.1): arguments as parsed JSON. */
export interface ToolKnowledge {
  /** The shell command a call ran, or null when it is not a command tool. */
  command(name: string, args: Record<string, unknown>): string | null;
  /** Files a call changed through an editing tool or a patch. */
  edited(name: string, args: Record<string, unknown>): string[];
  /** How a call reads in a list when its name says little (a script that runs commands); null for the usual way. */
  describe?(name: string, args: Record<string, unknown>, command: string | null): { name: string; summary: string } | null;
}

/** How the agent compacts its context (handoff.md §7.8, point 3). */
export interface CompactionBehaviour {
  /** The records before a compaction stay in its files. */
  keepsRecords: boolean;
  /** Whether meme can read the summary. */
  summary: "readable" | "readable unless encrypted";
  /** How meme recognizes a compaction. */
  recognizedBy: string;
}

/**
 * Everything meme knows about one agent outside of reading its files (arch.md
 * §6.1, D19): the rest of meme reads this and the records, and never asks which
 * agent it is.
 */
export interface Profile {
  agent: Agent;
  /** "Claude Code". */
  name: string;
  /** In labels and filters: "Claude". */
  short: string;
  /** 256-color palette. */
  color: number;
  /** Words for an agent in `--agent`, `--in` and `meme continue <target>`; the first is the one shown. */
  aliases: string[];
  /** The command that starts it. */
  command: string;
  /** Its folder under the home directory, and the variable that moves it. */
  homeDir: string;
  homeVar: string;
  /** A folder in the path of its files that means the session was archived. */
  archivedDir?: string;
  /** Its project instruction file, which meme never writes. */
  instructionFile: string;
  /** meme runs inside it: its tool calls see these variables. */
  inside(vars: Record<string, string | undefined>): boolean;
  /** The variable that holds the id of the session running meme. */
  sessionVar: string;
  /**
   * When the variables of several agents are set (one started inside another),
   * the one with the highest number is taken as the one running meme.
   */
  nesting: number;
  /**
   * What a handoff printed inside it must stay under: it keeps only so much of a
   * command's output (handoff.md §7.3); added to meme's own 15,000 tokens and
   * 25,000 characters.
   */
  outputLimit: { chars?: number; bytes?: number };
  /** The output of a `!` command reaches the model by itself (else only with the next message). */
  bangReachesModel: boolean;
  /** The first message when meme starts it to continue a session; `command` is the `meme continue` to run. */
  firstMessage(command: string): string;
  /** Lines under "In <name>:" in the usage of `meme continue` and `meme install`. */
  howToContinue: string[];
  /** For `meme forget --help`: what deleting one of its sessions removes. */
  forgetHelp: string;
  /** It refuses to delete a session while forks still read their history from it. */
  keepsForkParents: boolean;
  compaction: CompactionBehaviour;
  formats: Formats;
  tools: ToolKnowledge;
  /**
   * Record types it writes that meme knows, with what meme does with each: read,
   * or skipped on purpose. Anything else is counted and reported (arch.md §6.1,
   * point 4). Keys are `type` or `type/subtype`.
   */
  recordTypes: Record<string, string>;
}
