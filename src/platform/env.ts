import { readFileSync } from "node:fs";

export type Env = "win" | "wsl" | "mac" | "linux";

const ENVS: readonly Env[] = ["win", "wsl", "mac", "linux"];

/** Words for a system on the command line (`ls --env`, `continue` targets). */
export const ENV_WORDS: Record<string, Env> = { win: "win", windows: "win", wsl: "wsl", mac: "mac", macos: "mac", linux: "linux" };

/** How a system is named to the user: "the session ran in /x (Windows)". */
export const ENV_NAMES: Record<Env, string> = { win: "Windows", wsl: "WSL", mac: "macOS", linux: "Linux" };

export function isEnv(v: unknown): v is Env {
  return typeof v === "string" && (ENVS as readonly string[]).includes(v);
}

/** Which system this meme runs on. `MEME_ENV` overrides detection (tests only). */
export function detectEnv(): Env {
  const forced = process.env.MEME_ENV;
  if (isEnv(forced)) return forced;
  if (process.platform === "win32") return "win";
  if (process.platform === "darwin") return "mac";
  if (process.platform === "linux") {
    if (process.env.WSL_DISTRO_NAME) return "wsl";
    try {
      if (/microsoft/i.test(readFileSync("/proc/sys/kernel/osrelease", "utf8"))) return "wsl";
    } catch {}
  }
  return "linux";
}
