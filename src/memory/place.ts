import { existsSync, lstatSync, mkdirSync, readdirSync, readlinkSync, statSync, symlinkSync } from "node:fs";
import path from "node:path";
import { PROFILES } from "../adapters/profiles";
import { mountRoot, type Platform } from "../platform/paths";

/**
 * Where memory is kept (memory-v0.3-draft §9). There is one memory per person and
 * machine. On a machine with Windows it is in the Windows user's folder, also for a
 * meme that runs in WSL: every user has Windows, not everyone uses WSL, and WSL can
 * always read and write the Windows drive while Windows reaches WSL only when it is
 * running. So in WSL meme runs as it is installed there and keeps its caches there
 * (the mirror of the sessions is SQLite, which must stay on its own system), and
 * reads and writes memory in `C:\Users\<user>\.meme`.
 *
 * WSL's own data folder gets one link, `store`, to that folder: it records the
 * choice, and lets a person look at the files from WSL.
 */

/** The memory folder cannot be reached: it is on a Windows drive that is not mounted now. */
export class StoreUnreachable extends Error {}

/** Folders under Windows' Users that are nobody's home. */
const NOT_A_USER = new Set(["public", "default", "default user", "all users"]);

/** `%USERPROFILE%` as Windows gives it, or null when Windows cannot be asked. */
export type AskWindows = (platform: Platform) => string | null;

export function pointer(dataDir: string): string {
  return path.join(dataDir, "store");
}

export function storeDir(platform: Platform, askWindows: AskWindows = userProfile): string {
  const forced = platform.vars.MEME_STORE?.trim();
  if (forced) return forced;
  // A data folder named on purpose holds everything; and only WSL has another system's drive to go to.
  if (platform.vars.MEME_HOME || platform.env !== "wsl" || !platform.windowsUsersDir) return platform.dataDir;

  const link = pointer(platform.dataDir);
  const chosen = linked(link);
  if (chosen !== null) {
    // The mount point is there without the drive: writing would land in WSL, as a memory nobody else sees.
    if (!existsSync(path.dirname(chosen))) throw new StoreUnreachable(`meme's memory is in ${chosen}, which cannot be reached now (is the Windows drive mounted?)`);
    return chosen;
  }
  const home = windowsHome(platform, askWindows);
  if (!home) return platform.dataDir;
  const store = path.join(home, ".meme");
  try {
    mkdirSync(platform.dataDir, { recursive: true, mode: 0o700 });
    symlinkSync(store, link);
  } catch {}
  return store;
}

function linked(link: string): string | null {
  try {
    return lstatSync(link).isSymbolicLink() ? readlinkSync(link) : null;
  } catch {
    return null;
  }
}

/** The home of the Windows user this WSL belongs to: the only one there is, else the one Windows names. */
function windowsHome(platform: Platform, askWindows: AskWindows): string | null {
  const users = platform.windowsUsersDir!;
  let names: string[];
  try {
    names = readdirSync(users);
  } catch {
    return null;
  }
  // Someone's home: it has meme's folder, an agent's, or what every Windows profile has.
  const signs = [".meme", "AppData", ...PROFILES.map((p) => p.homeDir)];
  const homes = names.filter((name) => {
    if (NOT_A_USER.has(name.toLowerCase())) return false;
    try {
      return statSync(path.join(users, name)).isDirectory() && signs.some((s) => existsSync(path.join(users, name, s)));
    } catch {
      return false;
    }
  });
  if (homes.length === 1) return path.join(users, homes[0]!);
  if (!homes.length) return null;
  const asked = askWindows(platform)?.replace(/[\\/]+$/, "").split(/[\\/]/).pop()?.toLowerCase();
  const name = homes.find((h) => h.toLowerCase() === asked);
  return name ? path.join(users, name) : null;
}

/** Asks Windows, through the Windows programs WSL can run, where the user's folder is. */
function userProfile(platform: Platform): string | null {
  const cmd = Bun.which("cmd.exe", { PATH: platform.vars.PATH ?? "" }) ?? `${mountRoot()}c/Windows/System32/cmd.exe`;
  try {
    // From a Windows folder: started in a WSL one, cmd.exe complains before it answers.
    const p = Bun.spawnSync([cmd, "/d", "/c", "echo %USERPROFILE%"], { cwd: platform.windowsUsersDir!, stdout: "pipe", stderr: "ignore", timeout: 3000 });
    const line = p.stdout.toString().split(/\r?\n/).map((l) => l.trim()).filter(Boolean).pop();
    return line && /^[A-Za-z]:[\\/]/.test(line) ? line : null;
  } catch {
    return null;
  }
}
