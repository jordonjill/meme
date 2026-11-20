/**
 * A Model Context Protocol server on standard input and output, with tools only:
 * the handshake, the list of tools, calling one (memory-v0.3-draft §7.5). Messages
 * are JSON-RPC 2.0, one per line. Standard output carries nothing but them.
 */

export interface Tool {
  name: string;
  description: string;
  /** JSON Schema of the arguments. */
  inputSchema: Record<string, unknown>;
  /** The text the model gets back. `client` is what the agent calls itself. */
  call(args: Record<string, unknown>, client: string): Promise<string>;
}

/** A tool could not do what was asked; the message goes to the model as the tool's error. */
export class ToolError extends Error {}

export interface Server {
  name: string;
  version: string;
  /** What the agent is told about the server when it connects. */
  instructions: string;
  tools: Tool[];
}

/** The protocol versions this speaks, the newest first. A client that asks for another is offered the newest. */
const VERSIONS = ["2025-06-18", "2025-03-26", "2024-11-05"];

type Id = string | number | null;
interface Message {
  jsonrpc?: unknown;
  id?: Id;
  method?: unknown;
  params?: Record<string, unknown>;
}

const PARSE_ERROR = -32700;
const INVALID_REQUEST = -32600;
const METHOD_NOT_FOUND = -32601;
const INVALID_PARAMS = -32602;

class RpcError extends Error {
  constructor(
    readonly code: number,
    message: string,
  ) {
    super(message);
  }
}

/** One message in, at most one message out: a request gets an answer, a notification none. */
export function connection(server: Server, onError: (err: unknown) => void = () => {}): (line: string) => Promise<string | null> {
  let client = "";
  const answer = (id: Id, result: unknown) => JSON.stringify({ jsonrpc: "2.0", id, result });
  const failure = (id: Id, code: number, message: string) => JSON.stringify({ jsonrpc: "2.0", id, error: { code, message } });

  async function handle(method: string, params: Record<string, unknown>): Promise<unknown> {
    if (method === "initialize") {
      const info = params.clientInfo as { name?: unknown } | undefined;
      client = typeof info?.name === "string" ? info.name : "";
      const asked = params.protocolVersion;
      return {
        protocolVersion: typeof asked === "string" && VERSIONS.includes(asked) ? asked : VERSIONS[0],
        capabilities: { tools: {} },
        serverInfo: { name: server.name, version: server.version },
        instructions: server.instructions,
      };
    }
    if (method === "ping") return {};
    if (method === "tools/list") return { tools: server.tools.map(({ name, description, inputSchema }) => ({ name, description, inputSchema })) };
    if (method === "tools/call") {
      const tool = server.tools.find((t) => t.name === params.name);
      if (!tool) throw new RpcError(INVALID_PARAMS, `Unknown tool: ${String(params.name)}`);
      const args = params.arguments;
      if (args !== undefined && (typeof args !== "object" || args === null || Array.isArray(args))) throw new RpcError(INVALID_PARAMS, "arguments must be an object");
      try {
        return { content: [{ type: "text", text: await tool.call((args ?? {}) as Record<string, unknown>, client) }], isError: false };
      } catch (err) {
        if (!(err instanceof ToolError)) onError(err);
        return { content: [{ type: "text", text: err instanceof Error ? err.message : String(err) }], isError: true };
      }
    }
    throw new RpcError(METHOD_NOT_FOUND, `Method not found: ${method}`);
  }

  return async (line) => {
    let msg: Message;
    try {
      msg = JSON.parse(line) as Message;
    } catch {
      return failure(null, PARSE_ERROR, "Parse error");
    }
    if (typeof msg !== "object" || msg === null || Array.isArray(msg) || msg.jsonrpc !== "2.0") return failure(null, INVALID_REQUEST, "Invalid Request");
    // An answer to something this never asked, or a notification: nothing to say.
    if (typeof msg.method !== "string" || msg.id === undefined) return null;
    try {
      return answer(msg.id, await handle(msg.method, msg.params ?? {}));
    } catch (err) {
      if (err instanceof RpcError) return failure(msg.id, err.code, err.message);
      onError(err);
      return failure(msg.id, -32603, "Internal error");
    }
  };
}

/** Serves until the input ends, which is how an agent stops a server it started. */
export async function serve(server: Server, input: ReadableStream<Uint8Array>, write: (line: string) => void, onError?: (err: unknown) => void): Promise<void> {
  const respond = connection(server, onError);
  const decoder = new TextDecoder();
  let pending = "";
  const lines = async (text: string) => {
    pending += text;
    for (let at = pending.indexOf("\n"); at >= 0; at = pending.indexOf("\n")) {
      const line = pending.slice(0, at).trim();
      pending = pending.slice(at + 1);
      if (!line) continue;
      const out = await respond(line);
      if (out !== null) write(out + "\n");
    }
  };
  for await (const chunk of input) await lines(decoder.decode(chunk, { stream: true }));
  await lines(decoder.decode() + "\n");
}
