import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import { detectEnv, type Env } from "./env";
import type { WslHome } from "./wsl";

/** Everything meme needs to know about the machine it runs on. */
export interface Platform {
  env: Env;
  home: string;
  /** `~/.meme` (Windows: `%USERPROFILE%\.meme`). */
  dataDir: string;
  /** WSL only: where the Windows user folders are mounted, normally `/mnt/c/Users`. */
  windowsUsersDir: string | null;
  /** Windows only: homes in the running WSL distributions, found once the command starts (plan step 5). */
  wsl: WslHome[];
  /** Environment variables, so tests can pass their own. */
  vars: Record<string, string | undefined>;
}

export function currentPlatform(): Platform {
  const env = detectEnv();
  const home = homedir();
  const vars = process.env;
  // WSL mounts the Windows drives where /etc/wsl.conf says (plan §6 ⑧, arch.md 6.3 rule 5).
  if (env === "wsl") useMountRoot(wslMountRoot(vars.MEME_WSL_CONF || "/etc/wsl.conf"));
  return {
    env,
    home,
    dataDir: vars.MEME_HOME || path.join(home, ".meme"),
    windowsUsersDir: env === "wsl" ? vars.MEME_WINDOWS_USERS_DIR || `${mountRoot()}c/Users` : null,
    wsl: [],
    vars,
  };
}

let MOUNT_ROOT = "/mnt/";

/** Where WSL mounts the Windows drives: `/mnt/` unless its wsl.conf says otherwise; always ends with `/`. */
export function mountRoot(): string {
  return MOUNT_ROOT;
}

export function useMountRoot(root: string): void {
  MOUNT_ROOT = root.endsWith("/") ? root : root + "/";
}

/** `[automount] root` of a wsl.conf, or `/mnt/` when the file or the setting is not there. */
export function wslMountRoot(confFile: string): string {
  let text: string;
  try {
    text = readFileSync(confFile, "utf8");
  } catch {
    return "/mnt/";
  }
  return parseMountRoot(text) ?? "/mnt/";
}

export function parseMountRoot(conf: string): string | null {
  let section = "";
  for (const raw of conf.split(/\r?\n/)) {
    const line = raw.replace(/[#;].*$/, "").trim();
    const head = /^\[(.+)\]$/.exec(line);
    if (head) {
      section = head[1]!.trim().toLowerCase();
      continue;
    }
    const kv = /^root\s*=\s*(.+)$/i.exec(line);
    if (section === "automount" && kv) {
      const value = kv[1]!.trim().replace(/^(["'])(.*)\1$/, "$2").trim();
      if (value.startsWith("/")) return value.endsWith("/") ? value : value + "/";
    }
  }
  return null;
}

const WIN_DRIVE = /^([A-Za-z]):[\\/]?(.*)$/;

export function isWindowsPath(p: string): boolean {
  return WIN_DRIVE.test(p);
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
/** `/mnt/c/x` (under the mount root): drive letter, then the rest. */
const patterns = new Map<string, RegExp>();
/** `/mnt/c/…` for a mount root: made once per root, used for every path compared. */
const mounted = (root: string) => {
  let re = patterns.get(root);
  if (!re) patterns.set(root, (re = new RegExp(`^${escape(root)}([a-z])(\\/.*)?$`, "i")));
  return re;
};

/** `C:\x\y` → `/mnt/c/x/y` (under the mount root). Other paths are returned unchanged. */
export function winToWsl(p: string, root = MOUNT_ROOT): string {
  const m = WIN_DRIVE.exec(p);
  if (!m) return p;
  const rest = m[2]!.replace(/\\/g, "/").replace(/\/+$/, "");
  return `${root}${m[1]!.toLowerCase()}${rest ? "/" + rest : ""}`;
}

/** `\\wsl.localhost\Ubuntu\x` or `\\wsl$\Ubuntu\x`: a WSL distribution's files as Windows names them. */
const WSL_UNC = /^[\\/]{2}wsl(?:\.localhost|\$)[\\/]([^\\/]+)([\\/].*)?$/i;

export function isWslUnc(p: string): boolean {
  return WSL_UNC.test(p);
}

/**
 * `\\wsl.localhost\Ubuntu\home\u` → `/home/u` inside that distribution (`distro`, from
 * WSL_DISTRO_NAME), where it is a local path (plan §6 ⑪, F8). Other paths, and those
 * into another distribution, are returned unchanged.
 */
export function uncToWsl(p: string, distro: string | undefined): string {
  const m = WSL_UNC.exec(p);
  if (!m || !distro || m[1]!.toLowerCase() !== distro.toLowerCase()) return p;
  return (m[2] ?? "").replace(/\\/g, "/").replace(/\/+$/, "") || "/";
}

/** `/mnt/c/x/y` → `C:\\x\\y`. Other paths are returned unchanged. */
export function wslToWin(p: string, root = MOUNT_ROOT): string {
  const m = mounted(root).exec(p);
  return m ? `${m[1]!.toUpperCase()}:${(m[2] ?? "/").replace(/\//g, "\\")}` : p;
}

/** Paths on Windows drives (and Windows drives mounted in WSL) compare case-insensitively, everything else exactly. */
export function pathKey(p: string): string {
  const unified = p.replace(/[\\/]+$/, "") || p;
  if (isWindowsPath(unified) || mounted(MOUNT_ROOT).test(unified)) return unified.replace(/\\/g, "/").toLowerCase();
  return unified;
}

export function samePath(a: string, b: string): boolean {
  return pathKey(a) === pathKey(b);
}

/** Show the home directory as `~`. */
export function displayPath(p: string, home: string): string {
  if (samePath(p, home)) return "~";
  const sep = p.includes("\\") && !p.includes("/") ? "\\" : "/";
  const h = home.replace(/[\\/]+$/, "");
  if (pathKey(p).startsWith(pathKey(h) + "/")) return "~" + sep + p.slice(h.length + 1);
  return p;
}
