import { readFileSync, statSync } from "node:fs";
import path from "node:path";
import { isWindowsPath, winToWsl } from "../platform/paths";
import type { Platform } from "../platform/paths";

/**
 * D12: the project is the git repository above the start directory, the same way
 * Claude Code groups sessions. A worktree belongs to its main repository. Without
 * `.git` anywhere above, the start directory itself is the project.
 */
export function findProject(cwd: string, mapPath: (p: string) => string = (p) => p): string {
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
    if (parent === dir) return start;
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
 * paths from sessions under /mnt/c are converted first.
 */
export function projectResolver(platform: Platform): (cwd: string | null) => string | null {
  const cache = new Map<string, string>();
  const toLocal = (p: string) => (platform.env === "wsl" && isWindowsPath(p) ? winToWsl(p) : p);
  return (cwd) => {
    if (!cwd) return null;
    const local = toLocal(cwd);
    let project = cache.get(local);
    if (project === undefined) {
      project = findProject(local, toLocal);
      cache.set(local, project);
    }
    return project;
  };
}
