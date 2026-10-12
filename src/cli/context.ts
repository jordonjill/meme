import { ADAPTERS } from "../adapters";
import { PROFILES } from "../adapters/profiles";
import { projectResolver } from "../model/project";
import { fileLogger, type Logger } from "../platform/log";
import { currentPlatform, type Platform } from "../platform/paths";
import { runningDistros, toLinux, wslHomes, wslPlace } from "../platform/wsl";
import { makeStyle, type Style } from "../render/labels";
import { openStore, type Store } from "../store/db";
import { sources } from "../store/queries";
import { when } from "../render/text";
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
  /** On Windows: WSL distributions with sessions in the mirror that are not running; theirs are as of the last sync. */
  wslStopped: WslStopped[];
  now: number;
}

export interface WslStopped {
  distro: string;
  /** When its sessions were last synced. */
  asOf: string | null;
}

/**
 * Every command starts here (plan §2.1): open the store, then bring it up to
 * date. On Windows, asking `wsl.exe` which distributions run starts first and is
 * awaited after the Windows sessions are synced; WSL's come second (plan step 5).
 */
export async function createContext(): Promise<Context> {
  const platform = currentPlatform();
  const distros = platform.env === "win" ? runningDistros(platform) : null;
  const log = fileLogger(platform.dataDir);
  const store = openStore(platform.dataDir);
  let imported: ImportResult | null = null;
  let running: string[] = [];
  try {
    imported = importAll(store, platform, ADAPTERS, log);
    // wsl.exe has been answering meanwhile.
    running = distros ? await distros : [];
    if (running.length) {
      platform.wsl = wslHomes(platform, running);
      if (platform.wsl.length) imported = addUp(imported, importAll(store, platform, ADAPTERS, log, (root) => Boolean(root.wsl)));
    }
  } catch (err) {
    // An import failure must not stop the command: use what the store has.
    log.error("import failed", err);
  }
  if (distros) running = await distros;
  const now = Date.now();
  return {
    platform,
    store,
    log,
    imported,
    project: projectOf(platform, process.cwd()),
    current: currentSessions(platform.vars),
    wslStopped: platform.env === "win" ? stoppedDistros(store, platform, running) : [],
    now,
  };
}

/** WSL sources with sessions whose distribution is not running (plan step 5): listed as of their last sync. */
function stoppedDistros(store: Store, platform: Platform, running: string[]): WslStopped[] {
  const out = new Map<string, WslStopped>();
  for (const src of sources(store.db)) {
    if (src.env !== "wsl" || !src.sessions) continue;
    const place = wslPlace(platform, src.root);
    if (!place || running.includes(place.distro)) continue;
    const prev = out.get(place.distro);
    if (!prev || (src.last_scan ?? "") > (prev.asOf ?? "")) out.set(place.distro, { distro: place.distro, asOf: src.last_scan });
  }
  return [...out.values()];
}

/** The line a list starts with while a WSL distribution is not running. */
export function stoppedNotice(stopped: WslStopped[], now: number): string | null {
  if (!stopped.length) return null;
  const parts = stopped.map((d) => `WSL (${d.distro}) is not running; its sessions are as of ${d.asOf ? when(d.asOf, new Date(now)) : "an earlier run"}`);
  return parts.join(". ");
}

function addUp(a: ImportResult, b: ImportResult): ImportResult {
  return {
    scanned: a.scanned + b.scanned,
    changed: a.changed + b.changed,
    deleted: a.deleted + b.deleted,
    failed: a.failed + b.failed,
    unreachable: [...a.unreachable, ...b.unreachable],
    ms: a.ms + b.ms,
  };
}

/** The project of a directory; on Windows inside `\\wsl.localhost`, as a WSL path. */
export function projectOf(platform: Platform, cwd: string): string {
  const place = platform.env === "win" ? wslPlace(platform, cwd) : null;
  if (place) {
    const linux = toLinux(place.root, cwd);
    if (linux) return projectResolver(platform, place)(linux) ?? linux;
  }
  return projectResolver(platform)(cwd) ?? cwd;
}

/**
 * The sessions of the agents that run this meme: each agent puts its session id
 * in a variable its tools see (its profile's `sessionVar`, sessions.md §7.1).
 * Several can be set when one agent was started inside another; all of them are
 * running, so all are left out.
 */
export function currentSessions(vars: Record<string, string | undefined>): Set<string> {
  const ids = PROFILES.map((p) => vars[p.sessionVar]?.trim().toLowerCase()).filter((v): v is string => Boolean(v));
  return new Set(ids);
}

/** Running inside an agent's tool call rather than a person's terminal. */
export function insideAgent(vars: Record<string, string | undefined> = process.env): boolean {
  return PROFILES.some((p) => p.inside(vars));
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
