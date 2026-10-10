/** End to end: continue, install and uninstall in a temporary HOME. */
import { describe, expect, test } from "bun:test";
import { chmodSync, existsSync, mkdirSync, readdirSync, readFileSync, utimesSync, writeFileSync } from "node:fs";
import path from "node:path";
import { ClaudeSession } from "../fixtures/gen-claude";
import { run, world, type World } from "./world";

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
const skillFile = (w: World) => path.join(w.home, ".claude", "skills", "meme", "SKILL.md");

const CURRENT = "11111111-0000-4000-8000-000000000001";

describe.skipIf(process.platform === "win32")("meme continue in an agent (output is not a terminal)", () => {
  test("without a session: the recent sessions of this project", () => {
    const w = world();
    mkdirSync(demoDir(w), { recursive: true });
    const r = run(w, ["continue"], { cwd: demoDir(w) });
    expect(r.code).toBe(0);
    expect(r.out).toContain("Sessions in ~/work/demo (newest first):");
    expect(r.out).toContain("11111111");
    expect(r.out).not.toContain("22222222");
    expect(r.out).toEndWith("+1 session in other projects (use -a)\nRun `meme continue <id>` to print the handoff for one.\n");
    const all = run(w, ["continue", "-a"], { cwd: demoDir(w) });
    expect(all.out).toStartWith("Sessions in all projects (newest first):\n");
    expect(all.out).toContain("22222222");
    expect(all.out).not.toContain("in other projects");
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

  test("with a session: the handoff goes to stdout and nothing is written", () => {
    const w = world();
    const r = run(w, ["continue", "1111"]);
    expect(r.code).toBe(0);
    expect(r.out).toStartWith("# Handoff: Status line setup\nSource: CC·WSL · session 11111111 · ");
    expect(r.out).toContain("## User messages (all)\n1. /statusline\n");
    expect(existsSync(path.join(w.home, ".meme", "handoffs"))).toBe(false);
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
    a.write(path.join(w.home, ".claude", "projects"));
    b.write(path.join(w.home, ".claude", "projects"));
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

  test("--in and --edit need a terminal; --in codex is not there yet", () => {
    const w = world();
    expect(run(w, ["continue", "1111", "--in", "claude"]).err).toContain("--in and --edit start an agent, which needs a terminal");
    expect(run(w, ["continue", "1111", "--in", "claude"]).code).toBe(2);
    expect(run(w, ["continue", "1111", "--edit"]).code).toBe(2);
    expect(run(w, ["continue", "1111", "--in", "codex"]).code).toBe(2);
  });
});

describe.skipIf(process.platform === "win32")("meme continue at a terminal", () => {
  /** A fake `claude` that records where it started and the handoff its first message points at. */
  function fakeClaude(w: World) {
    const record = path.join(w.home, "claude-was-called");
    const bin = fakeBin(
      w,
      "claude",
      [
        `pwd > "${record}.cwd"`,
        `printf '%s' "$1" > "${record}.msg"`,
        `f=$(printf '%s' "$1" | sed -n 's/.*Read \\(.*\\.md\\) first.*/\\1/p')`,
        `cat "$f" > "${record}.handoff"`,
        "exit 7",
      ].join("\n"),
    );
    const read = (ext: string) => readFileSync(`${record}.${ext}`, "utf8");
    return { bin, cwd: () => read("cwd").trim(), message: () => read("msg"), handoff: () => read("handoff") };
  }
  const terminal = (bin: string, extra: Record<string, string> = {}) => ({ PATH: `${bin}:${MINIMAL_PATH}`, MEME_TERMINAL: "1", ...extra });

  test("writes the handoff file and starts the agent in the project, pointing at it", () => {
    const w = world();
    mkdirSync(demoDir(w), { recursive: true });
    const claude = fakeClaude(w);
    const r = run(w, ["continue", "1111", "--in", "claude"], { env: terminal(claude.bin) });
    expect(r.code).toBe(7);
    expect(r.out).toMatch(/^Continuing 11111111 \(Status line setup\) in Claude Code, in ~\/work\/demo\nHandoff: ~\/\.meme\/handoffs\/11111111-\d{8}-\d{4}\.md\n$/);
    expect(claude.cwd()).toBe(demoDir(w));
    expect(claude.message()).toMatch(
      new RegExp(`^This session was handed over from Claude Code \\(session 11111111, CC·WSL\\)\\. Read ${w.home}/\\.meme/handoffs/11111111-\\d{8}-\\d{4}\\.md first\\. Then tell me .* wait for my go-ahead\\.$`),
    );
    expect(claude.message().length).toBeLessThan(400);
    expect(claude.handoff()).toStartWith("# Handoff: Status line setup\n");
  });

  test("without the agent on PATH, nothing is written", () => {
    const w = world();
    mkdirSync(demoDir(w), { recursive: true });
    const r = run(w, ["continue", "1111", "--in", "claude"], { env: { PATH: MINIMAL_PATH, MEME_TERMINAL: "1" } });
    expect(r.code).toBe(1);
    expect(r.err).toBe("meme: no agent to continue in: Claude Code (`claude`) not found on PATH\n");
    expect(existsSync(path.join(w.home, ".meme", "handoffs"))).toBe(false);
  });

  test("--edit opens the handoff in $EDITOR before the agent reads it", () => {
    const w = world();
    mkdirSync(demoDir(w), { recursive: true });
    const claude = fakeClaude(w);
    const editor = path.join(fakeBin(w, "fake-editor", `echo "NOTE ADDED IN THE EDITOR" >> "$1"`), "fake-editor");
    const r = run(w, ["continue", "1111", "--in", "claude", "--edit"], { env: terminal(claude.bin, { EDITOR: editor }) });
    expect(r.code).toBe(7);
    expect(claude.handoff()).toEndWith("NOTE ADDED IN THE EDITOR\n");
  });

  test("choosing a session or an agent needs a real terminal", () => {
    const w = world();
    const claude = fakeClaude(w);
    const r = run(w, ["continue", "1111"], { env: terminal(claude.bin) });
    expect([r.code, r.err]).toEqual([2, "meme continue: choosing needs a terminal; name the session and add --in claude\nRun `meme continue --help` for usage.\n"]);
  });

  test("handoff files older than 7 days are deleted on the next run", () => {
    const w = world();
    const dir = path.join(w.home, ".meme", "handoffs");
    mkdirSync(dir, { recursive: true });
    const old = path.join(dir, "aaaaaaaa-20260901-1000.md");
    const recent = path.join(dir, "bbbbbbbb-20261007-1000.md");
    writeFileSync(old, "old");
    writeFileSync(recent, "recent");
    const eightDaysAgo = (Date.now() - 8 * 86_400_000) / 1000;
    utimesSync(old, eightDaysAgo, eightDaysAgo);
    run(w, ["ls"]);
    expect(existsSync(old)).toBe(false);
    expect(existsSync(recent)).toBe(true);
  });
});

describe.skipIf(process.platform === "win32")("meme install and uninstall", () => {
  test("install puts the skill in place and mirrors the sessions; running it again changes nothing", () => {
    const w = world();
    const first = run(w, ["install"]);
    expect(first.code).toBe(0);
    expect(first.out).toContain("  Claude Code  skill added: ~/.claude/skills/meme/SKILL.md\n");
    expect(first.out).toMatch(/CC·WSL +~\/\.claude\/projects +1 session/);
    expect(first.out).toContain("mirrored 2 sessions into ~/.meme/meme.sqlite");
    const skill = readFileSync(skillFile(w), "utf8");
    expect(skill).toStartWith("---\nname: meme\n");
    expect(skill).toContain("<!-- meme-skill v1 -->");
    const again = run(w, ["install"]);
    expect(again.out).toContain("  Claude Code  skill up to date: ~/.claude/skills/meme/SKILL.md\n");
    expect(readFileSync(skillFile(w), "utf8")).toBe(skill);
    // An older meme skill is updated.
    writeFileSync(skillFile(w), "---\nname: meme\n---\n<!-- meme-skill v0 -->\nold\n");
    expect(run(w, ["install"]).out).toContain("skill updated:");
    expect(readFileSync(skillFile(w), "utf8")).toBe(skill);
  });

  test("a skill folder named meme that meme did not create is left alone", () => {
    const w = world();
    mkdirSync(path.dirname(skillFile(w)), { recursive: true });
    writeFileSync(skillFile(w), "---\nname: meme\n---\nsomeone else's skill\n");
    expect(run(w, ["install"]).out).toContain("skipped: ~/.claude/skills/meme exists and was not put there by meme");
    const un = run(w, ["uninstall", "--yes"]);
    expect(un.out).toContain("Left alone: ~/.claude/skills/meme (not put there by meme)");
    expect(readFileSync(skillFile(w), "utf8")).toBe("---\nname: meme\n---\nsomeone else's skill\n");
  });

  test("--dry-run changes nothing", () => {
    const w = world();
    const r = run(w, ["install", "--dry-run"]);
    expect(r.out).toContain("(dry run: nothing is changed)");
    expect(r.out).toContain("skill would add: ~/.claude/skills/meme/SKILL.md");
    expect(r.out).toMatch(/CC·Win +.*mnt-c-Users\/me\/\.claude\/projects +1 session file/);
    expect(existsSync(path.join(w.home, ".meme"))).toBe(false);
    expect(existsSync(skillFile(w))).toBe(false);
  });

  test("uninstall asks first, then removes the skill and ~/.meme but no session", () => {
    const w = world();
    run(w, ["install"]);
    const asked = run(w, ["uninstall"]);
    expect(asked.code).toBe(1);
    expect(asked.out).toContain("  ~/.claude/skills/meme/SKILL.md   the meme skill\n");
    expect(asked.out).toContain("Your original sessions are not touched.");
    expect(asked.err).toBe("meme: nothing removed; run `meme uninstall --yes` to go ahead\n");
    expect(existsSync(skillFile(w))).toBe(true);
    const done = run(w, ["uninstall", "--yes"]);
    expect(done.code).toBe(0);
    expect(done.out).toContain("Removed.");
    expect(existsSync(path.join(w.home, ".claude", "skills", "meme"))).toBe(false);
    expect(existsSync(path.join(w.home, ".meme"))).toBe(false);
    expect(readdirSync(path.join(w.home, ".claude", "projects")).length).toBe(1);
    expect(run(w, ["uninstall", "--yes"]).out).toStartWith("Nothing to remove");
  });
});
