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

  test("remember without a model: the user's words go in as they are, in force, traced to the message they were said in", () => {
    const { w, tool } = working();
    const t = talk(w, tool, [
      ["remember", { quote: "装依赖一律用 pnpm", about: "project", note: "the user wants pnpm from now on" }],
      ["context", { task: "add a dependency" }],
      ["recall", { words: "pnpm" }],
    ]);
    const id = /m-[0-9a-f]{8}/.exec(t.text(1))![0];
    expect(t.text(1)).toBe(`Remembered: [${id}] 装依赖一律用 pnpm`);
    expect(t.text(2)).toContain(`This project (tool)\n- [${id}] 装依赖一律用 pnpm\n`);
    expect(t.text(3)).toBe(`[${id}] 装依赖一律用 pnpm (github.com/me/tool)`);
    const [day] = readdirSync(path.join(w.home, ".meme", "evidence"));
    const evidence = readFileSync(path.join(w.home, ".meme", "evidence", day!), "utf8");
    expect(evidence).toMatch(new RegExp(`\\n## \\d\\d:\\d\\d · claude-code over MCP\\n- e-[0-9a-f]{8} · fact · stated · user · project:tool-[0-9a-f]{8} · session:${SESSION}#\\d+\\n  装依赖一律用 pnpm\\n$`));
    // The agent's note is read by the model only; nothing of it is written.
    expect(evidence).not.toContain("the user wants");
    // Explained to the agent the way `meme memory show` explains it to the user.
    const again = talk(w, tool, [["explain", { id }]]);
    expect(again.text(1)).toContain(`${id}  装依赖一律用 pnpm\n  fact, for all agents; stated; active\n`);
    expect(run(w, ["memory", "show", id]).out).toBe(again.text(1));
  });

  test("remember with words the user never said is refused, and nothing is written", () => {
    const { w, tool } = working();
    const t = talk(w, tool, [["remember", { quote: "I always use tabs" }]]);
    expect(t.replies.find((m) => m.id === 1)!.result).toMatchObject({
      isError: true,
      content: [{ text: 'not remembered: these words are not in anything the user said in a session. Copy them exactly from the user\'s message, or ask the user to run: meme remember "I always use tabs"' }],
    });
    expect(run(w, ["memory"]).out).toStartWith("Nothing remembered yet.");
  });

  test("an agent cannot bring back what the user had forgotten, even with the user's words", () => {
    const { w, tool } = working();
    const first = talk(w, tool, [["remember", { quote: WORDS }]]);
    const id = /m-[0-9a-f]{8}/.exec(first.text(1))![0];
    expect(run(w, ["memory", "forget", id, "--yes"]).code).toBe(0);
    const again = talk(w, tool, [["remember", { quote: WORDS }]]);
    expect(again.replies.find((m) => m.id === 1)!.result).toMatchObject({ isError: true });
    expect(run(w, ["memory"]).out).toStartWith("Nothing remembered yet.");
  });

  test("what a tool cannot do comes back as the tool's error, with what was missing", () => {
    const { w, tool } = working();
    const t = talk(w, tool, [
      ["remember", {}],
      ["remember", { quote: WORDS, about: "everyone" }],
      ["recall", {}],
      ["explain", { id: "m-ffffffff" }],
    ]);
    expect(t.replies.slice(1).map((m) => [m.result!.isError, m.result!.content![0]!.text])).toEqual([
      [true, "remember needs `quote`: the user's own words, copied exactly from their message"],
      [true, "`about` is one of rule, user, general, project"],
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
