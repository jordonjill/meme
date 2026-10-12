/** End to end: continue, install and uninstall in a temporary HOME. */
import { describe, expect, test } from "bun:test";
import { chmodSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { ClaudeSession } from "../fixtures/gen-claude";
import { run, runInTerminal, SCRIPT, world, type World } from "./world";

/** A stand-in program on a PATH of its own. */
function fakeBin(w: World, name: string, body: string): string {
  const bin = path.join(w.home, "fake-bin");
  mkdirSync(bin, { recursive: true });
  const file = path.join(bin, name);
  writeFileSync(file, `#!/bin/sh\n${body}\n`);
  chmodSync(file, 0o755);
  return bin;
}

const MINIMAL_PATH = "/usr/bin:/bin";
const demoDir = (w: World) => path.join(w.home, "work", "demo");
const projects = (w: World) => path.join(w.home, ".claude", "projects");

const CURRENT = "11111111-0000-4000-8000-000000000001";

/** Two more sessions in ~/work/demo, so lists and targets have something to choose from. */
function moreSessions(w: World) {
  const older = new ClaudeSession({ id: "55555555-0000-4000-8000-000000000005", cwd: demoDir(w), start: "2026-09-01T08:00:00.000Z" });
  older.user("set up the build");
  older.assistant("The build is set up.");
  older.aiTitle("Build setup");
  older.write(projects(w));
  const newer = new ClaudeSession({ id: "66666666-0000-4000-8000-000000000006", cwd: demoDir(w), start: "2026-10-05T08:00:00.000Z" });
  newer.user("fix the flaky login test");
  newer.assistant("Fixed the login test.");
  newer.aiTitle("Flaky login test");
  newer.write(projects(w));
  return { older, newer };
}

describe.skipIf(process.platform === "win32")("meme continue in an agent (output is not a terminal)", () => {
  test("without a target: a numbered list of this project's recent sessions", () => {
    const w = world();
    mkdirSync(demoDir(w), { recursive: true });
    const r = run(w, ["continue"], { cwd: demoDir(w) });
    expect(r.code).toBe(0);
    const lines = r.out.split("\n");
    expect(lines[0]).toBe("Sessions in ~/work/demo (newest first):");
    expect(lines[1]).toMatch(/^ {2}1 {2}Claude·WSL {2}\S+ ago {2}Status line setup {2}11111111$/);
    expect(r.out).toEndWith("+1 session in other projects (meme continue -a)\nThis list is for the user. Ask which one to continue and wait; do not pick one yourself. The user can also type: ! meme continue <number>\n");
    const all = run(w, ["continue", "-a"], { cwd: demoDir(w) });
    expect(all.out).toStartWith("Sessions in all projects (newest first):\n");
    expect(all.out).toContain("22222222");
    expect(all.out).toEndWith("This list is for the user. Ask which one to continue and wait; do not pick one yourself. The user can also type: ! meme continue -a <number>\n");
  });

  test("a number is counted again the same way: the n-th session of the same list", () => {
    const w = world();
    mkdirSync(demoDir(w), { recursive: true });
    moreSessions(w);
    const list = run(w, ["continue"], { cwd: demoDir(w) });
    expect(list.out.split("\n").slice(1, 4).map((l) => l.slice(-8))).toEqual(["66666666", "11111111", "55555555"]);
    const two = run(w, ["continue", "2"], { cwd: demoDir(w) });
    expect(two.out).toStartWith("# Handoff: Status line setup\n");
    expect(existsSync(path.join(w.home, ".meme", "lists.json"))).toBe(false);
    const nine = run(w, ["continue", "9"], { cwd: demoDir(w) });
    expect(nine.out).toStartWith("meme: there is no number 9 in the list. Pick from the list instead:\n");
  });

  test("in Claude Code the agent is told to run the user's choice itself; elsewhere only the user runs it", () => {
    const w = world();
    mkdirSync(demoDir(w), { recursive: true });
    const last = (env: Record<string, string>) => run(w, ["continue"], { cwd: demoDir(w), env }).out.trimEnd().split("\n").at(-1);
    expect(last({ CLAUDECODE: "1" })).toBe(
      "This list is for the user. Ask which one to continue and wait; do not pick one yourself. When the user has chosen, run `meme continue <number>` yourself. The user can also type: ! meme continue <number>",
    );
    const plainLine = "This list is for the user. Ask which one to continue and wait; do not pick one yourself. The user can also type: ! meme continue <number>";
    expect(last({ CODEX_THREAD_ID: "c0dec0de-0000-4000-8000-000000000001" })).toBe(plainLine);
    // Codex started inside Claude Code: the inner agent is Codex.
    expect(last({ CLAUDECODE: "1", CODEX_THREAD_ID: "c0dec0de-0000-4000-8000-000000000001" })).toBe(plainLine);
  });

  test("the session that runs meme is not listed, by continue or by ls", () => {
    const w = world();
    mkdirSync(demoDir(w), { recursive: true });
    for (const args of [["continue"], ["ls"]]) {
      const r = run(w, args, { cwd: demoDir(w), env: { CLAUDE_CODE_SESSION_ID: CURRENT } });
      expect(r.out.split("\n")[0]).toBe("No sessions in ~/work/demo — showing all projects");
      expect(r.out).toContain("22222222");
      expect(r.out).not.toContain("11111111");
    }
  });

  test("targets: last, an environment, an id, a title word; several matches are listed", () => {
    const w = world();
    mkdirSync(demoDir(w), { recursive: true });
    moreSessions(w);
    const head = (args: string[], env: Record<string, string> = {}) => run(w, ["continue", ...args], { cwd: demoDir(w), env }).out.split("\n")[0];
    expect(head(["last"])).toBe("# Handoff: Flaky login test");
    // `last` skips the session that is asking.
    expect(head(["last"], { CLAUDE_CODE_SESSION_ID: "66666666-0000-4000-8000-000000000006" })).toBe("# Handoff: Status line setup");
    // No Windows session here, so the other projects are searched.
    expect(head(["win"])).toBe("# Handoff: 仓库概览");
    expect(head(["5555"])).toBe("# Handoff: Build setup");
    expect(head(["flaky"])).toBe("# Handoff: Flaky login test");
    expect(head(["仓库"])).toBe("# Handoff: 仓库概览");
    const many = run(w, ["continue", "claude"], { cwd: demoDir(w) });
    expect(many.out).toStartWith('Sessions matching "claude" (newest first):\n');
    // Matches are named by id: a number would be counted against the plain list.
    expect(many.out.split("\n")[1]).toMatch(/^ {2}Claude·WSL /);
    expect(many.out).toEndWith("This list is for the user. Ask which one to continue and wait; do not pick one yourself. The user can also type: ! meme continue <id>\n");
    const none = run(w, ["continue", "codex"], { cwd: demoDir(w) });
    expect(none.out).toStartWith('meme: no session matches "codex". Pick from the list instead:\nSessions in ~/work/demo');
  });

  test("with a target: the handoff goes to stdout and nothing is written", () => {
    const w = world();
    const r = run(w, ["continue", "1111"]);
    expect(r.code).toBe(0);
    expect(r.out).toStartWith("# Handoff: Status line setup\nSource: Claude·WSL · session 11111111 · ");
    expect(r.out).toContain("Before you change anything, tell the user in two or three sentences");
    expect(existsSync(path.join(w.home, ".meme", "handoffs"))).toBe(false);
  });

  test("a long session's handoff stays within 25,000 characters, so Claude Code shows all of it", () => {
    const w = world();
    const long = new ClaudeSession({ id: "88888888-0000-4000-8000-000000000008", cwd: demoDir(w) });
    for (let i = 1; i <= 120; i++) {
      long.user(`step ${i}: ` + "please keep working on the importer and explain what changed ".repeat(6));
      long.assistant("Done. " + "The importer now handles another case. ".repeat(20));
    }
    long.write(projects(w));
    const r = run(w, ["continue", "8888"]);
    expect(r.out.length).toBeLessThanOrEqual(25_000);
    expect(r.out).toContain("\n1. step 1: ");
    expect(r.out).toContain("\n120. step 120: ");
    expect(r.out).toMatch(/messages left out \(turns \d+–\d+\); find them with `meme search/);
  });

  test("a continued session is handed over as the newest one of its chain", () => {
    const w = world();
    const a = new ClaudeSession({ id: "33333333-0000-4000-8000-000000000003", cwd: demoDir(w), start: "2026-10-01T08:00:00.000Z" });
    a.user("first part");
    a.assistant("done with the first part");
    const b = new ClaudeSession({ id: "44444444-0000-4000-8000-000000000004", cwd: demoDir(w), start: "2026-10-01T09:00:00.000Z" });
    a.resumeInto(b);
    b.user("second part");
    b.assistant("done with the second part");
    a.write(projects(w));
    b.write(projects(w));
    const r = run(w, ["continue", "33333333"]);
    expect(r.err).toBe("meme: 33333333 was continued in 44444444; handing over 44444444, which includes it\n");
    expect(r.out).toContain("· session 44444444 ·");
    expect(r.out).toContain("1. first part\n2. second part\n");
  });

  test("--fresh carries only the user's messages", () => {
    const w = world();
    const r = run(w, ["continue", "1111", "--fresh"]);
    expect(r.out).toContain("Start fresh");
    expect(r.out).not.toContain("## Last");
  });

  test("--in needs a terminal; --in codex is not there yet; there is no --edit", () => {
    const w = world();
    expect(run(w, ["continue", "1111", "--in", "claude"]).err).toContain("--in starts an agent, which needs a terminal");
    expect(run(w, ["continue", "1111", "--in", "claude"]).code).toBe(2);
    expect(run(w, ["continue", "1111", "--in", "codex"]).code).toBe(2);
    expect(run(w, ["continue", "1111", "--edit"]).code).toBe(2);
  });
});

describe.skipIf(process.platform === "win32")("meme continue at a terminal", () => {
  /** A fake `claude` that records where it started and its arguments. */
  function fakeClaude(w: World) {
    const record = path.join(w.home, "claude-was-called");
    const bin = fakeBin(w, "claude", [`pwd > "${record}.cwd"`, `for a in "$@"; do printf '%s\\n' "$a"; done > "${record}.args"`, "exit 7"].join("\n"));
    const read = (ext: string) => readFileSync(`${record}.${ext}`, "utf8");
    return { bin, cwd: () => read("cwd").trim(), args: () => read("args").trimEnd().split("\n") };
  }
  const terminal = (bin: string, extra: Record<string, string> = {}) => ({ PATH: `${bin}:${MINIMAL_PATH}`, MEME_TERMINAL: "1", ...extra });

  test("starts Claude Code in the project and asks it to fetch the handoff itself, with meme allowed", () => {
    const w = world();
    mkdirSync(demoDir(w), { recursive: true });
    const claude = fakeClaude(w);
    const r = run(w, ["continue", "1111", "--in", "claude"], { env: terminal(claude.bin) });
    expect(r.code).toBe(7);
    expect(r.out).toBe("Continuing 11111111 (Status line setup) in Claude Code, in ~/work/demo\n");
    expect(claude.cwd()).toBe(demoDir(w));
    expect(claude.args()).toEqual([
      "Continue an earlier session: run `meme continue 11111111` and follow the instructions at the top of its output.",
      "--allowedTools",
      "Bash(meme:*)",
    ]);
    // What the new session gets when it runs that command: the handoff, and no file anywhere.
    expect(run(w, ["continue", "11111111"]).out).toStartWith("# Handoff: Status line setup\n");
    expect(existsSync(path.join(w.home, ".meme", "handoffs"))).toBe(false);
  });

  test("--fresh is passed on to the command the new session runs", () => {
    const w = world();
    mkdirSync(demoDir(w), { recursive: true });
    const claude = fakeClaude(w);
    run(w, ["continue", "1111", "--in", "claude", "--fresh"], { env: terminal(claude.bin) });
    expect(claude.args()[0]).toContain("run `meme continue 11111111 --fresh`");
  });

  test("without the agent on PATH it says so", () => {
    const w = world();
    mkdirSync(demoDir(w), { recursive: true });
    const r = run(w, ["continue", "1111", "--in", "claude"], { env: { PATH: MINIMAL_PATH, MEME_TERMINAL: "1" } });
    expect(r.code).toBe(1);
    expect(r.err).toBe("meme: no agent to continue in: Claude Code (`claude`) not found on PATH\n");
  });

  test("choosing a session or an agent needs a real terminal", () => {
    const w = world();
    const claude = fakeClaude(w);
    const r = run(w, ["continue", "1111"], { env: terminal(claude.bin) });
    expect([r.code, r.err]).toEqual([2, "meme continue: choosing needs a terminal; name the session and add --in claude|codex\nRun `meme continue --help` for usage.\n"]);
  });
});

describe.skipIf(process.platform === "win32")("meme install and uninstall", () => {
  test("install mirrors the sessions and shows both ways to continue; it writes nothing outside ~/.meme", () => {
    const w = world();
    const claude = fakeBin(w, "claude", "exit 0");
    const r = run(w, ["install"], { env: { PATH: `${claude}:${MINIMAL_PATH}` } });
    expect(r.code).toBe(0);
    expect(r.out).toMatch(/\n {2}Claude Code {2}found: .*fake-bin\/claude\n/);
    expect(r.out).toMatch(/Claude·WSL +~\/\.claude\/projects +1 session/);
    expect(r.out).toContain("mirrored 2 sessions into ~/.meme/meme.sqlite");
    expect(r.out).toContain("In a terminal:   meme continue");
    expect(r.out).toContain("In Claude Code:  ! meme continue");
    expect(existsSync(path.join(w.home, ".claude", "skills"))).toBe(false);
    expect(existsSync(path.join(w.home, ".agents"))).toBe(false);
    expect(run(w, ["install"]).code).toBe(0);
  });

  test("--dry-run changes nothing", () => {
    const w = world();
    const r = run(w, ["install", "--dry-run"]);
    expect(r.out).toContain("(dry run: nothing is changed)");
    expect(r.out).toMatch(/Claude·Win +.*mnt-c-Users\/me\/\.claude\/projects +1 session file/);
    expect(existsSync(path.join(w.home, ".meme"))).toBe(false);
  });

  test("uninstall asks first, then removes ~/.meme but no session", () => {
    const w = world();
    run(w, ["install"]);
    const asked = run(w, ["uninstall"]);
    expect(asked.code).toBe(1);
    expect(asked.out).toContain("  ~/.meme   the mirror and the logs (");
    expect(asked.out).toContain("Your original sessions are not touched.");
    expect(asked.err).toBe("meme: nothing removed; run `meme uninstall --yes` to go ahead\n");
    expect(existsSync(path.join(w.home, ".meme"))).toBe(true);
    const done = run(w, ["uninstall", "--yes"]);
    expect(done.code).toBe(0);
    expect(done.out).toContain("Removed.");
    expect(existsSync(path.join(w.home, ".meme"))).toBe(false);
    expect(readdirSync(projects(w)).length).toBe(1);
    expect(run(w, ["uninstall", "--yes"]).out).toStartWith("Nothing to remove");
  });

  test.skipIf(!SCRIPT)("in a terminal, uninstall asks [y/N] like forget: Enter alone keeps everything", () => {
    const w = world();
    run(w, ["install"]);
    const kept = runInTerminal(w, ["uninstall"], "\n");
    expect(kept.out).toContain("Remove them? [y/N] ");
    expect(kept.out).not.toContain("[y/N]  ");
    expect(kept.out).toContain("Nothing removed.");
    expect(kept.code).toBe(1);
    expect(existsSync(path.join(w.home, ".meme"))).toBe(true);
    expect(runInTerminal(w, ["uninstall"], "n\n").code).toBe(1);
    expect(existsSync(path.join(w.home, ".meme"))).toBe(true);
    expect(runInTerminal(w, ["uninstall"], "y\n").code).toBe(0);
    expect(existsSync(path.join(w.home, ".meme"))).toBe(false);
    // "yes", the word uninstall asked for before, still works.
    run(w, ["install"]);
    const yes = runInTerminal(w, ["uninstall"], "yes\n");
    expect(yes.out).toContain("Removed.");
    expect(yes.code).toBe(0);
    expect(existsSync(path.join(w.home, ".meme"))).toBe(false);
    expect(readdirSync(projects(w)).length).toBe(1);
  });
});
