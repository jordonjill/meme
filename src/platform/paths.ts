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
  return {
    env,
    home,
    dataDir: vars.MEME_HOME || path.join(home, ".meme"),
    windowsUsersDir: env === "wsl" ? vars.MEME_WINDOWS_USERS_DIR || "/mnt/c/Users" : null,
    wsl: [],
    vars,
  };
}

const WIN_DRIVE = /^([A-Za-z]):[\\/]?(.*)$/;

export function isWindowsPath(p: string): boolean {
  return WIN_DRIVE.test(p);
}

/** `C:\x\y` → `/mnt/c/x/y`. Other paths are returned unchanged. */
export function winToWsl(p: string): string {
  const m = WIN_DRIVE.exec(p);
  if (!m) return p;
  const rest = m[2]!.replace(/\\/g, "/").replace(/\/+$/, "");
  return `/mnt/${m[1]!.toLowerCase()}${rest ? "/" + rest : ""}`;
}

/** `/mnt/c/x/y` → `C:\\x\\y`. Other paths are returned unchanged. */
export function wslToWin(p: string): string {
  const m = /^\/mnt\/([a-z])(\/.*)?$/i.exec(p);
  return m ? `${m[1]!.toUpperCase()}:${(m[2] ?? "/").replace(/\//g, "\\")}` : p;
}

/** Paths on Windows drives compare case-insensitively, everything else exactly. */
export function pathKey(p: string): string {
  const unified = p.replace(/[\\/]+$/, "") || p;
  if (isWindowsPath(unified) || /^\/mnt\/[a-z](\/|$)/i.test(unified)) return unified.replace(/\\/g, "/").toLowerCase();
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
