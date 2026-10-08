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
  return { platform, store, log, imported, project: projectResolver(platform)(process.cwd()) ?? process.cwd(), now: Date.now() };
}

/** Running inside an agent's tool call rather than a person's terminal. */
export function insideAgent(vars = process.env): boolean {
  return vars.CLAUDECODE === "1" || Object.keys(vars).some((k) => k.startsWith("CODEX_SANDBOX"));
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
