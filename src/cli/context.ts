import { ADAPTERS } from "../adapters";
import { projectResolver } from "../model/project";
import { fileLogger, type Logger } from "../platform/log";
import { currentPlatform, type Platform } from "../platform/paths";
import { makeStyle, type Style } from "../render/labels";
import { openStore, type Store } from "../store/db";
import { importAll, type ImportResult } from "../store/import";

export interface Context {
  platform: Platform;
  store: Store;
  log: Logger;
  imported: ImportResult | null;
  /** The project of the directory meme was started in. */
  project: string;
  /** The agent sessions running meme, if any; `ls` and `continue` leave them out. */
  current: Set<string>;
  now: number;
}

/** Every command starts here (plan §2.1): open the store, then bring it up to date. */
export function createContext(): Context {
  const platform = currentPlatform();
  const log = fileLogger(platform.dataDir);
  const store = openStore(platform.dataDir);
  let imported: ImportResult | null = null;
  try {
    imported = importAll(store, platform, ADAPTERS, log);
  } catch (err) {
    // An import failure must not stop the command: use what the store has.
    log.error("import failed", err);
  }
  const now = Date.now();
  return {
    platform,
    store,
    log,
    imported,
    project: projectResolver(platform)(process.cwd()) ?? process.cwd(),
    current: currentSessions(platform.vars),
    now,
  };
}

/**
 * The sessions of the agents that run this meme: Claude Code sets
 * CLAUDE_CODE_SESSION_ID for its tools, Codex sets CODEX_THREAD_ID (sessions.md
 * §7.1). Both can be set when one agent was started inside the other; both are
 * running, so both are left out.
 */
export function currentSessions(vars: Record<string, string | undefined>): Set<string> {
  const ids = [vars.CLAUDE_CODE_SESSION_ID, vars.CODEX_THREAD_ID].map((v) => v?.trim().toLowerCase()).filter((v): v is string => Boolean(v));
  return new Set(ids);
}

/** Running inside an agent's tool call rather than a person's terminal. */
export function insideAgent(vars = process.env): boolean {
  return vars.CLAUDECODE === "1" || Boolean(vars.CODEX_THREAD_ID) || Object.keys(vars).some((k) => k.startsWith("CODEX_SANDBOX"));
}

export interface Output {
  /** Interactive screens allowed: a terminal on both ends, not `--plain`, not an agent. */
  interactive: boolean;
  st: Style;
  width: number;
}

export function output(plain: boolean): Output {
  const tty = Boolean(process.stdout.isTTY);
  const color = tty && !plain && !process.env.NO_COLOR && !insideAgent();
  return {
    interactive: tty && Boolean(process.stdin.isTTY) && !plain && !insideAgent(),
    st: makeStyle(color),
    width: tty ? Math.max(40, process.stdout.columns || 100) : 120,
  };
}

export function write(text: string): void {
  process.stdout.write(text);
}
