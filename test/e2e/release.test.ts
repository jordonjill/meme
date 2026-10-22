/** Release prep, group one (plan §6 ⑫), end to end. */
import { describe, expect, test } from "bun:test";
import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { Database } from "bun:sqlite";
import { ClaudeSession } from "../fixtures/gen-claude";
import { run, world, type World } from "./world";

const WSL_ID = "a6a6a6a6-0000-4000-8000-0000000000a6";

/**
 * Windows with a WSL distribution "Ubuntu" at <home>/wsl/Ubuntu holding a session, and
 * a stand-in wsl.exe that logs each call. `own`: WSL's own, in %ProgramFiles%\WSL;
 * else the stub System32 has, found on PATH as `wsl`.
 */
function windows(w: World, o: { own: boolean; script: string }) {
  const wsl = path.join(w.home, "wsl");
  const s = new ClaudeSession({ id: WSL_ID, cwd: "/home/u/app", start: "2026-10-09T08:00:00.000Z" });
  s.user("a session in WSL");
  s.assistant("ok");
  s.write(path.join(wsl, "Ubuntu", "home", "u", ".claude", "projects"));
  const log = path.join(w.home, "wsl-calls.log");
  const programFiles = path.join(w.home, "Program Files");
  const bin = path.join(w.home, "System32");
  const exe = o.own ? path.join(programFiles, "WSL", "wsl.exe") : path.join(bin, "wsl");
  mkdirSync(path.dirname(exe), { recursive: true });
  mkdirSync(bin, { recursive: true });
  writeFileSync(exe, `#!/bin/sh\nprintf '%s\\n' "$*" >> "${log}"\n${o.script}\n`);
  chmodSync(exe, 0o755);
  const env = { MEME_ENV: "win", MEME_WSL_DIR: wsl, ProgramFiles: programFiles, PATH: `${bin}:/usr/bin:/bin` };
  const calls = () => (existsSync(log) ? readFileSync(log, "utf8").trimEnd().split("\n").filter(Boolean) : []);
  return { env, calls };
}

const RUNNING = `case "$*" in *--running*) echo Ubuntu; exit 0;; *) echo Ubuntu; exit 0;; esac`;
const NOT_INSTALLED = `echo "The Windows Subsystem for Linux is not installed. You can install by running 'wsl.exe --install'."; exit 1`;
const STOPPED = `case "$*" in *--running*) echo "There are no running distributions."; exit 1;; *) echo Ubuntu; exit 0;; esac`;

describe.skipIf(process.platform === "win32")("item 5: one switch for reading WSL from Windows", () => {
  test("off, wsl.exe is never called, and what meme had from WSL goes", () => {
    const w = world();
    const { env, calls } = windows(w, { own: true, script: RUNNING });
    expect(run(w, ["ls", "-a"], { env }).out).toContain("a6a6a6a6");
    const before = calls().length;
    expect(before).toBeGreaterThan(0);
    const off = { ...env, MEME_NO_WSL: "1" };
    expect(run(w, ["ls", "-a"], { env: off }).out).not.toContain("a6a6a6a6");
    const status = run(w, ["status"], { env: off }).out;
    expect(status).not.toContain("·WSL");
    expect(calls().length).toBe(before);
  });
});

describe.skipIf(process.platform === "win32")("items 6 and 7: Windows without WSL costs nothing; a slow WSL does not hang", () => {
  test("not installed: asked on the first run, then not for a day", () => {
    const w = world();
    const { env, calls } = windows(w, { own: false, script: NOT_INSTALLED });
    run(w, ["ls", "-a"], { env });
    expect(calls().length).toBeLessThanOrEqual(2);
    expect(calls().length).toBeGreaterThan(0);
    const after = calls().length;
    run(w, ["ls", "-a"], { env });
    run(w, ["status"], { env });
    expect(calls().length).toBe(after);
    // A day later it asks again.
    const db = new Database(path.join(w.home, ".meme", "meme.sqlite"));
    db.run("UPDATE meta SET value = ? WHERE key = 'wsl_absent'", [new Date(Date.now() - 25 * 3600_000).toISOString()]);
    db.close();
    run(w, ["ls", "-a"], { env });
    expect(calls().length).toBeGreaterThan(after);
  });

  test("installed but not running: asked on every run", () => {
    const w = world();
    const { env, calls } = windows(w, { own: false, script: STOPPED });
    run(w, ["ls", "-a"], { env });
    const first = calls().length;
    expect(first).toBeGreaterThan(0);
    run(w, ["ls", "-a"], { env });
    expect(calls().length).toBe(2 * first);
  });

  test("WSL's own wsl.exe is asked every time, whatever it said before", () => {
    const w = world();
    const { env, calls } = windows(w, { own: true, script: NOT_INSTALLED });
    run(w, ["ls", "-a"], { env });
    run(w, ["ls", "-a"], { env });
    expect(calls().length).toBe(2);
  });

  test("a wsl.exe that does not answer: the run ends after the timeout, and status says WSL did not respond", () => {
    const w = world();
    const { env } = windows(w, { own: true, script: RUNNING });
    // First a run that reads Ubuntu, then wsl.exe hangs.
    expect(run(w, ["ls", "-a"], { env }).out).toContain("a6a6a6a6");
    const hung = windows(w, { own: true, script: "exec sleep 20" });
    const started = performance.now();
    const r = run(w, ["status"], { env: { ...hung.env, MEME_WSL_TIMEOUT_MS: "300" } });
    expect(performance.now() - started).toBeLessThan(5000);
    expect(r.out).toMatch(/WSL did not respond within 0\.3 seconds; its sessions are as of \d\d-\d\d \d\d:\d\d/);
    expect(r.out).not.toContain("is not running");
  });
});

describe.skipIf(process.platform === "win32")("item 9: one platform, no platform in the labels", () => {
  test("only Windows sessions: lists, show and status say Claude; the handoff's Source still says Claude·Win", () => {
    const w = world();
    // On Windows with no wsl.exe: the session in ~/.claude is a Windows one, and the only one.
    const env = { MEME_ENV: "win", PATH: "/usr/bin:/bin" };
    const ls = run(w, ["ls", "-a"], { env }).out;
    expect(ls).toMatch(/\n {2}11111111 {2}Claude {2}/);
    expect(ls).not.toContain("·Win");
    expect(run(w, ["show", "1111"], { env }).out.split("\n")[0]).toEndWith("  [Claude]");
    expect(run(w, ["status"], { env }).out).toMatch(/\n {2}Claude +~\/\.claude\/projects +readable +1 session\n/);
    expect(run(w, ["continue", "1111", "--plain"], { env }).out).toContain("Source: Claude·Win · session 11111111");
    // A session in WSL as well: every label names its platform again.
    const wsl = path.join(w.home, "wsl");
    const s = new ClaudeSession({ id: WSL_ID, cwd: "/home/u/app", start: "2026-10-09T08:00:00.000Z" });
    s.user("a session in WSL");
    s.assistant("ok");
    s.write(path.join(wsl, "Ubuntu", "home", "u", ".claude", "projects"));
    const both = run(w, ["ls", "-a"], { env: { ...env, MEME_WSL_DIR: wsl, MEME_WSL_RUNNING: "Ubuntu" } }).out;
    expect(both).toMatch(/\n {2}11111111 {2}Claude·Win {2}/);
    expect(both).toMatch(/\n {2}a6a6a6a6 {2}Claude·WSL {2}/);
  });
});

describe.skipIf(process.platform === "win32")("item 8: install mentions agents on the other side with no meme", () => {
  /** A stand-in wsl.exe: `-d <distro> --cd <dir> -e <command>...` runs the command in <wsl>/<distro><dir>, with `bin` on PATH. */
  function wslWithTools(w: World, tools: string[]) {
    const wsl = path.join(w.home, "wsl");
    const s = new ClaudeSession({ id: WSL_ID, cwd: "/home/u/app", start: "2026-10-09T08:00:00.000Z" });
    s.user("a session in WSL");
    s.assistant("ok");
    s.write(path.join(wsl, "Ubuntu", "home", "u", ".claude", "projects"));
    const bin = path.join(w.home, "wsl-bin");
    mkdirSync(bin, { recursive: true });
    for (const t of tools) {
      writeFileSync(path.join(bin, t), "#!/bin/sh\nexit 0\n");
      chmodSync(path.join(bin, t), 0o755);
    }
    const log = path.join(w.home, "wsl-calls.log");
    writeFileSync(
      path.join(w.home, "wsl.exe"),
      [
        "#!/bin/sh",
        `printf '%s\\n' "$*" >> "${log}"`,
        "while [ $# -gt 0 ]; do case \"$1\" in -d) d=$2; shift 2;; --cd) c=$2; shift 2;; -e) shift; break;; *) shift;; esac; done",
        `cd "${wsl}/$d$c" 2>/dev/null || exit 1`,
        'exec "$@"',
      ].join("\n"),
    );
    chmodSync(path.join(w.home, "wsl.exe"), 0o755);
    const env = { MEME_ENV: "win", MEME_WSL_DIR: wsl, MEME_WSL_RUNNING: "Ubuntu", MEME_WSL_EXE: path.join(w.home, "wsl.exe"), PATH: `${bin}:/usr/bin:/bin` };
    return { env, calls: () => (existsSync(log) ? readFileSync(log, "utf8").trimEnd().split("\n") : []) };
  }
  const HINT = /Agents also in WSL \(Ubuntu\): Claude Code, Codex\. To use `! meme continue` in them, install meme there too:\n {2}curl -fsSL https:\/\/github\.com\/jordonjill\/meme\/releases\/latest\/download\/install\.sh \| sh\n/;

  test("on Windows: claude and codex in a running WSL with no meme there", () => {
    const w = world();
    const { env } = wslWithTools(w, ["claude", "codex"]);
    expect(run(w, ["install"], { env }).out).toMatch(HINT);
  });

  test("on Windows: nothing said when meme is there too, when no agent is, or when WSL is not running (and it is not started)", () => {
    for (const tools of [["claude", "codex", "meme"], []]) {
      const w = world();
      const { env } = wslWithTools(w, tools);
      expect(run(w, ["install"], { env }).out).not.toContain("Agents also in WSL");
    }
    const w = world();
    const { env, calls } = wslWithTools(w, ["claude"]);
    expect(run(w, ["install"], { env: { ...env, MEME_WSL_RUNNING: "" } }).out).not.toContain("Agents also in WSL");
    expect(calls()).toEqual([]);
  });

  test("in WSL: an agent on Windows and no meme there", () => {
    const w = world();
    expect(run(w, ["install"]).out).toMatch(/Agents also on Windows: Claude Code\. To use `! meme continue` in them, install meme on Windows too:\n {2}irm https:\/\/github\.com\/jordonjill\/meme\/releases\/latest\/download\/install\.ps1 \| iex\n/);
    // meme has run on Windows: its folder is there.
    mkdirSync(path.join(w.users, "me", ".meme"), { recursive: true });
    expect(run(w, ["install"]).out).not.toContain("Agents also on Windows");
  });
});

describe.skipIf(process.platform === "win32" || process.getuid?.() === 0)("item 11: meme report", () => {
  /** A session in a project with a telling name, saying something private, and one meme cannot read. */
  function private_(w: World) {
    const projects = path.join(w.home, ".claude", "projects");
    const s = new ClaudeSession({ id: "a7a7a7a7-0000-4000-8000-0000000000a7", cwd: "/work/acme-secret-merger", start: "2026-10-09T08:00:00.000Z", version: "2.1.308" });
    s.user("TOP-SECRET-PROMPT about the merger");
    s.assistant("TOP-SECRET-REPLY");
    s.write(projects);
    const bad = path.join(projects, "-work-acme-secret-merger", "a8a8a8a8-0000-4000-8000-0000000000a8.jsonl");
    // meme cannot read it: the path goes into status and the log.
    writeFileSync(bad, "{}\n");
    chmodSync(bad, 0o000);
    return { bad };
  }

  test("what to paste into an issue: versions, status, recent errors; no home, user name, project or conversation", () => {
    const w = world();
    private_(w);
    run(w, ["ls", "-a"]);
    const r = run(w, ["report"]);
    expect(r.code).toBe(0);
    expect(r.out).toStartWith("This report holds no conversation content. Read it before you paste it.\n");
    expect(r.out).toMatch(/\nmeme: +0\.1\.0 \(schema \d+\)\n/);
    expect(r.out).toMatch(/\nSystem: +\S+ \S+/);
    expect(r.out).toMatch(/\nAgents: +.*Claude Code 2\.1\.308/);
    expect(r.out).toContain("\nSources:\n");
    expect(r.out).toContain("Recent errors and slow runs");
    for (const secret of [w.home, "Users/me/", "acme-secret-merger", "TOP-SECRET"]) expect(r.out, secret).not.toContain(secret);
    expect(r.out).toContain("project-1");
  });

  test("--session: the session's structure, none of its content", () => {
    const w = world();
    private_(w);
    const r = run(w, ["report", "--session", "a7a7"]);
    expect(r.code).toBe(0);
    expect(r.out).toContain("\nSession a7a7a7a7 (structure only)\n");
    expect(r.out).toMatch(/\n {2}user +1 +\S/);
    expect(r.out).toMatch(/\n {2}assistant +1 +\S/);
    expect(r.out).toMatch(/\nIn meme: +1 turn, /);
    for (const secret of [w.home, "acme-secret-merger", "TOP-SECRET"]) expect(r.out, secret).not.toContain(secret);
  });

  test("an unexpected error says how to report it", () => {
    const w = world();
    const notADir = path.join(w.home, "a-file");
    writeFileSync(notADir, "");
    const r = run(w, ["ls"], { env: { MEME_HOME: path.join(notADir, "meme") } });
    expect(r.code).toBe(1);
    expect(r.err).toContain("To report it, run `meme report` and paste what it prints into an issue.");
  });
});
