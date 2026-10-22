/**
 * Where a session is continued (arch.md 6.3, D20): meme supports continuing on
 * the same files the session worked on. Anywhere else the handoff still comes,
 * with a note that the agent is somewhere else and should ask first. This module
 * reads the file system (`.git`, symbolic links); the handoff itself does not.
 */
import { realpathSync, statSync } from "node:fs";
import path from "node:path";
import { ENV_NAMES, type Env } from "../platform/env";
import { isWindowsPath, pathKey, uncToWsl, winToWsl, wslToWin, type Platform } from "../platform/paths";
import { distroMountRoot, toHost, type WslPlace } from "../platform/wsl";

/** The agent is not where the session ran: what the handoff's note says (rule 2). */
export interface Away {
  /** The session's start directory, as the session wrote it. */
  ranIn: string;
  /** Where that is: "WSL", "Windows", "WSL: Ubuntu" from Windows. */
  env: string;
  /** The directory the agent asking for the handoff is in. */
  here: string;
  /** The session ran in a git repository (else: in a plain directory). */
  repo: boolean;
}

/**
 * A session's start directory as a path where meme runs (rule 5): in WSL, a Windows
 * path under the mount root, and one through `\\wsl.localhost` into this very
 * distribution as the path it names (plan §6 ⑪, F8); on Windows, a WSL path through
 * `\\wsl.localhost`, or the Windows drive it is when it is under the distribution's
 * mount root.
 */
export function localDir(dir: string, platform: Platform, wsl: WslPlace | null, mountRoot?: string): string {
  if (platform.env === "wsl") {
    const inHere = uncToWsl(dir, platform.vars.WSL_DISTRO_NAME);
    if (inHere !== dir) return inHere;
    if (isWindowsPath(dir)) return winToWsl(dir);
  }
  if (platform.env === "win" && wsl && dir.startsWith("/")) {
    // `mountRoot` given: the distribution is stopped and its wsl.conf is not read (that would start it).
    const onDrive = wslToWin(dir, mountRoot ?? distroMountRoot(wsl));
    return onDrive !== dir ? onDrive : toHost(wsl.root, dir);
  }
  return dir;
}

/** The nearest directory at or above `dir` holding `.git`: a folder, or a worktree's file. Null outside a repository. */
export function gitRoot(dir: string): string | null {
  let d = dir;
  for (;;) {
    try {
      statSync(path.join(d, ".git"));
      return d;
    } catch {}
    const parent = path.dirname(d);
    if (parent === d) return null;
    d = parent;
  }
}

/** Symbolic links resolved; a path that is not there stays as it is, and one that is not a path here is not resolved at all. */
function real(p: string): string {
  try {
    return path.isAbsolute(p) ? realpathSync.native(p) : p;
  } catch {
    return path.resolve(p);
  }
}

const key = (p: string) => pathKey(p).replace(/\\/g, "/");
const inside = (p: string, dir: string) => key(p) === key(dir) || key(p).startsWith(key(dir).replace(/\/$/, "") + "/");

/**
 * Is the agent on the session's files (rule 1)? The same git root, a worktree
 * counting as its own root (not its main repository, unlike the list's grouping);
 * any subdirectory of it counts. Outside git, the session's start directory or
 * below it, and not in some other repository there. Null when it is the same place.
 */
export function awayFrom(sessionDir: string | null, sessionEnv: Env, platform: Platform, wsl: WslPlace | null, cwd: string): Away | null {
  if (!sessionDir) return null;
  const there = real(localDir(sessionDir, platform, wsl));
  const here = real(cwd);
  // Not a path here (`\\wsl.localhost` into another distribution): somewhere else, whatever is around `here`.
  const reachable = path.isAbsolute(there);
  const sRoot = reachable ? gitRoot(there) : null;
  const cRoot = gitRoot(here);
  const same = reachable && (sRoot ? cRoot !== null && key(cRoot) === key(sRoot) : cRoot === null && inside(here, there));
  if (same) return null;
  const env = wsl && platform.env === "win" ? `WSL: ${wsl.distro}` : ENV_NAMES[sessionEnv];
  return { ranIn: sessionDir, env, here: cwd, repo: sRoot !== null };
}
