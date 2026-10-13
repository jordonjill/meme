import { readFileSync, statSync } from "node:fs";
import path from "node:path";
import { isWindowsPath, winToWsl } from "../platform/paths";
import type { Platform } from "../platform/paths";
import { toHost, toLinux, type WslPlace } from "../platform/wsl";

/**
 * D12: the project is the git repository above the start directory, the way the
 * agents themselves group sessions. A worktree belongs to its main repository. Without
 * `.git` anywhere above, the start directory itself is the project.
 */
export function findProject(cwd: string, mapPath: (p: string) => string = (p) => p, top?: string): string {
  const start = path.resolve(cwd);
  let dir = start;
  for (;;) {
    const dotGit = path.join(dir, ".git");
    let kind: "dir" | "file" | null = null;
    try {
      const st = statSync(dotGit);
      kind = st.isDirectory() ? "dir" : st.isFile() ? "file" : null;
    } catch {}
    if (kind === "dir") return dir;
    if (kind === "file") return worktreeMain(dotGit, dir, mapPath) ?? dir;
    const parent = path.dirname(dir);
    if (parent === dir || dir === top) return start;
    dir = parent;
  }
}

function worktreeMain(dotGitFile: string, dir: string, mapPath: (p: string) => string): string | null {
  let text: string;
  try {
    text = readFileSync(dotGitFile, "utf8");
  } catch {
    return null;
  }
  const m = /^gitdir:\s*(.+?)\s*$/m.exec(text);
  if (!m) return null;
  const gitdir = path.resolve(dir, mapPath(m[1]!));
  // `<main>/.git/worktrees/<name>`; a submodule (`.git/modules/…`) is its own project.
  const w = /^(.*)[\\/]\.git[\\/]worktrees[\\/][^\\/]+[\\/]?$/.exec(gitdir);
  return w ? w[1]! : null;
}

/**
 * Project lookup for one import run, cached by start directory. In WSL, Windows
 * paths from sessions under /mnt/c are converted first. On Windows, a WSL
 * session's directory is looked up through `\\wsl.localhost`, not above the
 * distribution's `/`, and the project stays a WSL path.
 */
export function projectResolver(platform: Platform, wsl?: WslPlace): (cwd: string | null) => string | null {
  const cache = new Map<string, string>();
  if (wsl) {
    const toHostPath = (p: string) => (p.startsWith("/") ? toHost(wsl.root, p) : p);
    return (cwd) => {
      if (!cwd?.startsWith("/")) return cwd;
      let project = cache.get(cwd);
      if (project === undefined) {
        project = toLinux(wsl.root, findProject(toHostPath(cwd), toHostPath, wsl.root)) ?? cwd;
        cache.set(cwd, project);
      }
      return project;
    };
  }
  const toLocal = (p: string) => (platform.env === "wsl" && isWindowsPath(p) ? winToWsl(p) : p);
  return (cwd) => {
    if (!cwd) return null;
    const local = toLocal(cwd);
    // Not a path here (\\wsl.localhost\… read on Linux): kept as written, never resolved against meme's own directory (R28).
    if (!path.isAbsolute(local)) return cwd;
    let project = cache.get(local);
    if (project === undefined) {
      project = findProject(local, toLocal);
      cache.set(local, project);
    }
    return project;
  };
}
