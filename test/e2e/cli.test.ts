/** End to end: ls, show, search and status (see world.ts for the setup). */
import { describe, expect, test } from "bun:test";
import { existsSync, rmSync } from "node:fs";
import path from "node:path";
import { run, world } from "./world";

describe("meme CLI", () => {
  test("ls -a lists WSL and Windows sessions with their labels", () => {
    const w = world();
    const r = run(w, ["ls", "-a"]);
    expect(r.err).toBe("");
    expect(r.code).toBe(0);
    expect(r.out).toContain("Sessions in all projects (newest first):");
    expect(r.out).toMatch(/11111111 {2}CC·WSL .*Status line setup/);
    expect(r.out).toMatch(/22222222 {2}CC·Win .*\/mnt\/c\/Users\/me\/work\/demo-app .*仓库概览/);
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
      "仓库概览  [CC·Win]",
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

  test("status names both sources", () => {
    const w = world();
    const r = run(w, ["status"]);
    expect(r.out).toContain("Mode:         read-write");
    expect(r.out).toContain("Mirror:       2 sessions");
    expect(r.out).toMatch(/CC·WSL +~\/\.claude\/projects +readable +1 session/);
    expect(r.out).toMatch(/CC·Win +.*mnt-c-Users\/me\/\.claude\/projects +readable +1 session/);
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
