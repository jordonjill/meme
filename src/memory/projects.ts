import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

/** A project as memory knows it: the same wherever its files are on this machine. */
export interface ProjectRef {
  /** The folder name under `memory/projects`: a readable name and a short hash. */
  key: string;
  /** What the key stands for: the remote's address without scheme, user and `.git`; or the root path. */
  identity: string;
}

/**
 * Sessions group by the path of the repository (D12). Memory has to recognize one
 * repository under a WSL path and a Windows path, so it goes by the address of the
 * remote and only falls back on the path (memory-v0.3-draft §3.5). The key is a legal
 * folder name on Windows too.
 */
export function projectRef(root: string): ProjectRef {
  const remote = remoteOf(root);
  const identity = remote ? normalizeRemote(remote) : root;
  const name = identity.replace(/[\\/]+$/, "").split(/[\\/]/).pop() || "project";
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^[-.]+|[-.]+$/g, "")
    .slice(0, 40);
  return { key: `${slug || "project"}-${createHash("sha256").update(identity).digest("hex").slice(0, 8)}`, identity };
}

/** A home folder, on this system or another: `/home/me`, `/Users/me`, `C:\\Users\\me`, `/mnt/c/Users/me`. */
const HOME = /^(?:\/home\/[^/]+|\/root|\/Users\/[^/]+|\/mnt\/[a-z]\/Users\/[^/]+|[A-Za-z]:\\Users\\[^\\]+)[\\/]?$/;

/**
 * The project memory keeps what a session says about its project with (plan-m2 F12):
 * a git repository. A session started anywhere else, a home folder or an app's own
 * working folder, is in no project, though session lists still group it by its folder
 * (D12); what is said there is kept with the user's own files. A folder that cannot
 * be looked into from here, a WSL path read on Windows, is taken to be a project.
 */
export function memoryProject(root: string | null | undefined): ProjectRef | null {
  if (!root || HOME.test(root)) return null;
  if (existsSync(root) && !existsSync(path.join(root, ".git"))) return null;
  return projectRef(root);
}

/** The address of `origin`, else of the first remote, in the repository's own config. */
function remoteOf(root: string): string | null {
  let text: string;
  try {
    text = readFileSync(path.join(root, ".git", "config"), "utf8");
  } catch {
    return null;
  }
  const remotes = new Map<string, string>();
  let name: string | null = null;
  for (const line of text.split("\n")) {
    const section = /^\s*\[([^\]]*)\]/.exec(line);
    if (section) {
      name = /^remote "(.+)"$/.exec(section[1]!.trim())?.[1] ?? null;
      continue;
    }
    const url = /^\s*url\s*=\s*(.+?)\s*$/.exec(line);
    if (name && url && !remotes.has(name)) remotes.set(name, url[1]!);
  }
  return remotes.get("origin") ?? remotes.values().next().value ?? null;
}

/** `git@github.com:Owner/Repo.git` and `https://user:token@github.com/Owner/Repo/` are the same place. */
export function normalizeRemote(url: string): string {
  let s = url.trim();
  const scp = /^(?:[^@/]+@)?([^:/]+):(?!\/\/)(.+)$/.exec(s);
  // Not a scheme (`https://`), and not a Windows drive (`C:/repo`).
  if (scp && !/^[a-z][a-z0-9+.-]*:\/\//i.test(s) && !/^[a-z]:[\\/]/i.test(s)) s = `${scp[1]}/${scp[2]}`;
  s = s.replace(/^[a-z][a-z0-9+.-]*:\/\//i, "").replace(/^[^@/]+@/, "");
  const slash = s.indexOf("/");
  const host = (slash < 0 ? s : s.slice(0, slash)).toLowerCase();
  const rest = slash < 0 ? "" : s.slice(slash);
  return (host + rest).replace(/\/+$/, "").replace(/\.git$/i, "");
}
