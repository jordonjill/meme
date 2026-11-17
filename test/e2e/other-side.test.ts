/**
 * `meme install` and the other side of WSL and Windows (plan-m2 F7): where the other
 * side has agents and no meme, or another version, it offers to install this version
 * there, with that side's own installer, after asking. The other side here is fake:
 * a stand-in powershell.exe, a stand-in wsl.exe, and a stand-in curl inside "WSL".
 */
import { describe, expect, test } from "bun:test";
import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import pkg from "../../package.json";
import { ClaudeSession } from "../fixtures/gen-claude";
import { run, runInTerminal, SCRIPT, world, type World } from "./world";

const V = pkg.version;
const script = (file: string, lines: string[]) => {
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, ["#!/bin/sh", ...lines].join("\n") + "\n");
  chmodSync(file, 0o755);
};

describe.skipIf(process.platform === "win32")("from WSL: meme on the Windows side", () => {
  /** A stand-in powershell.exe on PATH that notes how it was called and ends with `exit`. */
  function windows(w: World, exit = 0) {
    const bin = path.join(w.home, "win-bin");
    const log = path.join(w.home, "powershell-calls.log");
    script(path.join(bin, "powershell.exe"), [`printf '%s\\n' "$*" >> "${log}"`, `printf 'cwd=%s\\n' "$PWD" >> "${log}"`, `exit ${exit}`]);
    return { env: { PATH: `${bin}:/usr/bin:/bin` }, calls: () => (existsSync(log) ? readFileSync(log, "utf8").trimEnd().split("\n") : []) };
  }
  const ASK = `Agents also on Windows: Claude Code. Install meme ${V} there too, so that \`! meme continue\` works in them? [y/N]`;
  const BY_HAND = "irm https://github.com/jordonjill/meme/releases/latest/download/install.ps1 | iex";

  test.skipIf(!SCRIPT)("in a terminal it asks; on yes, Windows' own installer is run for this version, from a Windows folder", () => {
    const w = world();
    const win = windows(w);
    const r = runInTerminal(w, ["install"], "y\n", win);
    expect(r.out).toContain(ASK);
    expect(r.out).toContain(`meme ${V} is installed on Windows.`);
    expect(win.calls()).toEqual([`-NoProfile -ExecutionPolicy Bypass -Command $env:MEME_VERSION='v${V}'; irm https://github.com/jordonjill/meme/releases/download/v${V}/install.ps1 | iex`, `cwd=${w.users}`]);
  });

  test.skipIf(!SCRIPT)("anything but yes installs nothing, and says how to do it by hand", () => {
    const w = world();
    const win = windows(w);
    const r = runInTerminal(w, ["install"], "\n", win);
    expect(r.out).toContain(ASK);
    expect(r.out).toContain(`Not installed on Windows. To do it yourself, run there:\n  ${BY_HAND}`);
    expect(win.calls()).toEqual([]);
  });

  test.skipIf(!SCRIPT)("an installer that fails is reported, with the line to run by hand", () => {
    const w = world();
    const r = runInTerminal(w, ["install"], "y\n", windows(w, 3));
    expect(r.out).toContain(`The installer on Windows did not finish (exit 3). To do it yourself, run there:\n  ${BY_HAND}`);
  });

  test("off a terminal, and inside an agent, it never asks and never installs: it shows the line to run", () => {
    const w = world();
    const win = windows(w);
    const piped = run(w, ["install"], win).out;
    expect(piped).toContain(`Agents also on Windows: Claude Code. To use \`! meme continue\` in them, install meme on Windows too:\n  ${BY_HAND}\n`);
    expect(piped).not.toContain("[y/N]");
    if (SCRIPT) {
      const inside = runInTerminal(w, ["install"], "y\n", { env: { ...win.env, CLAUDECODE: "1" } }).out;
      expect(inside).not.toContain("[y/N]");
      expect(inside).toContain(BY_HAND);
    }
    expect(win.calls()).toEqual([]);
  });

  test("meme there in another version: it offers that version's place to this one; in the same version it says nothing", () => {
    const w = world();
    const exe = path.join(w.users, "me", ".local", "bin", "meme.exe");
    script(exe, ['echo "meme 0.0.9"']);
    expect(run(w, ["install"]).out).toContain(`meme on Windows is 0.0.9; this one is ${V}. To bring it to the same version, run there:\n  ${BY_HAND}\n`);
    script(exe, [`echo "meme ${V}"`]);
    const same = run(w, ["install"]).out;
    expect(same).not.toContain("on Windows is");
    expect(same).not.toContain("Agents also on Windows");
  });

  test("--dry-run looks at nothing on the other side", () => {
    const w = world();
    const win = windows(w);
    expect(run(w, ["install", "--dry-run"], win).out).not.toContain("Agents also on Windows");
    expect(win.calls()).toEqual([]);
  });
});

describe.skipIf(process.platform === "win32")("from Windows: meme in a running WSL", () => {
  /**
   * A stand-in wsl.exe that runs what it is given in <home>/wsl/<distro><dir>, with `tools` on PATH there;
   * `curl` among them prints an installer that only notes the version it was asked for.
   */
  function wsl(w: World, tools: Record<string, string[]>) {
    const root = path.join(w.home, "wsl");
    const s = new ClaudeSession({ id: "99999999-0000-4000-8000-000000000009", cwd: "/home/u/app", start: "2026-10-09T08:00:00.000Z" });
    s.user("a session in WSL");
    s.assistant("ok");
    s.write(path.join(root, "Ubuntu", "home", "u", ".claude", "projects"));
    const bin = path.join(w.home, "wsl-bin");
    const ran = path.join(w.home, "installer-ran.txt");
    const asked = path.join(w.home, "curl-calls.log");
    script(path.join(bin, "curl"), [`printf '%s\\n' "$*" >> "${asked}"`, `echo 'echo "version $MEME_VERSION" > "${ran}"'`]);
    for (const [name, lines] of Object.entries(tools)) script(path.join(bin, name), lines);
    script(path.join(w.home, "wsl.exe"), ['while [ $# -gt 0 ]; do case "$1" in -d) d=$2; shift 2;; --cd) c=$2; shift 2;; -e) shift; break;; *) shift;; esac; done', `cd "${root}/$d$c" 2>/dev/null || exit 1`, 'exec "$@"']);
    const env = { MEME_ENV: "win", MEME_WSL_DIR: root, MEME_WSL_RUNNING: "Ubuntu", MEME_WSL_EXE: path.join(w.home, "wsl.exe"), PATH: `${bin}:/usr/bin:/bin` };
    const read = (f: string) => (existsSync(f) ? readFileSync(f, "utf8").trim() : null);
    return { env, ran: () => read(ran), asked: () => read(asked) };
  }
  const BY_HAND = "curl -fsSL https://github.com/jordonjill/meme/releases/latest/download/install.sh | sh";

  test.skipIf(!SCRIPT)("in a terminal it asks; on yes, the installer for this version runs inside that distribution", () => {
    const w = world();
    const there = wsl(w, { claude: ["exit 0"] });
    const r = runInTerminal(w, ["install"], "y\n", there);
    expect(r.out).toContain(`Agents also in WSL (Ubuntu): Claude Code. Install meme ${V} there too, so that \`! meme continue\` works in them? [y/N]`);
    expect(r.out).toContain(`meme ${V} is installed in WSL (Ubuntu).`);
    expect(there.asked()).toBe(`-fsSL https://github.com/jordonjill/meme/releases/download/v${V}/install.sh`);
    expect(there.ran()).toBe(`version v${V}`);
  });

  test("off a terminal it shows the line to run there; an older meme there is named with its version", () => {
    const w = world();
    const none = wsl(w, { claude: ["exit 0"] });
    expect(run(w, ["install"], none).out).toContain(`Agents also in WSL (Ubuntu): Claude Code. To use \`! meme continue\` in them, install meme there too:\n  ${BY_HAND}\n`);
    expect(none.ran()).toBeNull();
    const w2 = world();
    const old = wsl(w2, { claude: ["exit 0"], meme: ['echo "meme 0.0.9"'] });
    expect(run(w2, ["install"], old).out).toContain(`meme in WSL (Ubuntu) is 0.0.9; this one is ${V}. To bring it to the same version, run there:\n  ${BY_HAND}\n`);
    const w3 = world();
    const same = wsl(w3, { claude: ["exit 0"], meme: [`echo "meme ${V}"`] });
    expect(run(w3, ["install"], same).out).not.toContain("in WSL (Ubuntu)");
  });
});
