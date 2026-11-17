/**
 * `meme context --hook`, unfinished work in `meme context`, and `meme plugin`
 * (plan-m2 F6): memory reaches an agent when a session starts, without it asking.
 */
import { describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, readFileSync, readdirSync, utimesSync, writeFileSync } from "node:fs";
import path from "node:path";
import { ClaudeSession } from "../fixtures/gen-claude";
import { run, world, type World } from "./world";

const LEFT = "eeeeeeee-0000-4000-8000-00000000000e";
/** The built single file under test, when there is one: not on PATH, it is called by its full path. */
const BUILT = process.env.MEME_BIN ? path.resolve(process.env.MEME_BIN) : null;

/** A project with one rule remembered and a session that the user stopped five hours ago. */
function working() {
  const w = world();
  const tool = path.join(w.home, "work", "tool");
  mkdirSync(path.join(tool, ".git"), { recursive: true });
  writeFileSync(path.join(tool, ".git", "HEAD"), "ref: refs/heads/main\n");
  const s = new ClaudeSession({ id: LEFT, cwd: tool, start: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString() });
  s.user("给登录接口加限流");
  s.call("Bash", { command: "ls" });
  s.interrupt(true);
  const file = s.write(path.join(w.home, ".claude", "projects"));
  const then = Date.now() / 1000 - 5 * 60 * 60;
  utimesSync(file, then, then);
  run(w, ["remember", "回复用中文"]);
  return { w, tool };
}

const hook = (w: World, input: string, cwd?: string) => run(w, ["context", "--hook"], { input, cwd });

describe("unfinished work in meme context", () => {
  test("a session the user stopped is offered in its project, with the command that takes it up; elsewhere it is not", () => {
    const { w, tool } = working();
    const here = run(w, ["context"], { cwd: tool }).out;
    expect(here).toMatch(/\n\nUnfinished here\n- \d{4}-\d\d-\d\d, Claude Code, branch main: "给登录接口加限流", stopped by the user\. To take it up: meme continue eeeeeeee\n$/);
    expect(here).toContain("\nRules\n- [");
    expect(run(w, ["context"]).out).not.toContain("Unfinished here");
  });
});

describe("meme context --hook", () => {
  test("the directory comes from what the agent passes on standard input; the session that asks is not offered to itself", () => {
    const { w, tool } = working();
    const given = hook(w, JSON.stringify({ hook_event_name: "SessionStart", cwd: tool, session_id: "ffffffff-0000-4000-8000-00000000000f", source: "startup" }));
    expect([given.code, given.err]).toEqual([0, ""]);
    expect(given.out).toContain("Unfinished here\n- ");
    expect(hook(w, JSON.stringify({ cwd: tool, session_id: LEFT })).out).not.toContain("Unfinished here");
  });

  test("nothing stands in the agent's way: input that is not what was expected still ends well", () => {
    const { w, tool } = working();
    for (const input of ["", "not json", "[1, 2]", JSON.stringify({ cwd: 42 }), JSON.stringify({ cwd: "relative/path" })]) {
      const r = hook(w, input, tool);
      expect([r.code, r.err]).toEqual([0, ""]);
      expect(r.out).toContain("回复用中文");
    }
  });

  test("called by another agent that loads this plugin's hooks, it says nothing", () => {
    const { w, tool } = working();
    expect(hook(w, JSON.stringify({ cwd: tool, cursor_version: "3.22" })).out).toBe("");
    expect(run(w, ["context", "--hook"], { input: JSON.stringify({ cwd: tool }), env: { CURSOR_VERSION: "3.22" } }).out).toBe("");
  });
});

describe("meme plugin", () => {
  test("writes the plugin under ~/.meme/plugins and shows the agent's own commands; no agent's folder is touched", () => {
    const w = world();
    // A PATH without meme on it, wherever this machine has one.
    const r = run(w, ["plugin"], { env: { PATH: "/usr/bin:/bin" } });
    expect(r.code).toBe(0);
    expect(r.out).toBe(
      [
        "Claude Code: the plugin is in ~/.meme/plugins/claude-code. To install it, run:",
        `  claude plugin marketplace add ${path.join(w.home, ".meme", "plugins", "claude-code")}`,
        "  claude plugin install meme@meme",
        "To take it out again:",
        "  claude plugin uninstall meme@meme",
        "  claude plugin marketplace remove meme",
        // Run from its sources meme can only be called by name; a built file names itself.
        ...(BUILT ? [] : ["", "Note: `meme` is not on your PATH yet; the agent will not find it until it is."]),
        "",
      ].join("\n"),
    );
    const dir = path.join(w.home, ".meme", "plugins", "claude-code");
    const json = (name: string) => JSON.parse(readFileSync(path.join(dir, name), "utf8"));
    expect(json(".claude-plugin/marketplace.json")).toMatchObject({ name: "meme", plugins: [{ name: "meme", source: "./meme" }] });
    expect(json("meme/.claude-plugin/plugin.json")).toMatchObject({ name: "meme", version: expect.stringMatching(/^\d+\.\d+\.\d+/) });
    expect(json("meme/hooks/hooks.json").hooks).toEqual({ SessionStart: [{ hooks: [{ type: "command", command: `${BUILT ?? "meme"} context --hook` }] }] });
    expect(json("meme/.mcp.json")).toEqual({ meme: { command: BUILT ?? "meme", args: ["mcp"] } });
    expect(readdirSync(path.join(w.home, ".claude")).sort()).toEqual(["projects"]);
  });

  test("written afresh each time; an agent without a plugin is told how it connects", () => {
    const w = world();
    run(w, ["plugin", "claude"]);
    const stray = path.join(w.home, ".meme", "plugins", "claude-code", "meme", "old-file.txt");
    writeFileSync(stray, "left by an older meme");
    expect(run(w, ["plugin", "cc"]).code).toBe(0);
    expect(existsSync(stray)).toBe(false);
    const none = run(w, ["plugin", "codex"]);
    expect([none.code, none.err.split("\n")[0]]).toEqual([2, "meme plugin: there is no plugin for codex; there is one for claude. Other agents connect with `meme mcp`"]);
  });

  test("uninstall removes the plugin folder with meme's other files", () => {
    const w = world();
    run(w, ["plugin"]);
    run(w, ["ls"]);
    expect(run(w, ["uninstall", "--yes"]).code).toBe(0);
    expect(existsSync(path.join(w.home, ".meme"))).toBe(false);
  });
});
