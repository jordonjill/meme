import { existsSync } from "node:fs";
import path from "node:path";
import { ADAPTERS, installedAt } from "../adapters";
import { PROFILES } from "../adapters/profiles";
import { layout } from "../platform/layout";
import { mountRoot, type Platform } from "../platform/paths";
import { findInWsl, wslCommand, wslExe } from "../platform/wsl";
import { INSTALL_HINT } from "./usage";

/**
 * The other side of WSL and Windows, as far as installing goes (plan-m2 F7). meme
 * runs where it is installed, so to use it in the agents of both systems it has to
 * be on both. `meme install` looks whether the other side has agents, has meme and
 * which version, and offers to install it there: by running that side's own
 * installer for this version, and only after the user said yes.
 */
export interface OtherSide {
  /** `on Windows`, `in WSL (Ubuntu)`. */
  where: string;
  /** The agents found there, by name. */
  agents: string[];
  installed: boolean;
  /** meme's version there, when it is installed and says so. */
  version: string | null;
  /** What the user types there to install it themselves. */
  hint: string;
  /** The command, run from here, that installs this version there. */
  installer(version: string): { cmd: string[]; cwd?: string };
}

/** The release a version's files come from, instead of the latest. */
const forVersion = (url: string, version: string) => url.replace("/releases/latest/download/", `/releases/download/v${version}/`);
const urlIn = (hint: string) => /https:\/\/\S+/.exec(hint)![0];

function versionOf(cmd: string[], cwd?: string): string | null {
  try {
    const p = Bun.spawnSync(cmd, { stdin: "ignore", stdout: "pipe", stderr: "ignore", timeout: 10_000, ...(cwd ? { cwd } : {}) });
    return /^meme (\S+)/m.exec(p.stdout.toString())?.[1] ?? null;
  } catch {
    return null;
  }
}

export function otherSides(platform: Platform): OtherSide[] {
  const out: OtherSide[] = [];
  if (platform.env === "win") {
    const exe = wslExe(platform);
    for (const distro of [...new Set(platform.wsl.map((h) => h.distro))]) {
      const place = platform.wsl.find((h) => h.distro === distro)!;
      const tools = findInWsl(platform, place, place.home, ["meme", ...PROFILES.map((x) => x.command)]);
      if (!tools.ok || !exe) continue;
      const there = tools.found.meme;
      out.push({
        where: `in WSL (${distro})`,
        agents: PROFILES.filter((x) => tools.found[x.command]).map((x) => x.name),
        installed: Boolean(there),
        version: there ? versionOf(wslCommand(exe, distro, place.home, [there, "--version"])) : null,
        hint: INSTALL_HINT.linux,
        installer: (version) => ({ cmd: wslCommand(exe, distro, place.home, ["sh", "-c", `curl -fsSL ${forVersion(urlIn(INSTALL_HINT.linux), version)} | MEME_VERSION=v${version} sh`]) }),
      });
    }
  } else if (platform.env === "wsl" && platform.windowsUsersDir) {
    const users = platform.windowsUsersDir;
    const roots = ADAPTERS.flatMap((a) => a.roots(platform)).filter((r) => r.env === "win" && installedAt(r));
    const homes = [...new Set(roots.map((r) => path.join(users, path.relative(users, r.path).split(/[\\/]/)[0]!)))];
    if (!homes.length) return out;
    // The program where its installer puts it. A `.meme` folder alone says nothing: WSL keeps its memory there.
    const programs = homes.map((home) => path.join(home, ".local", "bin", "meme.exe")).filter((f) => existsSync(f));
    // Or it has run there: its mirror of the sessions, where it is now or where 0.1.0 had it.
    const hasRun = homes.some((home) => [layout(path.join(home, ".meme")).mirror, layout(path.join(home, ".meme")).oldMirror].some((f) => existsSync(f)));
    const powershell = Bun.which("powershell.exe", { PATH: platform.vars.PATH ?? "" }) ?? `${mountRoot()}c/Windows/System32/WindowsPowerShell/v1.0/powershell.exe`;
    out.push({
      where: "on Windows",
      agents: PROFILES.filter((x) => roots.some((r) => r.agent === x.agent)).map((x) => x.name),
      installed: programs.length > 0 || hasRun,
      version: programs.length ? versionOf([programs[0]!, "--version"], users) : null,
      hint: INSTALL_HINT.windows,
      // From a Windows folder: started in a WSL one, Windows programs complain first.
      installer: (version) => ({ cmd: [powershell, "-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", `$env:MEME_VERSION='v${version}'; irm ${forVersion(urlIn(INSTALL_HINT.windows), version)} | iex`], cwd: users }),
    });
  }
  return out;
}

/** What there is to do on a side: install meme where agents are and it is not, or bring another version to this one. */
export function todoFor(side: OtherSide, version: string): "install" | "update" | null {
  if (!side.installed) return side.agents.length ? "install" : null;
  return side.version !== null && side.version !== version ? "update" : null;
}

/** What `meme install` says about a side when it does not ask: how to do it by hand. */
export function hintLines(side: OtherSide, version: string): string[] {
  const todo = todoFor(side, version);
  if (todo === "install") return [`Agents also ${side.where}: ${side.agents.join(", ")}. To use \`! meme continue\` in them, install meme ${side.where === "on Windows" ? "on Windows" : "there"} too:`, `  ${side.hint}`];
  if (todo === "update") return [`meme ${side.where} is ${side.version}; this one is ${version}. To bring it to the same version, run there:`, `  ${side.hint}`];
  return [];
}

export function question(side: OtherSide, version: string): string | null {
  const todo = todoFor(side, version);
  if (todo === "install") return `Agents also ${side.where}: ${side.agents.join(", ")}. Install meme ${version} there too, so that \`! meme continue\` works in them?`;
  if (todo === "update") return `meme ${side.where} is ${side.version}; this one is ${version}. Install ${version} there too?`;
  return null;
}

/** Runs the other side's installer, its output going straight to the terminal; the exit code, or null when it could not be started. */
export function installThere(side: OtherSide, version: string): number | null {
  const { cmd, cwd } = side.installer(version);
  try {
    return Bun.spawnSync(cmd, { stdin: "inherit", stdout: "inherit", stderr: "inherit", ...(cwd ? { cwd } : {}) }).exitCode;
  } catch {
    return null;
  }
}
