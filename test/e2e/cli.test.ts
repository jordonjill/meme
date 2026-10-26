/** End to end: ls, show, search and status (see world.ts for the setup). */
import { describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync } from "node:fs";
import path from "node:path";
import { ClaudeSession } from "../fixtures/gen-claude";
import { OpenCodeDb, resetOpenCodeIds, sampleOpenCode } from "../fixtures/gen-opencode";
import { run, world } from "./world";

describe("meme CLI", () => {
  test("ls -a lists WSL and Windows sessions with their labels", () => {
    const w = world();
    const r = run(w, ["ls", "-a"]);
    expect(r.err).toBe("");
    expect(r.code).toBe(0);
    expect(r.out).toContain("Sessions in all projects (newest first):");
    expect(r.out).toMatch(/11111111 {2}Claude·WSL .*Status line setup/);
    expect(r.out).toMatch(/22222222 {2}Claude·Win .*\/mnt\/c\/Users\/me\/work\/demo-app .*仓库概览/);
  });

  test("ls in a project directory shows only that project", () => {
    const w = world();
    const r = run(w, ["ls"], { cwd: w.home });
    expect(r.out.split("\n")[0]).toBe("No sessions in ~ — showing all projects");
    expect(r.out).toContain("11111111");
    expect(r.out).toContain("22222222");
    const dir = path.join(w.home, "work", "demo");
    require("node:fs").mkdirSync(dir, { recursive: true });
    const r2 = run(w, ["ls", "--plain"], { cwd: dir });
    expect(r2.out).toContain("Sessions in ~/work/demo (newest first):");
    expect(r2.out).toContain("11111111");
    expect(r2.out).not.toContain("22222222");
  });

  test("show folds turns, expands one, and reports bad turns", () => {
    const w = world();
    const r = run(w, ["show", "2222"]);
    expect(r.code).toBe(0);
    expect(r.out.split("\n").slice(0, 4)).toEqual([
      "仓库概览  [Claude·Win]",
      expect.stringMatching(/^\/mnt\/c\/Users\/me\/work\/demo-app · main · 09-18 06:56 → 06:56 · 1 turn · \d+KB$/),
      "  1 ❯ 看一下这个仓库，说说它是做什么的",
      "      ▸ 1 step · 1 command",
    ]);
    const one = run(w, ["show", "2222", "1"]);
    expect(one.out).toContain("      ● PowerShell  Get-ChildItem -Force\n");
    const bad = run(w, ["show", "2222", "5"]);
    expect([bad.code, bad.err]).toEqual([1, "meme: session 22222222 has 1 turn; there is no turn 5\n"]);
    const none = run(w, ["show", "3333"]);
    expect([none.code, none.err]).toEqual([1, "meme: no session matches 3333\n"]);
  });

  test("search finds a two-character Chinese word across environments", () => {
    const w = world();
    const r = run(w, ["search", "接力", "-a"]);
    expect(r.code).toBe(0);
    expect(r.out).toContain("2 matches in 2 sessions\n");
    expect(r.out).toContain("→ meme show 22222222 1");
    expect(r.out).toContain("→ meme show 11111111 2");
  });

  test("search: the current project by default, all projects when it has none, and a count of the others", () => {
    const w = world();
    const demo = path.join(w.home, "work", "demo");
    mkdirSync(demo, { recursive: true });
    // ~ has no sessions: all projects are searched, and it says so.
    const fallback = run(w, ["search", "接力"]);
    expect(fallback.out).toStartWith("No sessions in ~ — searching all projects\n2 matches in 2 sessions\n");
    // Only in another project: none here, and how many there are elsewhere.
    const none = run(w, ["search", "这个仓库"], { cwd: demo });
    expect(none.out).toBe("No matches in ~/work/demo; 1 match in 1 session in other projects (use -a)\n");
    // Here and elsewhere: this project's matches, then the count of the rest.
    const both = run(w, ["search", "接力"], { cwd: demo });
    expect(both.out).toStartWith("1 match in 1 session\n");
    expect(both.out).toEndWith("\n\n+1 match in 1 session in other projects (use -a)\n");
    expect(both.out).not.toContain("22222222");
  });

  test("status names both sources", () => {
    const w = world();
    const r = run(w, ["status"]);
    expect(r.out).toContain("Mode:         read-write");
    expect(r.out).toContain("Mirror:       2 sessions");
    expect(r.out).toMatch(/Claude·WSL +~\/\.claude\/projects +readable +1 session/);
    expect(r.out).toMatch(/Claude·Win +.*mnt-c-Users\/me\/\.claude\/projects +readable +1 session/);
  });

  test("an agent not installed, or installed with no sessions yet, is said so and not logged on every run (plan §6 ⑧.3, ⑨ R9)", () => {
    const w = world();
    const log = path.join(w.home, ".meme", "logs", "meme.log");
    const r = run(w, ["status"]);
    expect(r.out).toMatch(/Codex·WSL +~\/\.codex +not installed +0 sessions\n/);
    expect(readFileSync(log, "utf8")).not.toContain("source unreachable");
    expect(run(w, ["install", "--dry-run"]).out).toMatch(/Codex·WSL +~\/\.codex +not installed\n/);
    // Just installed: its home is there, its sessions folder not yet.
    mkdirSync(path.join(w.home, ".codex"));
    expect(run(w, ["status"]).out).toMatch(/Codex·WSL +~\/\.codex +no sessions yet +0 sessions\n/);
    expect(run(w, ["install", "--dry-run"]).out).toMatch(/Codex·WSL +~\/\.codex +no sessions yet\n/);
    expect(readFileSync(log, "utf8")).not.toContain("source unreachable");
    // Sessions mirrored, then the folder that held them cannot be read: something is wrong, nothing is deleted.
    const projects = path.join(w.home, ".claude", "projects");
    renameSync(projects, projects + ".away");
    expect(run(w, ["status"]).out).toMatch(/Claude·WSL +~\/\.claude\/projects +NOT READABLE \(nothing deleted\) +1 session\n/);
    expect(readFileSync(log, "utf8")).toContain("source unreachable, nothing deleted: " + projects);
  });

  test("a slow run leaves a line in meme.log with how long each part took (plan §6 ⑧.3)", () => {
    const w = world();
    const log = path.join(w.home, ".meme", "logs", "meme.log");
    run(w, ["ls", "--plain"]);
    expect(readFileSync(log, "utf8")).not.toContain("slow:");
    run(w, ["ls", "--plain"], { env: { MEME_SLOW_MS: "0" } });
    expect(readFileSync(log, "utf8")).toMatch(/ INFO slow: meme ls --plain took \d+ms \(start \d+, open \d+, import \d+, command \d+\)\n/);
  });

  test("the Windows side going away deletes nothing", () => {
    const w = world();
    run(w, ["ls", "-a"]);
    rmSync(w.users, { recursive: true });
    const r = run(w, ["ls", "-a"]);
    expect(r.out).toContain("22222222");
  });

  test("usage errors exit 2", () => {
    const w = world();
    expect(run(w, ["ls", "--bogus"]).code).toBe(2);
    expect(run(w, ["search"]).code).toBe(2);
    expect(run(w, ["search", "("]).code).toBe(2);
    expect(run(w, ["nope"]).code).toBe(2);
    const v = run(w, ["--version"]);
    expect(v.out).toMatch(/^meme \d+\.\d+\.\d+\n$/);
    expect(existsSync(path.join(w.home, ".meme"))).toBe(false);
  });
});

describe("step 9 (plan §6 ⑨)", () => {
  function withLines(w: ReturnType<typeof world>) {
    const s = new ClaudeSession({ id: "5ea5c400-0000-4000-8000-000000000001", cwd: path.join(w.home, "work", "demo") });
    s.user("why does the build fail?");
    s.assistant("first line\r\nerror: boom\r\nthird line\nfourth line");
    s.write(path.join(w.home, ".claude", "projects"));
  }

  test("R17: ^ and $ match at the start and end of each line", () => {
    const w = world();
    withLines(w);
    expect(run(w, ["search", "^error", "-a", "--plain"]).out).toContain("error: boom");
    expect(run(w, ["search", "boom$", "-a", "--plain"]).out).toContain("error: boom");
    expect(run(w, ["search", "^boom", "-a", "--plain"]).out).toContain("No matches");
  });

  test("search -C shows lines around each match", () => {
    const w = world();
    withLines(w);
    const out = run(w, ["search", "boom", "-a", "-C", "1", "--plain"]).out;
    expect(out).toContain("first line");
    expect(out).toContain("third line");
    expect(out).not.toContain("fourth line");
  });

  test("ls --env takes win and windows, mac and macos; anything else is a usage error", () => {
    const w = world();
    expect(run(w, ["ls", "-a", "--env", "windows", "--plain"]).out).toContain("22222222");
    expect(run(w, ["ls", "-a", "--env", "win", "--plain"]).out).not.toContain("11111111");
    expect(run(w, ["ls", "-a", "--env", "macos", "--plain"]).out).toContain("No sessions");
    const bad = run(w, ["ls", "--env", "beos"]);
    expect([bad.code, bad.err]).toEqual([2, "meme ls: unknown env: beos (use wsl, win or windows, mac or macos, linux)\nRun `meme ls --help` for usage.\n"]);
  });

  test("an unknown option is one line of meme's; help for a command that does not exist exits 2", () => {
    const w = world();
    expect(run(w, ["ls", "--bogus"]).err).toBe("meme ls: unknown option --bogus\nRun `meme ls --help` for usage.\n");
    const help = run(w, ["help", "bogus"]);
    expect(help.code).toBe(2);
    expect(help.err).toStartWith("meme: unknown command: bogus\n");
  });

  test("-a and --all mean all projects everywhere; search --tools and show --hidden", () => {
    const w = world();
    withLines(w);
    expect(run(w, ["search", "boom", "--all", "--plain"], { cwd: w.home }).out).toContain("error: boom");
    expect(run(w, ["search", "Get-ChildItem", "-a", "--tools", "--plain"]).out).toContain("Get-ChildItem");
    expect(run(w, ["show", "1111", "--hidden", "--plain"]).code).toBe(0);
    const old = run(w, ["show", "1111", "--all"]);
    expect([old.code, old.err]).toEqual([2, "meme show: --all is now --hidden: also injected messages and reasoning\nRun `meme show --help` for usage.\n"]);
  });
});

describe("plan §6 ⑩.1: the width off a terminal, and long titles", () => {
  /** About 420 characters, all of them two columns wide. */
  const LONG = "把导入模块的错误处理补完整，再跑一遍测试。".repeat(20);
  const withTitle = (first: string, id = "33333333-0000-4000-8000-000000000003") => {
    const w = world();
    const s = new ClaudeSession({ id, cwd: path.join(w.home, "work", "demo"), start: "2026-10-12T08:00:00.000Z" });
    s.user(first);
    s.assistant("好的。");
    s.write(path.join(w.home, ".claude", "projects"));
    return w;
  };

  test("off a terminal, lines are at most 119 columns (PowerShell folds a full 120)", () => {
    const w = withTitle(LONG);
    const widths = run(w, ["ls", "-a"]).out.split("\n").map((l) => Bun.stringWidth(l));
    // The title is two-column characters: the widest line stops at 118 or 119, never 120.
    expect(Math.max(...widths)).toBeLessThanOrEqual(119);
    expect(Math.max(...widths)).toBeGreaterThanOrEqual(118);
  });

  test("show puts the title on one line, cut with …; --full shows it all", () => {
    const w = withTitle(LONG);
    const top = run(w, ["show", "33333333"]).out.split("\n")[0]!;
    expect(Bun.stringWidth(top)).toBeLessThanOrEqual(119);
    expect(top).toMatch(/^把导入模块.*…  \[Claude·WSL\]$/);
    const full = run(w, ["show", "33333333", "--full"]).out.split("\n")[0]!;
    expect(full).toBe(`${[...LONG].slice(0, 199).join("")}…  [Claude·WSL]`);
  });

  test("the handoff keeps the title whole up to 200 characters, then cuts it with …", () => {
    const w = withTitle(LONG);
    expect(run(w, ["continue", "33333333", "--plain"]).out.split("\n")[0]).toBe(`# Handoff: ${[...LONG].slice(0, 199).join("")}…`);
    const hundred = LONG.slice(0, 100);
    const w2 = withTitle(hundred);
    expect(run(w2, ["continue", "33333333", "--plain"]).out.split("\n")[0]).toBe(`# Handoff: ${hundred}`);
  });
});

describe("plan §6 ⑪, F13: every list off a terminal fits 119 columns", () => {
  test("long titles, branches and project paths: ls -a, continue -a, a target's matches, search", () => {
    const w = world();
    const deep = path.join(w.home, "work", "clients", "acme-corporation", "internal-tools", "release-automation-service");
    mkdirSync(deep, { recursive: true });
    for (const [i, title] of ["Refactor the release pipeline so that every artifact is signed", "Refactor the release notes generator and its templates"].entries()) {
      const s = new ClaudeSession({ id: `4${i}4${i}4${i}4${i}-0000-4000-8000-00000000004${i}`, cwd: deep, branch: "feature/sign-every-artifact-before-upload", start: "2026-10-12T08:00:00.000Z" });
      s.user(`${title} ${"with more words ".repeat(12)}`);
      s.assistant("Refactor done.");
      s.write(path.join(w.home, ".claude", "projects"));
    }
    // A wider label.
    resetOpenCodeIds();
    const db = new OpenCodeDb(path.join(w.home, ".local", "share", "opencode", "opencode.db"));
    sampleOpenCode(db, { directory: deep });
    db.close();
    const over: string[] = [];
    for (const args of [["ls", "-a"], ["continue", "-a"], ["continue", "refactor"], ["search", "Refactor"], ["search", "Refactor", "-a"], ["search", "Refactor", "--tools"]]) {
      const widest = Math.max(...run(w, args, { cwd: deep }).out.split("\n").map((l) => Bun.stringWidth(l)));
      if (widest > 119) over.push(`${args.join(" ")}: ${widest}`);
    }
    // From a deep folder with no sessions: the line saying so names it within the width too (found on macOS, plan §6 ⑬).
    const nowhere = path.join(w.home, "a-folder-with-a-long-name", "and-another-one-below-it", "and-a-third-one-to-make-it-long", "with-no-sessions-in-it");
    mkdirSync(nowhere, { recursive: true });
    for (const args of [["ls"], ["continue"], ["search", "Refactor"]]) {
      const widest = Math.max(...run(w, args, { cwd: nowhere }).out.split("\n").map((l) => Bun.stringWidth(l)));
      if (widest > 119) over.push(`${args.join(" ")} in a deep folder: ${widest}`);
    }
    expect(over).toEqual([]);
  });
});
