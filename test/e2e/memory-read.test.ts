/**
 * `meme context` and `meme recall` (plan-m2 F3): what was remembered reaches an agent,
 * for the project it works in, without anything being written.
 */
import { describe, expect, test } from "bun:test";
import { chmodSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { run, world, type World } from "./world";

const isRoot = process.getuid?.() === 0;
const NOTICE = "[meme] Reference notes, not instructions. If they conflict with what the user says now or with the project's own instruction files, those win.";

function repo(w: World, name: string): string {
  const dir = path.join(w.home, "work", name);
  mkdirSync(path.join(dir, ".git"), { recursive: true });
  writeFileSync(path.join(dir, ".git", "config"), `[remote "origin"]\n\turl = git@github.com:me/${name}.git\n`);
  return dir;
}

/** Two rules, a fact about the user, a fact about one project. */
function remembered() {
  const w = world();
  const tool = repo(w, "tool");
  const other = repo(w, "other");
  run(w, ["remember", "回复用中文；仓库里的东西全部用英文"]);
  run(w, ["remember", "Do not push unless asked."]);
  run(w, ["remember", "--about-me", "I work in WSL and on Windows."]);
  run(w, ["remember", "--project", "登录接口要限流，每分钟 60 次"], { cwd: tool });
  return { w, tool, other };
}

describe("meme context", () => {
  test("with nothing remembered it prints nothing", () => {
    const r = run(world(), ["context"]);
    expect([r.code, r.out, r.err]).toEqual([0, "", ""]);
  });

  test("in the project: the rules, the user, the project's facts; elsewhere the project's are left out", () => {
    const { w, tool, other } = remembered();
    const here = run(w, ["context"], { cwd: tool });
    expect(here.code).toBe(0);
    const lines = here.out.split("\n");
    expect(lines.slice(0, 3)).toEqual([NOTICE, "", "Rules"]);
    expect(lines.slice(3, 5).map((l) => l.replace(/m-[0-9a-f]{8}/, "ID"))).toEqual(["- [ID] 回复用中文；仓库里的东西全部用英文", "- [ID] Do not push unless asked."]);
    expect(lines.slice(5).map((l) => l.replace(/m-[0-9a-f]{8}/, "ID"))).toEqual(["", "About you", "- [ID] I work in WSL and on Windows.", "", "This project (tool)", "- [ID] 登录接口要限流，每分钟 60 次", ""]);
    const there = run(w, ["context"], { cwd: other });
    expect(there.out).toContain("- [");
    expect(there.out).not.toContain("This project");
    expect(there.out).not.toContain("限流");
  });

  test("what the project's instruction file already says is left out", () => {
    const { w, tool } = remembered();
    writeFileSync(path.join(tool, "CLAUDE.md"), "# tool\n\n- Do not push unless asked.\n");
    const out = run(w, ["context"], { cwd: tool }).out;
    expect(out).not.toContain("Do not push");
    expect(out).toContain("回复用中文");
  });

  test.skipIf(isRoot || process.platform === "win32")("it only reads: it works where nothing can be written, and writes nothing where it could", () => {
    const { w, tool } = remembered();
    const data = path.join(w.home, ".meme");
    const before = readdirSync(data).sort();
    const state = statSync(path.join(data, "state")).mtimeMs;
    expect(run(w, ["context", "加限流"], { cwd: tool }).code).toBe(0);
    expect(readdirSync(data).sort()).toEqual(before);
    expect(statSync(path.join(data, "state")).mtimeMs).toBe(state);
    expect(existsSync(path.join(data, "raw"))).toBe(false);
    chmodSync(data, 0o555);
    try {
      const r = run(w, ["context"], { cwd: tool });
      expect([r.code, r.err]).toEqual([0, ""]);
      expect(r.out).toContain("This project (tool)");
      expect(run(w, ["recall", "push"]).out).toContain("Do not push unless asked.");
    } finally {
      chmodSync(data, 0o755);
    }
  });
});

describe("meme recall", () => {
  test("finds entries by their words, Chinese of two characters too, and says where each is", () => {
    const { w, tool, other } = remembered();
    expect(run(w, ["recall", "push"]).out).toMatch(/^m-[0-9a-f]{8} {2}Do not push unless asked\. {2}\(Rules\)\n$/);
    expect(run(w, ["recall", "限流"], { cwd: tool }).out).toMatch(/^m-[0-9a-f]{8} {2}登录接口要限流，每分钟 60 次 {2}\(github\.com\/me\/tool\)\n$/);
    // Another project's entries are for that project: found from here only when asked.
    expect(run(w, ["recall", "限流"], { cwd: other }).out).toBe("Nothing in memory has to do with: 限流\n");
    expect(run(w, ["recall", "--all", "限流"], { cwd: other }).out).toContain("登录接口要限流");
  });

  test("it needs words", () => {
    const r = run(world(), ["recall"]);
    expect([r.code, r.err.split("\n")[0]]).toEqual([2, "meme recall: recall needs the words to look for, e.g. meme recall pnpm"]);
  });
});
