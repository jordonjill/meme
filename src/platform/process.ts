/**
 * Whether a process is still running, as far as meme can tell from where it runs
 * (plan §6 ⑧.3): a Linux process through /proc, also a WSL one from Windows
 * through \\wsl.localhost; a Windows one through tasklist.exe; a macOS one by its
 * pid. null when meme cannot tell.
 */
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { errorCode } from "./fs";
import { mountRoot, type Platform } from "./paths";
import { findCommand } from "./spawn";
import { toHost, type WslPlace } from "./wsl";

/** Where a process runs, seen from meme: here, in a WSL distribution seen from Windows, or on Windows seen from WSL. */
export type ProcessPlace = { kind: "here" } | { kind: "wsl"; place: WslPlace } | { kind: "windows" };

/** Field 22 of `/proc/<pid>/stat`: when the process started, in clock ticks since boot. */
export function statStart(stat: string): string | null {
  // The command name in parentheses may hold spaces and parentheses itself.
  const close = stat.lastIndexOf(")");
  if (close < 0) return null;
  return stat.slice(close + 1).trim().split(/\s+/)[19] ?? null;
}

/** A process by its /proc stat file; `started` (field 22), when known, must match, or the pid was reused. */
function viaProc(statFile: string, started: string | null): boolean | null {
  let stat: string;
  try {
    stat = readFileSync(statFile, "utf8");
  } catch (err) {
    return errorCode(err) === "ENOENT" ? false : null;
  }
  if (started === null) return true;
  return statStart(stat) === started;
}

/** tasklist.exe: on Windows in System32, from WSL through interop. */
function tasklistExe(platform: Platform): string | null {
  if (platform.env === "win") {
    const own = path.join(platform.vars.SystemRoot || "C:\\Windows", "System32", "tasklist.exe");
    return existsSync(own) ? own : findCommand("tasklist", platform.vars);
  }
  if (platform.env === "wsl") {
    const mounted = `${mountRoot()}c/Windows/System32/tasklist.exe`;
    return findCommand("tasklist.exe", platform.vars) ?? (existsSync(mounted) ? mounted : null);
  }
  return null;
}

const windowsPids = new Map<string, Set<number> | null>();

/** The pids of all Windows processes, from one run of tasklist (0.4 s from WSL); null when it cannot run. */
function windowsProcesses(platform: Platform): Set<number> | null {
  const exe = tasklistExe(platform);
  if (!exe) return null;
  if (windowsPids.has(exe)) return windowsPids.get(exe)!;
  let pids: Set<number> | null = null;
  try {
    const p = Bun.spawnSync([exe, "/FO", "CSV", "/NH"], { stdin: "ignore", stdout: "pipe", stderr: "ignore", timeout: 10_000 });
    if (p.exitCode === 0) {
      pids = new Set();
      // "node.exe","1234","Console","1","123,456 K"; the image name is in the console's code page.
      for (const m of p.stdout.toString("latin1").matchAll(/^"[^"\r\n]*","(\d+)"/gm)) pids.add(Number(m[1]));
      if (!pids.size) pids = null;
    }
  } catch {}
  windowsPids.set(exe, pids);
  return pids;
}

function viaPid(pid: number): boolean | null {
  try {
    process.kill(pid, 0);
    return true;
  } catch (err) {
    const code = errorCode(err);
    return code === "ESRCH" ? false : code === "EPERM" ? true : null;
  }
}

export function processRunning(platform: Platform, where: ProcessPlace, pid: number, started: string | null): boolean | null {
  if (where.kind === "wsl") return viaProc(toHost(where.place.root, `/proc/${pid}/stat`), started);
  if (where.kind === "windows" || platform.env === "win") {
    const pids = windowsProcesses(platform);
    return pids ? pids.has(pid) : null;
  }
  if (platform.env === "mac") return viaPid(pid);
  return viaProc(`/proc/${pid}/stat`, started);
}
