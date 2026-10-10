/**
 * WSL as Windows sees it (plan step 5): which distributions are running, the
 * homes in them that have sessions, and paths both ways. A distribution that is
 * not running is never opened: opening \\wsl.localhost\<name> starts it.
 */
import { existsSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import type { Platform } from "./paths";
import { findCommand } from "./spawn";

/** Where one WSL distribution's `/` is on Windows: `\\wsl.localhost\Ubuntu`. */
export interface WslPlace {
  distro: string;
  root: string;
}

/** A home in a running distribution with Claude Code or Codex sessions. */
export interface WslHome extends WslPlace {
  /** The home as WSL sees it, e.g. `/home/jihd`. */
  home: string;
}

/** Docker Desktop's own distributions hold no sessions. */
const SKIP = /^docker-desktop/i;

/** How long `wsl.exe` may take before WSL is treated as not there. */
const WSL_TIMEOUT_MS = 5000;

function isDir(p: string): boolean {
  try {
    return statSync(p).isDirectory();
  } catch {
    return false;
  }
}

/**
 * `wsl.exe`, or the stand-in tests set with `MEME_WSL_EXE`. Only on Windows.
 * WSL's own `%ProgramFiles%\WSL\wsl.exe` first: the one in System32 only hands
 * over to it, and as a process's first child takes 0.7 seconds instead of 0.1
 * (measured 2026-10-10).
 */
export function wslExe(platform: Platform): string | null {
  if (platform.vars.MEME_WSL_EXE) return platform.vars.MEME_WSL_EXE;
  if (platform.env !== "win") return null;
  const own = platform.vars.ProgramFiles ? path.join(platform.vars.ProgramFiles, "WSL", "wsl.exe") : null;
  if (own && existsSync(own)) return own;
  return findCommand("wsl", platform.vars);
}

/** `wsl.exe --list` prints UTF-16 unless WSL_UTF8 is set; one name per line. */
export function distroNames(out: Uint8Array): string[] {
  const buf = Buffer.from(out);
  let zeros = 0;
  for (let i = 1; i < buf.length; i += 2) if (buf[i] === 0) zeros++;
  const text = buf.length > 1 && zeros * 4 >= buf.length ? buf.toString("utf16le") : buf.toString("utf8");
  return text
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((l) => l.replace(/\0/g, "").trim())
    .filter((l) => l && !SKIP.test(l));
}

/**
 * The running distributions. Started early and awaited after the Windows sessions
 * are synced, since `wsl.exe` takes 0.2 seconds (1 second the first time).
 * Tests list folders of `MEME_WSL_DIR`, or `MEME_WSL_RUNNING`.
 */
export async function runningDistros(platform: Platform): Promise<string[]> {
  const dir = platform.vars.MEME_WSL_DIR;
  if (dir) {
    const listed = platform.vars.MEME_WSL_RUNNING;
    if (listed !== undefined) return listed.split(",").map((d) => d.trim()).filter(Boolean);
    try {
      return readdirSync(dir).filter((d) => !SKIP.test(d)).sort();
    } catch {
      return [];
    }
  }
  const exe = wslExe(platform);
  if (!exe) return [];
  try {
    const p = Bun.spawn([exe, "--list", "--running", "--quiet"], { stdin: "ignore", stdout: "pipe", stderr: "ignore", timeout: WSL_TIMEOUT_MS });
    const out = new Uint8Array(await new Response(p.stdout).arrayBuffer());
    // No distribution running: wsl.exe says so and exits non-zero.
    return (await p.exited) === 0 ? distroNames(out) : [];
  } catch {
    return [];
  }
}

/** A distribution's `/` on Windows; `\\wsl$` before `\\wsl.localhost` existed. */
export function distroRoot(platform: Platform, distro: string): string {
  const dir = platform.vars.MEME_WSL_DIR;
  if (dir) return path.join(dir, distro);
  const modern = `\\\\wsl.localhost\\${distro}`;
  return existsSync(modern) ? modern : `\\\\wsl$\\${distro}`;
}

/** `/home/jihd/work` in a distribution → `\\wsl.localhost\Ubuntu\home\jihd\work`. */
export function toHost(root: string, linuxPath: string): string {
  return path.join(root, ...linuxPath.split("/").filter(Boolean));
}

/** The other way; null for a path outside the distribution. */
export function toLinux(root: string, hostPath: string): string | null {
  const rel = path.relative(root, hostPath);
  if (rel.startsWith("..") || path.isAbsolute(rel)) return null;
  return "/" + rel.split(/[\\/]+/).filter(Boolean).join("/");
}

/** Which distribution a Windows path points into, if any. */
export function wslPlace(platform: Platform, hostPath: string): WslPlace | null {
  const dir = platform.vars.MEME_WSL_DIR;
  if (dir) {
    const rel = path.relative(dir, hostPath);
    if (!rel || rel.startsWith("..") || path.isAbsolute(rel)) return null;
    const distro = rel.split(/[\\/]+/)[0]!;
    return { distro, root: path.join(dir, distro) };
  }
  const m = /^([\\/]{2}wsl(?:\.localhost|\$)[\\/]([^\\/]+))(?:[\\/]|$)/i.exec(hostPath);
  return m ? { distro: m[2]!, root: m[1]! } : null;
}

/** The homes in these distributions that have `.claude` or `.codex`. */
export function wslHomes(platform: Platform, distros: string[]): WslHome[] {
  const out: WslHome[] = [];
  for (const distro of distros) {
    const root = distroRoot(platform, distro);
    let users: string[] = [];
    try {
      users = readdirSync(toHost(root, "/home")).sort();
    } catch {}
    for (const home of [...users.map((u) => `/home/${u}`), "/root"]) {
      const host = toHost(root, home);
      if (isDir(path.join(host, ".claude")) || isDir(path.join(host, ".codex"))) out.push({ distro, root, home });
    }
  }
  return out;
}

/**
 * Runs a command in a distribution the way a terminal there would: through the
 * user's shell as an interactive login shell, so PATH has what ~/.profile and
 * ~/.bashrc add (~/.local/bin, nvm). A shell other than bash or zsh: bash.
 */
const IN_LOGIN_SHELL = `case "\${SHELL##*/}" in bash|zsh) s=$SHELL;; *) s=/bin/bash;; esac; exec "$s" -lic 'exec "$0" "$@"' "$0" "$@"`;

/** The command line that runs `cmd` in a distribution, starting in `dir`. */
export function wslCommand(exe: string, distro: string, dir: string, cmd: string[]): string[] {
  return [exe, "-d", distro, "--cd", dir, "-e", "sh", "-c", IN_LOGIN_SHELL, ...cmd];
}

export type WslTools = { ok: true; found: Record<string, string> } | { ok: false; error: string };

/** Where `names` are in a distribution, as the user's shell there finds them. */
export function findInWsl(platform: Platform, place: WslPlace, dir: string, names: string[]): WslTools {
  const exe = wslExe(platform);
  if (!exe) return { ok: false, error: "wsl.exe is not available" };
  const probe = `for c in ${names.join(" ")}; do printf '%s=%s\\n' "$c" "$(command -v "$c")"; done`;
  try {
    const p = Bun.spawnSync(wslCommand(exe, place.distro, dir, ["sh", "-c", probe]), { stdin: "ignore", stdout: "pipe", stderr: "pipe", timeout: 30_000 });
    const found: Record<string, string> = {};
    for (const line of p.stdout.toString().split(/\r?\n/)) {
      const m = /^([a-z]+)=(\/.*)$/.exec(line.trim());
      if (m && names.includes(m[1]!)) found[m[1]!] = m[2]!;
    }
    if (p.exitCode !== 0 && !Object.keys(found).length) {
      const why = p.stderr.toString().replace(/\0/g, "").trim().split(/\r?\n/).filter(Boolean).at(-1);
      return { ok: false, error: why || `wsl.exe exited with ${p.exitCode}` };
    }
    return { ok: true, found };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}
