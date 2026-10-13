/**
 * End to end: meme on Windows reading the running WSL distributions (plan step 5).
 * MEME_ENV=win, MEME_WSL_DIR stands in for \\wsl.localhost, MEME_WSL_RUNNING
 * says which distributions run, and MEME_WSL_EXE is a stand-in wsl.exe that
 * runs the command meme gives it, so the login-shell wrapper really runs in sh
 * and bash.
 */
import { describe, expect, test } from "bun:test";
import { chmodSync, existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { ClaudeSession } from "../fixtures/gen-claude";
import { sampleCodex } from "../fixtures/gen-codex";
import { run, world, type World } from "./world";

const WSL_ID = "a5a5a5a5-0000-4000-8000-0000000000a5";
const CODEX_ID = "c0dec0de-0000-4000-8000-0000000000c5";
const OTHER_ID = "d3d3d3d3-0000-4000-8000-0000000000d3";

function wslWorld() {
  const w = world();
  const wsl = path.join(w.home, "wsl");
  const ubuntu = path.join(wsl, "Ubuntu");
  // A repository at /home/u/work/app; the session started in its src/ folder.
  mkdirSync(path.join(ubuntu, "home", "u", "work", "app", ".git"), { recursive: true });
  mkdirSync(path.join(ubuntu, "home", "u", "work", "app", "src"), { recursive: true });
  const s = new ClaudeSession({ id: WSL_ID, cwd: "/home/u/work/app/src", start: "2026-10-09T08:00:00.000Z" });
  s.user("把导入模块的错误处理补完整");
  s.assistant("好的，我先看一下导入模块。");
  const file = s.write(path.join(ubuntu, "home", "u", ".claude", "projects"));
  sampleCodex({ id: CODEX_ID, cwd: "/home/u/work/app", start: "2026-10-09T09:00:00.000Z" }).write(path.join(ubuntu, "home", "u", ".codex"));
  // A second distribution that is not running.
  const other = new ClaudeSession({ id: OTHER_ID, cwd: "/home/u/notes", start: "2026-10-09T10:00:00.000Z" });
  other.user("a session in a stopped distribution");
  other.assistant("ok");
  other.write(path.join(wsl, "Debian", "home", "u", ".claude", "projects"));
  const env: Record<string, string> = { MEME_ENV: "win", MEME_WSL_DIR: wsl, MEME_WSL_RUNNING: "Ubuntu" };
  return { w, wsl, ubuntu, file, env };
}

/**
 * A stand-in wsl.exe: `-d <distro> --cd <dir> -e <command>...` runs the command
 * in <MEME_WSL_DIR>/<distro><dir>. `bin` holds what "WSL" has on its PATH.
 */
function fakeWsl(w: World, wsl: string, tools: string[], scripts: Record<string, string> = {}): { env: Record<string, string>; calls: () => string[]; agent: () => { cwd: string; args: string[] } } {
  const bin = path.join(w.home, "wsl-bin");
  mkdirSync(bin, { recursive: true });
  const log = path.join(w.home, "wsl-calls.log");
  const record = path.join(w.home, "agent-was-called");
  writeFileSync(
    path.join(w.home, "wsl.exe"),
    [
      "#!/bin/sh",
      `printf '%s\\n' "$*" >> "${log}"`,
      "while [ $# -gt 0 ]; do case \"$1\" in -d) d=$2; shift 2;; --cd) c=$2; shift 2;; -e) shift; break;; *) shift;; esac; done",
      `cd "${wsl}/$d$c" 2>/dev/null || { echo "chdir($c) failed 2" >&2; exit 1; }`,
      'exec "$@"',
    ].join("\n"),
  );
  chmodSync(path.join(w.home, "wsl.exe"), 0o755);
  for (const t of tools) {
    writeFileSync(path.join(bin, t), scripts[t] ?? `#!/bin/sh\npwd > "${record}.cwd"\nfor a in "$@"; do printf '%s\\n' "$a"; done > "${record}.args"\n`);
    chmodSync(path.join(bin, t), 0o755);
  }
  return {
    env: { MEME_WSL_EXE: path.join(w.home, "wsl.exe"), PATH: `${bin}:/usr/bin:/bin`, MEME_TERMINAL: "1" },
    calls: () => readFileSync(log, "utf8").trimEnd().split("\n"),
    agent: () => ({ cwd: readFileSync(`${record}.cwd`, "utf8").trim(), args: readFileSync(`${record}.args`, "utf8").trimEnd().split("\n") }),
  };
}

describe.skipIf(process.platform === "win32")("meme on Windows reads WSL", () => {
  test("ls lists the running distribution's sessions as WSL, with the project as a WSL path", () => {
    const { w, env } = wslWorld();
    const r = run(w, ["ls", "-a"], { env });
    expect(r.code).toBe(0);
    expect(r.out).toMatch(/\n {2}c0dec0de {2}Codex·WSL .* \/home\/u\/work\/app +Make add\(\) take any number/);
    expect(r.out).toMatch(/\n {2}a5a5a5a5 {2}Claude·WSL .* \/home\/u\/work\/app +把导入模块的错误处理补完整\n/);
    expect(r.out).toMatch(/\n {2}11111111 {2}Claude·Win /);
    // Debian is not running: not read.
    expect(r.out).not.toContain("d3d3d3d3");
  });

  test("a distribution that stopped keeps its sessions, even ones deleted meanwhile", () => {
    const { w, env, file } = wslWorld();
    run(w, ["ls", "-a"], { env });
    rmSync(file);
    const stopped = run(w, ["ls", "-a"], { env: { ...env, MEME_WSL_RUNNING: "" } });
    expect(stopped.out).toContain("a5a5a5a5");
    const running = run(w, ["ls", "-a"], { env });
    expect(running.out).not.toContain("a5a5a5a5");
  });

  test("a stopped distribution: ls and status say so in the same words", () => {
    const { w, env } = wslWorld();
    run(w, ["ls", "-a"], { env });
    const off = { ...env, MEME_WSL_RUNNING: "" };
    const notice = /WSL \(Ubuntu\) is not running; its sessions are as of \d\d-\d\d \d\d:\d\d/;
    const ls = run(w, ["ls", "-a", "--plain"], { env: off });
    expect(ls.out.split("\n")[0]).toMatch(new RegExp(`^${notice.source}$`));
    const status = run(w, ["status"], { env: off });
    expect(status.code).toBe(0);
    expect(status.out).toMatch(new RegExp(`\\n {2}${notice.source}\\n`));
    expect(status.out).toMatch(/\n {2}Claude·WSL .*Ubuntu.* not running {2}1 session\n/);
    expect(status.out).not.toMatch(/Claude·WSL .* readable/);
    // Running again: no notice, readable.
    const back = run(w, ["status"], { env });
    expect(back.out).not.toContain("is not running");
    expect(back.out).toMatch(/\n {2}Claude·WSL .*Ubuntu.* readable {2}1 session\n/);
  });

  test("inside \\\\wsl.localhost the current project is the WSL one", () => {
    const { w, env, ubuntu } = wslWorld();
    const r = run(w, ["ls"], { env, cwd: path.join(ubuntu, "home", "u", "work", "app", "src") });
    expect(r.out).toStartWith("Sessions in /home/u/work/app (newest first):\n");
    expect(r.out).toContain("a5a5a5a5");
    expect(r.out).not.toContain("11111111");
  });

  test("a handoff of a WSL session says where the repository is and suggests WSL", () => {
    const { w, env, ubuntu } = wslWorld();
    const r = run(w, ["continue", "a5a5"], { env });
    const host = path.join(ubuntu, "home", "u", "work", "app", "src");
    expect(r.out).toContain(`· dir ${host} (/home/u/work/app/src in WSL Ubuntu) ·`);
    expect(r.out).toContain(`Note: the repository is inside WSL (Ubuntu). From Windows it is at ${host}, where git and builds are slow and can fail. Tell the user, and suggest continuing in WSL instead: \`wsl -d Ubuntu --cd /home/u/work/app/src\`, then \`meme continue a5a5a5a5\` there.`);
  });

  test("a WSL session on a Windows drive: the handoff names the drive path, as the place check does", () => {
    const { w, env, ubuntu } = wslWorld();
    const id = (n: number) => `e1e1e1e${n}-0000-4000-8000-0000000000e${n}`;
    const s = (n: number, cwd: string) => {
      const x = new ClaudeSession({ id: id(n), cwd, start: `2026-10-09T1${n}:00:00.000Z` });
      x.user(`work on drive ${n}`);
      x.assistant("ok");
      x.write(path.join(ubuntu, "home", "u", ".claude", "projects"));
    };
    s(1, "/mnt/c/code/shop");
    const r = run(w, ["continue", "e1e1e1e1"], { env });
    expect(r.out).toContain("· dir C:\\code\\shop (/mnt/c/code/shop in WSL Ubuntu) ·");
    // On Windows' own disk: not the slow \\wsl.localhost path, so no note about it.
    expect(r.out).not.toContain("the repository is inside WSL");
    // The distribution's own wsl.conf says where its drives are.
    mkdirSync(path.join(ubuntu, "etc"), { recursive: true });
    writeFileSync(path.join(ubuntu, "etc", "wsl.conf"), "[automount]\nroot = /\n");
    s(2, "/c/code/shop");
    expect(run(w, ["continue", "e1e1e1e2"], { env }).out).toContain("· dir C:\\code\\shop (/c/code/shop in WSL Ubuntu) ·");
  });

  test("pushing a WSL session starts the agent in WSL through the user's login shell", () => {
    const { w, wsl, ubuntu, env } = wslWorld();
    const fake = fakeWsl(w, wsl, ["meme", "claude"]);
    const r = run(w, ["continue", "a5a5", "--in", "claude"], { env: { ...env, ...fake.env } });
    expect(r.err).not.toContain("meme:");
    expect(r.code).toBe(0);
    expect(r.out).toBe("Continuing a5a5a5a5 (把导入模块的错误处理补完整) in Claude Code, in /home/u/work/app/src (WSL: Ubuntu)\n");
    // First where meme and claude are, then the agent itself, both where the session started (arch.md 6.3, rule 4).
    expect(fake.calls().map((c) => c.split(" -e ")[0])).toEqual(["-d Ubuntu --cd /home/u/work/app/src", "-d Ubuntu --cd /home/u/work/app/src"]);
    expect(fake.agent().cwd).toBe(path.join(ubuntu, "home", "u", "work", "app", "src"));
    expect(fake.agent().args).toEqual([
      "Continue an earlier session: run `meme continue a5a5a5a5` exactly as written, with no pipe or other command around it, and follow the instructions at the top of its output.",
      "--allowedTools",
      "Bash(meme:*)",
    ]);
  });

  test("without meme in WSL nothing starts, and the user is told how to continue there", () => {
    const { w, wsl, env } = wslWorld();
    const fake = fakeWsl(w, wsl, ["claude"]);
    const r = run(w, ["continue", "a5a5", "--in", "claude"], { env: { ...env, ...fake.env } });
    expect(r.code).toBe(1);
    expect(r.err).toBe(
      "meme: meme is not installed in WSL (Ubuntu), and the agent there needs it to fetch the handoff. Install it there, then open WSL with `wsl -d Ubuntu --cd /home/u/work/app/src` and run `meme continue a5a5a5a5`\n",
    );
    expect(existsSync(path.join(w.home, "agent-was-called.args"))).toBe(false);
  });

  test("forget deletes a WSL Claude Code session through \\\\wsl.localhost", () => {
    const { w, env, file } = wslWorld();
    const cc = run(w, ["forget", "a5a5", "--yes"], { env });
    expect(cc.code).toBe(0);
    expect(existsSync(file)).toBe(false);
  });

  test("forget deletes a WSL Codex session with codex in WSL, run from the user's home there", () => {
    const { w, wsl, ubuntu, env } = wslWorld();
    const codexFake = [
      "#!/bin/sh",
      `pwd >> "${w.home}/codex-cwd.log"`,
      'if [ "$2" = "--help" ]; then echo "      --force"; exit 0; fi',
      `find "${ubuntu}" -name "*$3*" -type f -delete`,
    ].join("\n");
    const without = run(w, ["forget", "c0dec0de", "--yes"], { env: { ...env, ...fakeWsl(w, wsl, ["meme"]).env } });
    expect(without.out).toContain("cannot be deleted from here: `codex delete` is not available in WSL (Ubuntu); delete it in Codex with /delete there.");
    const fake = fakeWsl(w, wsl, ["codex"], { codex: codexFake });
    const r = run(w, ["forget", "c0dec0de", "--yes"], { env: { ...env, ...fake.env } });
    expect(r.out).toContain(`    runs: codex delete --force ${CODEX_ID} in WSL (Ubuntu)\n`);
    expect(r.out).toContain("Codex keeps what you typed in its own input history (/home/u/.codex/history.jsonl in WSL).");
    expect(r.out).toContain("✓ c0dec0de deleted");
    expect(fake.calls().at(-1)).toStartWith(`-d Ubuntu --cd /home/u -e sh -c`);
    expect(readFileSync(path.join(w.home, "codex-cwd.log"), "utf8").trim().split("\n")).toEqual([path.join(ubuntu, "home", "u"), path.join(ubuntu, "home", "u")]);
  });

  test("a slow run's line in meme.log has the wait for wsl.exe and the WSL import too", () => {
    const { w, env } = wslWorld();
    run(w, ["ls", "-a", "--plain"], { env: { ...env, MEME_SLOW_MS: "0" } });
    expect(readFileSync(path.join(w.home, ".meme", "logs", "meme.log"), "utf8")).toMatch(/slow: meme ls -a --plain took \d+ms \(start \d+, open \d+, import \d+, wsl\.exe \d+, import WSL \d+, command \d+\)/);
  });

  test("R6: pulling a session of a stopped distribution does not open it (which would start it): no wsl.conf, no git", () => {
    const { w, wsl, env } = wslWorld();
    const debian = path.join(wsl, "Debian");
    // Debian mounts the drives at /x/; reading its wsl.conf would turn /x/c/code/shop into C:\code\shop.
    mkdirSync(path.join(debian, "etc"), { recursive: true });
    writeFileSync(path.join(debian, "etc", "wsl.conf"), "[automount]\nroot = /x/\n");
    const s = new ClaudeSession({ id: "e1e1e1e1-0000-4000-8000-0000000000e1", cwd: "/x/c/code/shop", start: "2026-10-09T11:00:00.000Z" });
    s.user("fix the shop's cart");
    s.assistant("Fixed.");
    s.write(path.join(debian, "home", "u", ".claude", "projects"));
    run(w, ["ls", "-a"], { env: { ...env, MEME_WSL_RUNNING: "Ubuntu,Debian" } });
    const r = run(w, ["continue", "e1e1"], { env });
    expect(r.code).toBe(0);
    expect(r.out).toContain("# Handoff: fix the shop's cart");
    expect(r.out).not.toContain("C:\\code\\shop");
    expect(r.out).not.toContain("Note: This session ran in");
  });

  test("forget refuses a Windows session open in Claude Code on Windows: tasklist.exe in %SystemRoot%\\System32 says its process runs", () => {
    const { w, env } = wslWorld();
    // On Windows, ~/.claude/projects is Windows' own; the world's session 11111111 is there.
    const sessions = path.join(w.home, ".claude", "sessions");
    mkdirSync(sessions, { recursive: true });
    writeFileSync(path.join(sessions, "6000.json"), JSON.stringify({ pid: 6000, sessionId: w.wsl.id, procStart: "133706", version: "2.1.296" }));
    const system32 = path.join(w.home, "Windows", "System32");
    mkdirSync(system32, { recursive: true });
    const listed = path.join(w.home, "tasklist-pids");
    writeFileSync(path.join(system32, "tasklist.exe"), ["#!/bin/sh", `for p in $(cat "${listed}"); do printf '"node.exe","%s","Console","1","1 K"\\r\\n' "$p"; done`].join("\n"));
    chmodSync(path.join(system32, "tasklist.exe"), 0o755);
    const winEnv = { ...env, SystemRoot: path.join(w.home, "Windows") };
    writeFileSync(listed, "4 6000");
    const r = run(w, ["forget", "1111", "--yes"], { env: winEnv });
    expect([r.code, r.err]).toEqual([1, "meme: 11111111 is open in Claude Code (Windows, process 6000). Close it there first. Nothing deleted.\n"]);
    writeFileSync(listed, "4 7000");
    expect(run(w, ["forget", "1111"], { env: winEnv }).err).not.toContain("is open");
  });

  test("forget refuses a WSL Codex session whose lock is held there: \\\\wsl.localhost\\<distro>\\proc\\locks has the lock file's inode (plan §6 ⑧.4)", () => {
    const { w, ubuntu, env } = wslWorld();
    const lock = path.join(ubuntu, "home", "u", ".codex", "thread-writer-locks", `${CODEX_ID}.lock`);
    mkdirSync(path.dirname(lock), { recursive: true });
    writeFileSync(lock, "");
    const locks = (inode: number) => `1: POSIX  ADVISORY  WRITE 812 08:30:4242 0 EOF\n10: FLOCK  ADVISORY  WRITE 104933 08:30:${inode} 0 EOF\n10: -> FLOCK  ADVISORY  WRITE 2 08:30:${inode} 0 EOF\n`;
    mkdirSync(path.join(ubuntu, "proc"), { recursive: true });
    writeFileSync(path.join(ubuntu, "proc", "locks"), locks(statSync(lock).ino));
    const r = run(w, ["forget", "c0de", "--yes"], { env });
    expect([r.code, r.err]).toEqual([1, "meme: c0dec0de is open in Codex (WSL: Ubuntu, process 104933). Close it there first. Nothing deleted.\n"]);
    // Nobody holds it any more: Codex was killed.
    writeFileSync(path.join(ubuntu, "proc", "locks"), locks(statSync(lock).ino + 1));
    expect(run(w, ["forget", "c0de"], { env }).err).not.toContain("is open");
  });

  test("forget refuses a WSL session open in Claude Code there: its process is read through \\\\wsl.localhost\\<distro>\\proc (plan §6 ⑧.3)", () => {
    const { w, ubuntu, env } = wslWorld();
    const sessions = path.join(ubuntu, "home", "u", ".claude", "sessions");
    mkdirSync(sessions, { recursive: true });
    writeFileSync(path.join(sessions, "5088.json"), JSON.stringify({ pid: 5088, sessionId: WSL_ID, procStart: "43704", version: "2.1.296" }));
    // `pid (comm) state ppid`, fields 5–21, then field 22: the start time.
    const stat = (start: string) => `5088 (claude (main)) S 1 ${Array.from({ length: 17 }, (_, i) => i + 5).join(" ")} ${start} 0 0 0\n`;
    mkdirSync(path.join(ubuntu, "proc", "5088"), { recursive: true });
    writeFileSync(path.join(ubuntu, "proc", "5088", "stat"), stat("43704"));
    const r = run(w, ["forget", "a5a5", "--yes"], { env });
    expect([r.code, r.err]).toEqual([1, "meme: a5a5a5a5 is open in Claude Code (WSL: Ubuntu, process 5088). Close it there first. Nothing deleted.\n"]);
    // WSL restarted since, and pid 5088 is another process now.
    writeFileSync(path.join(ubuntu, "proc", "5088", "stat"), stat("812"));
    expect(run(w, ["forget", "a5a5"], { env }).err).not.toContain("is open");
    rmSync(path.join(ubuntu, "proc", "5088"), { recursive: true });
    expect(run(w, ["forget", "a5a5"], { env }).err).not.toContain("is open");
  });
});
