/** End to end: ls, show, search and status (see world.ts for the setup). */
import { describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import path from "node:path";
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
    expect(one.out).toContain("      ⏺ PowerShell  Get-ChildItem -Force\n");
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

  test("an agent not installed is said so, and not logged on every run; installed but unreadable is NOT READABLE (plan §6 ⑧.3)", () => {
    const w = world();
    const log = path.join(w.home, ".meme", "logs", "meme.log");
    const r = run(w, ["status"]);
    expect(r.out).toMatch(/Codex·WSL +~\/\.codex +not installed +0 sessions\n/);
    expect(readFileSync(log, "utf8")).not.toContain("source unreachable");
    expect(run(w, ["install", "--dry-run"]).out).toMatch(/Codex·WSL +~\/\.codex +not installed\n/);
    // Its home is there, its sessions folder is not.
    mkdirSync(path.join(w.home, ".codex"));
    expect(run(w, ["status"]).out).toMatch(/Codex·WSL +~\/\.codex +NOT READABLE \(nothing deleted\) +0 sessions\n/);
    expect(readFileSync(log, "utf8")).toContain("source unreachable, nothing deleted: " + path.join(w.home, ".codex"));
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
