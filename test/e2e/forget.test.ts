/** End to end: meme forget, on synthetic sessions in a temporary HOME. */
import { describe, expect, test } from "bun:test";
import { chmodSync, existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import path from "node:path";
import { ClaudeSession } from "../fixtures/gen-claude";
import { CodexSession, sampleCodex } from "../fixtures/gen-codex";
import { statStart } from "../../src/platform/process";
import { run, runInTerminal, SCRIPT, world, type World } from "./world";

const MINIMAL_PATH = "/usr/bin:/bin";
const demoDir = (w: World) => path.join(w.home, "work", "demo");
const claudeHome = (w: World) => path.join(w.home, ".claude");

/** The 3 folders Claude Code keeps next to a session's file (release.md §4). */
function sessionFolders(home: string, projectDir: string, id: string): string[] {
  const dirs = [path.join(projectDir, id, "subagents"), path.join(home, "file-history", id), path.join(home, "session-env", id)];
  for (const d of dirs) {
    mkdirSync(d, { recursive: true });
    writeFileSync(path.join(d, "x"), "x");
  }
  return dirs.map((d) => (d.endsWith("subagents") ? path.dirname(d) : d));
}

/**
 * A stand-in `codex`: `delete --help` mentions --force (or not), and
 * `delete --force <id>` removes the rollout files with that id under ~/.codex.
 */
function fakeCodex(w: World, o: { canDelete?: boolean; fails?: boolean } = {}): string {
  const bin = path.join(w.home, "fake-bin");
  mkdirSync(bin, { recursive: true });
  const log = path.join(w.home, "codex-calls.log");
  writeFileSync(
    path.join(bin, "codex"),
    [
      "#!/bin/sh",
      `echo "$@" >> "${log}"`,
      `if [ "$2" = "--help" ]; then echo "Usage: codex delete [OPTIONS] <SESSION>"; ${o.canDelete === false ? "" : 'echo "      --force"'}; exit 0; fi`,
      o.fails ? 'echo "Error: database is locked" >&2; exit 1' : `find "$HOME/.codex" -name "*$3*" -type f -delete; echo "Deleted session $3."`,
    ].join("\n"),
  );
  chmodSync(path.join(bin, "codex"), 0o755);
  return bin;
}

describe.skipIf(process.platform === "win32")("meme forget: Claude Code", () => {
  test("deletes the 4 places and then meme's copy; its text is gone from the database file", () => {
    const w = world();
    const file = path.join(claudeHome(w), "projects", demoDir(w).replace(/[^A-Za-z0-9]/g, "-"), `${w.wsl.id}.jsonl`);
    const folders = sessionFolders(claudeHome(w), path.dirname(file), w.wsl.id);
    run(w, ["ls"]);
    const r = run(w, ["forget", "1111", "--yes"]);
    expect(r.code).toBe(0);
    expect(r.out).toContain("meme forget will permanently delete this session:");
    expect(r.out).toMatch(/\n {4}~\/\.claude\/file-history\/11111111-0000-4000-8000-000000000001\/ +backups of files before Claude Code edited them\n/);
    expect(r.out).toMatch(/\n {4}~\/\.claude\/session-env\/11111111-0000-4000-8000-000000000001\/ +the session's environment\n/);
    expect(r.out).toContain("✓ 11111111 deleted");
    for (const p of [file, ...folders]) expect(existsSync(p)).toBe(false);
    expect(run(w, ["ls", "-a"]).out).not.toContain("11111111");
    expect(readFileSync(path.join(w.home, ".meme", "meme.sqlite")).includes("状态栏现在显示哪些内容")).toBe(false);
  });

  test("a Windows session is deleted from WSL too", () => {
    const w = world();
    const r = run(w, ["forget", "2222", "--yes"]);
    expect(r.code).toBe(0);
    expect(existsSync(path.join(w.users, "me", ".claude", "projects"))).toBe(true);
    expect(run(w, ["ls", "-a"]).out).not.toContain("22222222");
  });

  test("without a terminal it needs --yes, and deletes nothing", () => {
    const w = world();
    const r = run(w, ["forget", "1111"]);
    expect(r.code).toBe(1);
    expect(r.err).toStartWith("meme: nothing deleted. Deleting needs the user's confirmation");
    expect(run(w, ["ls", "-a"]).out).toContain("11111111");
  });

  test("the session that runs meme is refused; only ids are accepted", () => {
    const w = world();
    const r = run(w, ["forget", "1111", "--yes"], { env: { CLAUDE_CODE_SESSION_ID: w.wsl.id } });
    expect([r.code, r.err]).toEqual([1, "meme: 11111111 is the session that is running meme; it cannot delete itself\n"]);
    expect(run(w, ["forget", "last", "--yes"]).code).toBe(2);
    expect(run(w, ["forget", "--yes"]).code).toBe(2);
  });

  test("a session active a minute ago, where meme cannot tell whether it is open: refused, also with --yes and in a terminal (plan §6 ⑧.4)", () => {
    const w = world();
    const live = new ClaudeSession({ id: "99999999-0000-4000-8000-000000000009", cwd: demoDir(w), start: new Date(Date.now() - 60_000).toISOString() });
    live.user("still working");
    live.assistant("on it");
    live.write(path.join(claudeHome(w), "projects"));
    // No ~/.claude/sessions: an older Claude Code, which does not list its open sessions.
    const r = run(w, ["forget", "9999", "--yes"]);
    expect([r.code, r.out]).toEqual([1, ""]);
    // It says when it can go: 5 minutes after it was last written, from the minute after (plan §6 ⑩.1).
    const last = Date.parse(live.lines.at(-1)!.timestamp as string);
    const after = new Date(Math.ceil((last + 5 * 60_000) / 60_000) * 60_000).toISOString().slice(11, 16);
    expect(r.err).toMatch(new RegExp(`^meme: 99999999 was written (a minute|\\d+ seconds) ago and may still be open in Claude Code; you can delete it after ${after}\\. Nothing deleted\\.\\n$`));
    if (SCRIPT) expect(runInTerminal(w, ["forget", "9999"], "y\n").out).toContain("may still be open in Claude Code");
    expect(run(w, ["ls", "-a"]).out).toContain("99999999");
    // A day old: deleted as usual.
    expect(run(w, ["forget", "1111", "--yes"]).code).toBe(0);
  });

  test("with Claude Code's list of open sessions there, a session not in it is closed: deleted right after it was written", () => {
    const w = world();
    const live = new ClaudeSession({ id: "99999999-0000-4000-8000-000000000009", cwd: demoDir(w), start: new Date(Date.now() - 60_000).toISOString() });
    live.user("done, and quit");
    live.assistant("bye");
    live.write(path.join(claudeHome(w), "projects"));
    mkdirSync(path.join(claudeHome(w), "sessions"));
    const r = run(w, ["forget", "9999", "--yes"]);
    expect([r.code, r.err]).toEqual([0, ""]);
    expect(r.out).not.toContain("Warning");
    expect(r.out).toContain("✓ 99999999 deleted");
  });
});

describe.skipIf(process.platform === "win32")("meme forget: continuation chains", () => {
  function chain(w: World) {
    const a = new ClaudeSession({ id: "aaaaaaaa-0000-4000-8000-00000000000a", cwd: demoDir(w), start: "2026-10-01T08:00:00.000Z" });
    a.user("first part");
    a.assistant("done with the first part");
    const b = new ClaudeSession({ id: "bbbbbbbb-0000-4000-8000-00000000000b", cwd: demoDir(w), start: "2026-10-01T09:00:00.000Z" });
    a.resumeInto(b);
    b.user("second part");
    b.assistant("done with the second part");
    a.write(path.join(claudeHome(w), "projects"));
    b.write(path.join(claudeHome(w), "projects"));
  }

  test("forget B deletes only B, says A shows up again; --chain takes A too", () => {
    const w = world();
    chain(w);
    const only = run(w, ["forget", "bbbb", "--yes"]);
    expect(only.out).toStartWith("bbbbbbbb was continued from aaaaaaaa. aaaaaaaa still holds the first part of this conversation; if only bbbbbbbb is deleted, aaaaaaaa shows up in the list again. Add --chain to delete it too.\n");
    expect(only.out).toContain("✓ bbbbbbbb deleted");
    expect(run(w, ["ls", "-a"]).out).toContain("aaaaaaaa");

    const w2 = world();
    chain(w2);
    const both = run(w2, ["forget", "bbbb", "--yes", "--chain"]);
    expect(both.out).toContain("✓ bbbbbbbb deleted");
    expect(both.out).toContain("✓ aaaaaaaa deleted");
  });

  test("forget A leaves B whole", () => {
    const w = world();
    chain(w);
    run(w, ["forget", "aaaa", "--yes"]);
    const b = run(w, ["continue", "bbbb"]);
    expect(b.out).toContain("1. first part\n2. second part\n");
  });
});

describe.skipIf(process.platform === "win32")("meme forget: Codex", () => {
  const id = "c0dec0de-0000-4000-8000-0000000000cc";
  function codexSession(w: World) {
    mkdirSync(demoDir(w), { recursive: true });
    return sampleCodex({ id, cwd: demoDir(w) }).write(path.join(w.home, ".codex"));
  }

  test("runs codex delete --force <uuid>, checks the file is gone, then drops meme's copy", () => {
    const w = world();
    const file = codexSession(w);
    const bin = fakeCodex(w);
    const r = run(w, ["forget", "c0dec0de", "--yes"], { env: { PATH: `${bin}:${MINIMAL_PATH}` } });
    expect(r.code).toBe(0);
    expect(r.out).toContain(`    runs: codex delete --force ${id}\n`);
    expect(r.out).toContain("Codex keeps what you typed in its own input history (~/.codex/history.jsonl).");
    expect(r.out).toContain("✓ c0dec0de deleted");
    expect(readFileSync(path.join(w.home, "codex-calls.log"), "utf8")).toBe(`delete --help\ndelete --force ${id}\n`);
    expect(existsSync(file)).toBe(false);
    expect(run(w, ["ls", "-a"]).out).not.toContain("c0dec0de");
  });

  test("when codex delete fails, meme's copy is kept", () => {
    const w = world();
    codexSession(w);
    const r = run(w, ["forget", "c0dec0de", "--yes"], { env: { PATH: `${fakeCodex(w, { fails: true })}:${MINIMAL_PATH}` } });
    expect(r.code).toBe(1);
    expect(r.out).toContain("✗ c0dec0de: `delete --force c0dec0de-0000-4000-8000-0000000000cc` failed: Error: database is locked. meme's copy is kept.");
    expect(run(w, ["ls", "-a"]).out).toContain("c0dec0de");
  });

  test("without codex delete, or without codex, nothing of Codex is touched", () => {
    const w = world();
    const file = codexSession(w);
    const old = run(w, ["forget", "c0dec0de", "--yes"], { env: { PATH: `${fakeCodex(w, { canDelete: false })}:${MINIMAL_PATH}` } });
    expect(old.out).toContain("cannot be deleted from here: `codex delete` is not available here; delete it in Codex with /delete");
    expect(old.code).toBe(1);
    const none = run(w, ["forget", "c0dec0de", "--yes"], { env: { PATH: MINIMAL_PATH } });
    expect(none.out).toContain("`codex delete` is not available here");
    expect(existsSync(file)).toBe(true);
  });

  test("a Codex session from the Windows side is deleted by the Windows codex, run from WSL", () => {
    const w = world();
    const file = sampleCodex({ id, cwd: "C:\\Users\\me\\work\\demo-app" }).write(path.join(w.users, "me", ".codex"));
    // Only WSL's own codex: nothing to delete it with on the Windows side.
    const none = run(w, ["forget", "c0dec0de", "--yes"], { env: { PATH: `${fakeCodex(w)}:${MINIMAL_PATH}` } });
    expect(none.out).toContain("cannot be deleted from here: this Codex session is on the Windows side, and Codex is not installed there (or not on the PATH WSL sees); delete it in Codex with /delete, or with `codex delete c0dec0de-0000-4000-8000-0000000000cc` there.");
    expect(existsSync(path.join(w.home, "codex-calls.log"))).toBe(false);
    // A Windows codex on the PATH WSL sees (a stand-in named codex.exe), run in a Windows directory.
    const bin = path.join(w.home, "win-bin");
    mkdirSync(bin, { recursive: true });
    writeFileSync(path.join(bin, "codex.exe"), readFileSync(path.join(fakeCodex(w), "codex"), "utf8").replace("#!/bin/sh", `#!/bin/sh\npwd >> "${w.home}/codex-cwd.log"`).replace('"$HOME/.codex"', `"${w.users}"`));
    chmodSync(path.join(bin, "codex.exe"), 0o755);
    const r = run(w, ["forget", "c0dec0de", "--yes"], { env: { PATH: `${bin}:${MINIMAL_PATH}`, HOME: w.home } });
    expect(r.out).toContain(`    runs: codex delete --force ${id} on the Windows side\n`);
    expect(r.out).toContain(`Codex keeps what you typed in its own input history (${path.join(w.users, "me", ".codex", "history.jsonl")}).`);
    expect(r.out).toContain("✓ c0dec0de deleted");
    expect(existsSync(file)).toBe(false);
    expect(readFileSync(path.join(w.home, "codex-cwd.log"), "utf8").trim().split("\n")).toEqual([w.users, w.users]);
  });

  test("Codex keeps a parent while its fork exists: blocked alone, fork first when both are named", () => {
    const w = world();
    mkdirSync(demoDir(w), { recursive: true });
    // uuid v7, as Codex makes them: a fork made within a minute shares the first 8 characters.
    const [parentId, forkId] = ["019dc1a2-5b2c-7e01-9a3f-1c2d3e4f5a6b", "019dc1a2-7d10-7c44-8b1e-2f3a4b5c6d7e"];
    const parent = new CodexSession({ id: parentId, cwd: demoDir(w) });
    parent.user("parent turn");
    parent.assistant("parent answer");
    const fork = new CodexSession({ id: forkId, cwd: demoDir(w), forkOf: { parent, cutLine: parent.lines.length }, start: "2026-10-10T07:00:00.000Z" });
    fork.user("fork turn");
    fork.assistant("fork answer");
    parent.write(path.join(w.home, ".codex"));
    fork.write(path.join(w.home, ".codex"));
    const env = { PATH: `${fakeCodex(w)}:${MINIMAL_PATH}` };
    // Each is shown, and named, by as much of its id as tells it apart.
    expect(run(w, ["ls"], { cwd: demoDir(w) }).out).toMatch(/\n {2}019dc1a2-7 {2}Codex·WSL .* fork turn\n {2}019dc1a2-5 {2}Codex·WSL .* parent turn\n {2}11111111 {4}Claude·WSL /);
    const alone = run(w, ["forget", "019dc1a2-5", "--yes"], { env });
    expect(alone.code).toBe(1);
    expect(alone.out).toContain('cannot be deleted from here: Codex does not delete a session while a fork reads its history from it: 019dc1a2-7 "fork turn". Name the fork too (`meme forget 019dc1a2-5 019dc1a2-7`; it is deleted first), or delete it first.');
    // Only the availability check ran; nothing was deleted.
    expect(readFileSync(path.join(w.home, "codex-calls.log"), "utf8")).not.toContain("--force");
    const both = run(w, ["forget", "019dc1a2-5", "019dc1a2-7", "--yes"], { env });
    expect(both.code).toBe(0);
    const calls = readFileSync(path.join(w.home, "codex-calls.log"), "utf8").split("\n").filter((l) => l.startsWith("delete --force"));
    expect(calls).toEqual([`delete --force ${forkId}`, `delete --force ${parentId}`]);
  });
});

/** Claude Code's list of open sessions (2.1.296): `<home>/sessions/<pid>.json`. */
function register(claudeDir: string, pid: number, sessionId: string, procStart: string | null): string {
  const dir = path.join(claudeDir, "sessions");
  mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `${pid}.json`);
  writeFileSync(file, JSON.stringify({ pid, sessionId, cwd: "/home/u/work/demo", startedAt: Date.now(), procStart, version: "2.1.296", kind: "interactive", status: "idle" }));
  return file;
}

/** A process that runs until the test ends, and when it started (field 22 of its /proc stat). */
function liveProcess(): { pid: number; started: string; stop: () => void } {
  const p = Bun.spawn(["sleep", "60"], { stdin: "ignore", stdout: "ignore", stderr: "ignore" });
  return { pid: p.pid, started: statStart(readFileSync(`/proc/${p.pid}/stat`, "utf8"))!, stop: () => p.kill() };
}

describe.skipIf(process.platform !== "linux")("meme forget: sessions open in an agent (plan §6 ⑧.3)", () => {
  test("open in Claude Code here: refused, even with --yes; once its process is gone, deleted", async () => {
    const w = world();
    const live = liveProcess();
    try {
      register(claudeHome(w), live.pid, w.wsl.id, live.started);
      const r = run(w, ["forget", "1111", "--yes"]);
      expect([r.code, r.err]).toEqual([1, `meme: 11111111 is open in Claude Code (WSL, process ${live.pid}). Close it there first. Nothing deleted.\n`]);
      expect(r.out).toBe("");
      expect(run(w, ["ls", "-a", "--plain"]).out).toContain("11111111");
    } finally {
      live.stop();
    }
    await Bun.sleep(50);
    // It was killed, so its file is still there: the process decides, not the file.
    const r = run(w, ["forget", "1111", "--yes"]);
    expect(r.err).not.toContain("is open");
    expect(r.code).toBe(0);
    expect(run(w, ["ls", "-a", "--plain"]).out).not.toContain("11111111");
  });

  test("a pid now used by another process, a broken file, no start time recorded", () => {
    const w = world();
    const live = liveProcess();
    try {
      const file = register(claudeHome(w), live.pid, w.wsl.id, String(Number(live.started) + 1));
      expect(run(w, ["forget", "1111"]).err).not.toContain("is open");
      writeFileSync(file, "{ not json");
      expect(run(w, ["forget", "1111"]).err).not.toContain("is open");
      unlinkSync(file);
      // No start time to compare: the pid alone.
      register(claudeHome(w), live.pid, w.wsl.id, null);
      expect(run(w, ["forget", "1111"]).err).toContain("11111111 is open in Claude Code");
    } finally {
      live.stop();
    }
  });

  test("the list says which sessions are open", () => {
    if (!SCRIPT) return;
    const w = world();
    const live = liveProcess();
    try {
      register(claudeHome(w), live.pid, w.wsl.id, live.started);
      const r = runInTerminal(w, ["forget"], "\x1b");
      expect(r.out).toContain("open now");
    } finally {
      live.stop();
    }
  });

  test("a Windows session open in Claude Code on Windows, from WSL: tasklist.exe says whether its process runs", () => {
    const w = world();
    const bin = path.join(w.home, "fake-bin");
    mkdirSync(bin, { recursive: true });
    const listed = path.join(w.home, "tasklist-pids");
    writeFileSync(path.join(bin, "tasklist.exe"), ["#!/bin/sh", `for p in $(cat "${listed}"); do printf '"node.exe","%s","Console","1","123,456 K"\\r\\n' "$p"; done`].join("\n"));
    chmodSync(path.join(bin, "tasklist.exe"), 0o755);
    register(path.join(w.users, "me", ".claude"), 4343, w.win.id, "999");
    const env = { PATH: `${bin}:${MINIMAL_PATH}` };
    writeFileSync(listed, "4 4343");
    const r = run(w, ["forget", "2222", "--yes"], { env });
    expect([r.code, r.err]).toEqual([1, "meme: 22222222 is open in Claude Code (Windows, process 4343). Close it there first. Nothing deleted.\n"]);
    writeFileSync(listed, "4 5000");
    expect(run(w, ["forget", "2222"], { env }).err).not.toContain("is open");
  });
});

describe.skipIf(process.platform !== "linux" || !Bun.which("flock"))("meme forget: Codex sessions open or not (plan §6 ⑧.4)", () => {
  const id = "c0dec0de-0000-4000-8000-0000000000cd";
  /** A Codex session written a minute ago, and the stand-in codex that deletes it. */
  function recentCodex(w: World) {
    mkdirSync(demoDir(w), { recursive: true });
    sampleCodex({ id, cwd: demoDir(w), start: new Date(Date.now() - 60_000).toISOString() }).write(path.join(w.home, ".codex"));
    return { PATH: `${fakeCodex(w)}:${MINIMAL_PATH}` };
  }
  const lockFile = (w: World) => path.join(w.home, ".codex", "thread-writer-locks", `${id}.lock`);

  test("its lock held by a running process (flock): refused, with that process", async () => {
    const w = world();
    const env = recentCodex(w);
    mkdirSync(path.dirname(lockFile(w)), { recursive: true });
    writeFileSync(lockFile(w), "");
    const holder = Bun.spawn(["flock", lockFile(w), "sleep", "60"], { stdin: "ignore", stdout: "ignore", stderr: "ignore" });
    try {
      for (let i = 0; i < 50 && !readFileSync("/proc/locks", "utf8").includes(` ${holder.pid} `); i++) await Bun.sleep(20);
      const r = run(w, ["forget", "c0de", "--yes"], { env });
      expect([r.code, r.err]).toEqual([1, `meme: c0dec0de is open in Codex (WSL, process ${holder.pid}). Close it there first. Nothing deleted.\n`]);
    } finally {
      holder.kill();
    }
  });

  test("its lock left behind by a killed Codex, nobody holding it: closed, deleted", () => {
    const w = world();
    const env = recentCodex(w);
    mkdirSync(path.dirname(lockFile(w)), { recursive: true });
    writeFileSync(lockFile(w), "");
    const r = run(w, ["forget", "c0de", "--yes"], { env });
    expect([r.code, r.err]).toEqual([0, ""]);
    expect(r.out).toContain("✓ c0dec0de deleted");
  });

  test("no lock for it while Codex keeps locks: closed; no lock folder at all (an older Codex): refused while recent", () => {
    const w = world();
    const env = recentCodex(w);
    expect(run(w, ["forget", "c0de", "--yes"], { env }).err).toContain("c0dec0de was written");
    mkdirSync(path.dirname(lockFile(w)), { recursive: true });
    expect(run(w, ["forget", "c0de", "--yes"], { env }).code).toBe(0);
  });
});

describe.skipIf(process.platform !== "linux")("meme forget: step 9 (plan §6 ⑨)", () => {
  test("R10, changed in ⑩.1: marked open where meme cannot check (a Windows Codex lock, seen from WSL): judged by its age", () => {
    const w = world();
    const id = "c0dec0de-0000-4000-8000-0000000000ce";
    sampleCodex({ id, cwd: "C:\\Users\\me\\work\\demo-app", start: "2026-09-01T08:00:00.000Z" }).write(path.join(w.users, "me", ".codex"));
    const locks = path.join(w.users, "me", ".codex", "thread-writer-locks");
    mkdirSync(locks, { recursive: true });
    writeFileSync(path.join(locks, `${id}.lock`), "");
    const bin = path.join(w.home, "win-bin");
    mkdirSync(bin, { recursive: true });
    writeFileSync(path.join(bin, "codex.exe"), readFileSync(path.join(fakeCodex(w), "codex"), "utf8").replace('"$HOME/.codex"', `"${w.users}"`));
    chmodSync(path.join(bin, "codex.exe"), 0o755);
    // Written in September: a lock left by a Codex that was killed; it goes as usual.
    const r = run(w, ["forget", "c0de", "--yes"], { env: { PATH: `${bin}:${MINIMAL_PATH}` } });
    expect([r.code, r.err]).toEqual([0, ""]);
    expect(r.out).toContain("✓ c0dec0de deleted");
  });

  test("R10, changed in ⑩.1: a Claude Code session on Windows whose process meme cannot check from WSL: refused while recent, saying where it can be checked", () => {
    const w = world();
    const recent = new ClaudeSession({ id: "23232323-0000-4000-8000-000000000023", cwd: "C:\\Users\\me\\work\\demo-app", start: new Date(Date.now() - 60_000).toISOString() });
    recent.user("still working");
    recent.assistant("on it");
    recent.write(path.join(w.users, "me", ".claude", "projects"));
    register(path.join(w.users, "me", ".claude"), 4343, recent.id, null);
    register(path.join(w.users, "me", ".claude"), 4344, w.win.id, null);
    // No tasklist.exe anywhere WSL could find it: not on the PATH, and the drives mounted where there are none.
    writeFileSync(path.join(w.home, "wsl.conf"), `[automount]\nroot = ${w.home}/no-drives/\n`);
    const env = { PATH: MINIMAL_PATH, MEME_WSL_CONF: path.join(w.home, "wsl.conf") };
    const r = run(w, ["forget", "2323", "--yes"], { env });
    expect(r.err).toMatch(/^meme: 23232323 was written .* ago and may still be open in Claude Code; you can delete it after \d\d:\d\d \(or run `meme forget 23232323` on Windows, where meme can check\)\. Nothing deleted\.\n$/);
    // The one written in September goes.
    expect(run(w, ["forget", "2222", "--yes"], { env }).out).toContain("✓ 22222222 deleted");
  });

  test("R19: a session opened while the user was answering [y/N] is not deleted", async () => {
    if (!SCRIPT) return;
    const w = world();
    const quote = (x: string) => `'${x.replace(/'/g, `'\\''`)}'`;
    const bin = process.env.MEME_BIN ? [path.resolve(process.env.MEME_BIN)] : [process.execPath, path.resolve(import.meta.dir, "../../src/cli/main.ts")];
    const p = Bun.spawn([SCRIPT, "-qec", [...bin, "forget", "1111"].map(quote).join(" "), "/dev/null"], {
      cwd: w.home,
      env: { PATH: process.env.PATH ?? "", HOME: w.home, USERPROFILE: w.home, MEME_ENV: "wsl", MEME_WINDOWS_USERS_DIR: w.users, TZ: "UTC", TERM: "dumb", BUN_RUNTIME_TRANSPILER_CACHE_PATH: "0" },
      stdin: "pipe",
      stdout: "pipe",
    });
    const reader = p.stdout.getReader();
    let out = "";
    while (!out.includes("[y/N]")) out += new TextDecoder().decode((await reader.read()).value);
    const live = liveProcess();
    try {
      register(claudeHome(w), live.pid, w.wsl.id, live.started);
      p.stdin.write("y\n");
      p.stdin.end();
      for (;;) {
        const chunk = await reader.read();
        if (chunk.done) break;
        out += new TextDecoder().decode(chunk.value);
      }
      await p.exited;
    } finally {
      live.stop();
    }
    expect(out).toContain(`11111111 is open in Claude Code (WSL, process ${live.pid})`);
    expect(out).not.toContain("deleted\r\n✓");
    expect(run(w, ["ls", "-a", "--plain"]).out).toContain("11111111");
  });

  test("R20: --yes does not ask, in a terminal too", () => {
    if (!SCRIPT) return;
    const w = world();
    const r = runInTerminal(w, ["forget", "1111", "--yes"], "");
    expect(r.out).not.toContain("[y/N]");
    expect(r.out).toMatch(/✓\S* 11111111 deleted/);
  });

  test("forget: Enter alone deletes nothing, in a terminal", () => {
    if (!SCRIPT) return;
    const w = world();
    const r = runInTerminal(w, ["forget", "1111"], "\n");
    expect(r.out).toContain("Delete this session? [y/N]");
    expect(r.out).toContain("Nothing deleted.");
    expect(run(w, ["ls", "-a", "--plain"]).out).toContain("11111111");
  });
});

describe.skipIf(process.platform === "win32")("meme forget: what Claude Code keeps elsewhere (plan §6 ⑨, R29)", () => {
  test("its background job folder goes too, only when the job is this session's; its input history is named", () => {
    const w = world();
    const short = w.wsl.id.slice(0, 8);
    const job = path.join(claudeHome(w), "jobs", short);
    mkdirSync(job, { recursive: true });
    writeFileSync(path.join(job, "state.json"), JSON.stringify({ sessionId: w.wsl.id, state: "done" }));
    writeFileSync(path.join(job, "timeline.jsonl"), '{"text":"what the job did"}\n');
    const other = path.join(claudeHome(w), "jobs", "22222222");
    mkdirSync(other, { recursive: true });
    writeFileSync(path.join(other, "state.json"), JSON.stringify({ sessionId: "22222222-ffff-4000-8000-000000000000" }));
    const r = run(w, ["forget", "1111", "--yes"]);
    expect(r.code).toBe(0);
    expect(r.out).toContain(`~/.claude/jobs/${short}/`);
    expect(r.out).toContain("Claude Code keeps what you typed in its own input history (~/.claude/history.jsonl).");
    expect(existsSync(job)).toBe(false);
    expect(existsSync(other)).toBe(true);
    expect(run(w, ["forget", "2222", "--yes"]).out).not.toContain("jobs/");
  });
});

describe.skipIf(process.platform !== "linux")("meme forget: step 11 (plan §6 ⑪)", () => {
  test("F18: a Windows session ahead of this clock, which meme cannot check from here, is not deleted", () => {
    const w = world();
    const ahead = new ClaudeSession({ id: "24242424-0000-4000-8000-000000000024", cwd: "C:\\Users\\me\\work\\demo-app", start: new Date(Date.now() + 2 * 3_600_000).toISOString() });
    ahead.user("still working");
    ahead.assistant("on it");
    ahead.write(path.join(w.users, "me", ".claude", "projects"));
    register(path.join(w.users, "me", ".claude"), 4545, ahead.id, null);
    writeFileSync(path.join(w.home, "wsl.conf"), `[automount]\nroot = ${w.home}/no-drives/\n`);
    const env = { PATH: MINIMAL_PATH, MEME_WSL_CONF: path.join(w.home, "wsl.conf") };
    const r = run(w, ["forget", "2424", "--yes"], { env });
    expect(r.err).toMatch(/^meme: 24242424 was written 2 hours ahead of this clock and may still be open in Claude Code; you can delete it after \d\d:\d\d .*Nothing deleted\.\n$/);
    const handoff = run(w, ["continue", "2424"], { env }).out;
    expect(handoff).toContain("Warning: the session was active 2 hours ahead of this clock; it may still be running in another window.");
    expect(run(w, ["ls", "-a"], { env }).out).toMatch(/ 24242424 +Claude·Win +2h ahead /);
  });
});
