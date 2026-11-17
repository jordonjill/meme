/**
 * `meme mcp` (plan-m2 F4): an agent reads and writes memory over the Model Context
 * Protocol. A client here is a script of lines on standard input.
 */
import { describe, expect, test } from "bun:test";
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { ClaudeSession } from "../fixtures/gen-claude";
import { run, world, type World } from "./world";

const WORDS = "以后装依赖一律用 pnpm，别再用 npm 了";
const SESSION = "aaaaaaaa-0000-4000-8000-00000000000a";

/** A project with a remote, and a session in it where the user said WORDS just now. */
function working() {
  const w = world();
  const tool = path.join(w.home, "work", "tool");
  mkdirSync(path.join(tool, ".git"), { recursive: true });
  writeFileSync(path.join(tool, ".git", "config"), '[remote "origin"]\n\turl = git@github.com:me/tool.git\n');
  const s = new ClaudeSession({ id: SESSION, cwd: tool, start: new Date().toISOString() });
  s.user(WORDS);
  s.assistant("好的。");
  s.write(path.join(w.home, ".claude", "projects"));
  return { w, tool };
}

interface Reply {
  id: number | null;
  result?: { content?: { type: string; text: string }[]; isError?: boolean; tools?: { name: string }[]; protocolVersion?: string; instructions?: string };
  error?: { code: number; message: string };
}

/** Sends the handshake and then one call per item; the answers by request id. */
function talk(w: World, cwd: string, calls: [name: string, args: Record<string, unknown>][], client = "claude-code") {
  const lines = [
    JSON.stringify({ jsonrpc: "2.0", id: 0, method: "initialize", params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: client, version: "1" } } }),
    JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }),
    ...calls.map(([name, args], i) => JSON.stringify({ jsonrpc: "2.0", id: i + 1, method: "tools/call", params: { name, arguments: args } })),
  ];
  const r = run(w, ["mcp"], { cwd, input: lines.join("\n") + "\n" });
  const replies = r.out
    .split("\n")
    .filter(Boolean)
    .map((l) => JSON.parse(l) as Reply);
  const text = (i: number) => replies.find((m) => m.id === i)!.result!.content![0]!.text;
  return { ...r, replies, text };
}

describe("meme mcp", () => {
  test("standard output carries only the protocol: the handshake, then an answer per call", () => {
    const { w, tool } = working();
    const t = talk(w, tool, [["context", {}]]);
    expect([t.code, t.err]).toEqual([0, ""]);
    expect(t.replies.map((m) => m.id)).toEqual([0, 1]);
    expect(t.replies[0]!.result).toMatchObject({ protocolVersion: "2025-06-18", serverInfo: { name: "meme" }, capabilities: { tools: {} } });
    expect(t.replies[0]!.result!.instructions).toContain("call `context` once");
    expect(t.text(1)).toBe("meme has nothing in memory for here yet.");
  });

  test("the four tools are offered", () => {
    const { w, tool } = working();
    const r = run(w, ["mcp"], { cwd: tool, input: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" }) + "\n" });
    const tools = (JSON.parse(r.out) as Reply).result!.tools!;
    expect(tools.map((t) => t.name)).toEqual(["context", "recall", "explain", "remember"]);
  });

  test("remember with the user's own words: found in the session, in force at once, traced to that message", () => {
    const { w, tool } = working();
    const t = talk(w, tool, [
      ["remember", { text: "Install dependencies with pnpm, never npm.", quote: "装依赖一律用 pnpm", about: "project" }],
      ["context", { task: "add a dependency" }],
      ["recall", { words: "pnpm" }],
    ]);
    const id = /m-[0-9a-f]{8}/.exec(t.text(1))![0];
    expect(t.text(1)).toBe(`Remembered as ${id}; it is in force now.`);
    expect(t.text(2)).toContain(`This project (tool)\n- [${id}] Install dependencies with pnpm, never npm.\n`);
    expect(t.text(3)).toBe(`[${id}] Install dependencies with pnpm, never npm. (github.com/me/tool)`);
    const [day] = readdirSync(path.join(w.home, ".meme", "evidence"));
    const evidence = readFileSync(path.join(w.home, ".meme", "evidence", day!), "utf8");
    expect(evidence).toMatch(new RegExp(`\\n## \\d\\d:\\d\\d · claude-code over MCP\\n- e-[0-9a-f]{8} · fact · stated · user · project:tool-[0-9a-f]{8} · session:${SESSION}#\\d+\\n  Install dependencies with pnpm, never npm\\.\\n  > 装依赖一律用 pnpm\\n$`));
    // Explained to the agent the way `meme memory show` explains it to the user.
    const again = talk(w, tool, [["explain", { id }]]);
    expect(again.text(1)).toContain(`${id}  Install dependencies with pnpm, never npm.\n  fact, for all agents; stated; active\n`);
    expect(again.text(1)).toContain("    > 装依赖一律用 pnpm\n");
    expect(run(w, ["memory", "show", id]).out).toBe(again.text(1));
  });

  test("remember with words the user never said, or with none: a candidate, not given to agents, until the user confirms", () => {
    const { w, tool } = working();
    const t = talk(w, tool, [
      ["remember", { text: "The user prefers tabs.", quote: "I always use tabs" }],
      ["remember", { text: "Tests run with bun test." }],
      ["context", {}],
    ]);
    expect(t.text(1)).toMatch(/^Kept as a candidate, m-[0-9a-f]{8}: it is not in force yet, because the quoted words were not found in what the user said in any session\. Tell the user it takes effect once they confirm it by running: meme remember "The user prefers tabs\."$/);
    expect(t.text(2)).toContain("because no words of the user were given as `quote`");
    expect(t.text(3)).toBe("meme has nothing in memory for here yet.");
    expect(run(w, ["memory"]).out).toMatch(/The user prefers tabs\. {2}\[candidate\]\n/);
    // The user confirming it puts it in force.
    expect(run(w, ["remember", "The user prefers tabs."]).out).toContain("Already remembered");
    expect(run(w, ["context"]).out).toContain("] The user prefers tabs.\n");
  });

  test("an agent cannot bring back what the user had forgotten, even with the user's words", () => {
    const { w, tool } = working();
    const first = talk(w, tool, [["remember", { text: "Install with pnpm.", quote: WORDS }]]);
    const id = /m-[0-9a-f]{8}/.exec(first.text(1))![0];
    expect(run(w, ["memory", "forget", id, "--yes"]).code).toBe(0);
    const again = talk(w, tool, [["remember", { text: "Install with pnpm.", quote: WORDS }]]);
    expect(again.replies.find((m) => m.id === 1)!.result).toMatchObject({ isError: true, content: [{ text: "not remembered: none of its evidence could be checked" }] });
    expect(run(w, ["memory"]).out).toStartWith("Nothing remembered yet.");
  });

  test("what a tool cannot do comes back as the tool's error, with what was missing", () => {
    const { w, tool } = working();
    const t = talk(w, tool, [
      ["remember", {}],
      ["remember", { text: "x", about: "everyone" }],
      ["recall", {}],
      ["explain", { id: "m-ffffffff" }],
    ]);
    expect(t.replies.slice(1).map((m) => [m.result!.isError, m.result!.content![0]!.text])).toEqual([
      [true, "remember needs `text`: what to keep, as one sentence"],
      [true, "`about` is one of rule, user, project"],
      [true, "recall needs `words`: what to look for"],
      [true, "no entry m-ffffffff in memory; `meme memory` lists them"],
    ]);
  });

  test("--help says how to connect each agent, with the agent's own command; install points to it", () => {
    const w = world();
    const help = run(w, ["mcp", "--help"]).out;
    expect(help).toContain("\n  Claude Code   claude mcp add -s user meme -- meme mcp\n");
    expect(help).toContain("\n  Codex         codex mcp add meme -- meme mcp\n");
    expect(help).toContain("\n  other agents  add a local (stdio) server whose command is: meme mcp\n");
    expect(run(w, ["install"]).out).toEndWith("\nTo give your agents meme's memory, connect them once: `meme mcp --help` shows how.\n");
    // Connecting is the user's to do: install wrote into no agent's folder.
    expect(readdirSync(path.join(w.home, ".claude")).sort()).toEqual(["projects"]);
  });
});
