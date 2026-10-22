import { ADAPTERS } from "../adapters";
import { PROFILES } from "../adapters/profiles";
import { projectResolver } from "../model/project";
import { fileLogger, type Logger } from "../platform/log";
import { currentPlatform, type Platform } from "../platform/paths";
import { readsWsl, runningDistros, toLinux, wslHomes, wslPlace, wslTimeout, type AbsentMemo, type WslAnswer } from "../platform/wsl";
import { makeStyle, type Style } from "../render/labels";
import { getMeta, openStore, setMeta, type Store } from "../store/db";
import { dropSources } from "../store/sync";
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
  /** On Windows: `wsl.exe` did not answer within this many milliseconds, so which distributions run is not known. */
  wslSilent?: number;
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
/**
 * How long the parts of this run took, in milliseconds since the process started
 * or as durations; `meme.log` gets them when a run is slow (plan §6 ⑧.3).
 */
export const timings: { open?: number; import?: number; wsl?: number; importWsl?: number; ready?: number } = {};

export async function createContext(): Promise<Context> {
  const platform = currentPlatform();
  const log = fileLogger(platform.dataDir);
  let t = performance.now();
  const lap = () => {
    const now = performance.now();
    const took = now - t;
    t = now;
    return took;
  };
  const store = openStore(platform.dataDir);
  timings.open = lap();
  // Windows reads WSL too, unless that is turned off (arch.md 6.2); wsl.exe answers while the Windows sessions are synced.
  const wsl = readsWsl(platform);
  const distros = wsl ? runningDistros(platform, absentMemo(store)) : null;
  let imported: ImportResult | null = null;
  let answer: WslAnswer = { running: [], silent: false };
  try {
    // Turned off: what meme had from WSL goes, and Windows reads only itself (plan §6 ⑫, item 5).
    if (platform.env === "win" && !wsl && !store.readonly) dropSources(store.db, "wsl");
    imported = importAll(store, platform, ADAPTERS, log);
    timings.import = lap();
    // wsl.exe has been answering meanwhile.
    if (distros) {
      answer = await distros;
      timings.wsl = lap();
    }
    const running = answer.running;
    if (running.length) {
      platform.wsl = wslHomes(platform, running);
      if (platform.wsl.length) imported = addUp(imported, importAll(store, platform, ADAPTERS, log, (root) => Boolean(root.wsl)));
      timings.importWsl = lap();
    }
  } catch (err) {
    // An import failure must not stop the command: use what the store has.
    log.error("import failed", err);
  }
  if (distros) answer = await distros;
  timings.ready = performance.now();
  const now = Date.now();
  return {
    platform,
    store,
    log,
    imported,
    project: projectOf(platform, process.cwd()),
    current: currentSessions(platform.vars),
    wslStopped: wsl ? stoppedDistros(store, platform, answer.running) : [],
    ...(answer.silent ? { wslSilent: wslTimeout(platform) } : {}),
    now,
  };
}

/** `wsl.exe` said there is no WSL: noted in the mirror's meta, so it is not asked again for a day (plan §6 ⑫, item 6). */
function absentMemo(store: Store): AbsentMemo {
  return {
    since() {
      const t = Date.parse(getMeta(store.db, "wsl_absent") ?? "");
      return Number.isNaN(t) ? null : t;
    },
    mark() {
      try {
        setMeta(store.db, "wsl_absent", new Date().toISOString());
      } catch {}
    },
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

/** The line a list starts with while a WSL distribution is not running, or WSL did not answer (`silent`, in milliseconds). */
export function stoppedNotice(stopped: WslStopped[], now: number, silent?: number): string | null {
  const asOf = (d: WslStopped) => (d.asOf ? when(d.asOf, new Date(now)) : "an earlier run");
  if (silent !== undefined) {
    const times = stopped.length === 1 ? asOf(stopped[0]!) : stopped.map((d) => `${asOf(d)} (${d.distro})`).join(", ");
    return `WSL did not respond within ${silent / 1000} seconds${stopped.length ? `; its sessions are as of ${times}` : ""}`;
  }
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
  const ids = PROFILES.map((p) => (p.sessionVar ? vars[p.sessionVar]?.trim().toLowerCase() : undefined)).filter((v): v is string => Boolean(v));
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

/**
 * The width of output that does not go to a terminal (a pipe, a file, an agent's
 * tool). PowerShell folds a line that fills its 120 columns, so the last character
 * of such a line went to a line of its own (plan §6 ⑩.1).
 */
export const PIPE_WIDTH = 119;

export function output(plain: boolean): Output {
  const tty = Boolean(process.stdout.isTTY);
  const color = tty && !plain && !process.env.NO_COLOR && !insideAgent();
  return {
    interactive: tty && Boolean(process.stdin.isTTY) && !plain && !insideAgent(),
    st: makeStyle(color),
    width: tty ? Math.max(40, process.stdout.columns || 100) : PIPE_WIDTH,
  };
}

export function write(text: string): void {
  process.stdout.write(text);
}

/**
 * y/N, for every command that deletes: only y or yes goes ahead; Enter alone
 * does not (the list's Enter must not run on into a delete).
 */
export function agreed(question: string): boolean {
  // prompt() adds the space after the question itself.
  return ["y", "yes"].includes((prompt(`${question} [y/N]`) ?? "").trim().toLowerCase());
}
