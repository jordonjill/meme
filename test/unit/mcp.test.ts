import { describe, expect, test } from "bun:test";
import { agentOfClient } from "../../src/adapters/profiles";
import { connection, serve, ToolError, type Server } from "../../src/mcp/server";

const server = (): Server => ({
  name: "meme",
  version: "9.9.9",
  instructions: "call context first",
  tools: [
    { name: "echo", description: "says it back", inputSchema: { type: "object", properties: { text: { type: "string" } } }, call: async (args, client) => `${client}: ${String(args.text)}` },
    {
      name: "refuse",
      description: "always refuses",
      inputSchema: { type: "object" },
      call: async () => {
        throw new ToolError("not this time");
      },
    },
    {
      name: "break",
      description: "has a bug",
      inputSchema: { type: "object" },
      call: async () => {
        throw new TypeError("boom");
      },
    },
  ],
});

const ask = (id: number | string, method: string, params?: unknown) => JSON.stringify({ jsonrpc: "2.0", id, method, ...(params === undefined ? {} : { params }) });

describe("the MCP server (plan-m2 F4)", () => {
  test("the handshake: the version asked for when this speaks it, else the newest this speaks", async () => {
    const respond = connection(server());
    const hello = JSON.parse((await respond(ask(1, "initialize", { protocolVersion: "2025-03-26", capabilities: {}, clientInfo: { name: "claude-code", version: "2" } })))!);
    expect(hello).toEqual({ jsonrpc: "2.0", id: 1, result: { protocolVersion: "2025-03-26", capabilities: { tools: {} }, serverInfo: { name: "meme", version: "9.9.9" }, instructions: "call context first" } });
    const newer = JSON.parse((await connection(server())(ask(1, "initialize", { protocolVersion: "2099-01-01" })))!);
    expect(newer.result.protocolVersion).toBe("2025-06-18");
  });

  test("notifications and answers get no reply; ping gets an empty one", async () => {
    const respond = connection(server());
    expect(await respond(JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }))).toBeNull();
    expect(await respond(JSON.stringify({ jsonrpc: "2.0", id: 7, result: {} }))).toBeNull();
    expect(JSON.parse((await respond(ask("p", "ping")))!)).toEqual({ jsonrpc: "2.0", id: "p", result: {} });
  });

  test("the tools are listed with their names, descriptions and argument schemas, nothing else", async () => {
    const listed = JSON.parse((await connection(server())(ask(2, "tools/list")))!).result.tools;
    expect(listed.map((t: { name: string }) => t.name)).toEqual(["echo", "refuse", "break"]);
    expect(Object.keys(listed[0]).sort()).toEqual(["description", "inputSchema", "name"]);
  });

  test("calling a tool: its text comes back; it is told who the client is", async () => {
    const respond = connection(server());
    await respond(ask(1, "initialize", { protocolVersion: "2025-06-18", clientInfo: { name: "codex-mcp-client" } }));
    expect(JSON.parse((await respond(ask(3, "tools/call", { name: "echo", arguments: { text: "hi" } })))!).result).toEqual({ content: [{ type: "text", text: "codex-mcp-client: hi" }], isError: false });
  });

  test("a tool that cannot do it answers with an error the model can read; a bug is also reported to meme", async () => {
    const seen: unknown[] = [];
    const respond = connection(server(), (err) => seen.push(err));
    expect(JSON.parse((await respond(ask(4, "tools/call", { name: "refuse" })))!).result).toEqual({ content: [{ type: "text", text: "not this time" }], isError: true });
    expect(seen).toEqual([]);
    expect(JSON.parse((await respond(ask(5, "tools/call", { name: "break" })))!).result).toEqual({ content: [{ type: "text", text: "boom" }], isError: true });
    expect(seen.length).toBe(1);
  });

  test("what is not understood gets the protocol's own errors", async () => {
    const respond = connection(server());
    const error = async (line: string) => JSON.parse((await respond(line))!).error;
    expect(await error("not json")).toEqual({ code: -32700, message: "Parse error" });
    expect(await error(JSON.stringify({ id: 1, method: "ping" }))).toEqual({ code: -32600, message: "Invalid Request" });
    expect(await error(JSON.stringify([ask(1, "ping")]))).toEqual({ code: -32600, message: "Invalid Request" });
    expect(await error(ask(1, "resources/list"))).toEqual({ code: -32601, message: "Method not found: resources/list" });
    expect(await error(ask(1, "tools/call", { name: "nope" }))).toEqual({ code: -32602, message: "Unknown tool: nope" });
    expect(await error(ask(1, "tools/call", { name: "echo", arguments: "text" }))).toEqual({ code: -32602, message: "arguments must be an object" });
  });

  test("messages are lines: one cut in two arrives whole, blank lines are skipped, the last needs no line break", async () => {
    const lines = [ask(1, "ping"), "", ask(2, "ping")].join("\n");
    const cut = 20;
    const input = new ReadableStream<Uint8Array>({
      start(c) {
        c.enqueue(new TextEncoder().encode(lines.slice(0, cut)));
        c.enqueue(new TextEncoder().encode(lines.slice(cut)));
        c.close();
      },
    });
    const out: string[] = [];
    await serve(server(), input, (line) => out.push(line));
    expect(out.map((l) => [l.endsWith("\n"), JSON.parse(l).id])).toEqual([
      [true, 1],
      [true, 2],
    ]);
  });

  test("an agent is known by a word of the name its client gives", () => {
    expect(["claude-code", "Claude Code", "codex-mcp-client", "opencode", "pi", "api-tester", "Cursor"].map(agentOfClient)).toEqual(["claude-code", "claude-code", "codex", "opencode", "pi", undefined, undefined]);
  });
});
