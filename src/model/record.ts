import type { NormalizedRecord } from "@letta-ai/trajectory";
import { callText, parseArgs } from "./tools";

/** The inner layer: one trajectory record, verbatim (after redaction). */
export type Body = NormalizedRecord;

/** A record as the store keeps it, with meme's outer fields (format.md §3). */
export interface Rec {
  seq: number;
  uid: string | null;
  part: number;
  turn: number;
  injected: boolean;
  copied: boolean;
  role: string;
  ts: string | null;
  body: Body;
}

export function contentOf(body: Body): string | null {
  return "content" in body && typeof body.content === "string" ? body.content : null;
}

export function callsOf(body: Body) {
  if (body.role !== "assistant" || !("tool_calls" in body)) return [];
  return body.tool_calls.map((c) => ({ id: c.id, name: c.name, args: parseArgs(c.args) }));
}

/** Text that `meme search` looks at. Reasoning and the meta record are not searched. */
export function searchText(body: Body): string | null {
  switch (body.role) {
    case "meta":
    case "reasoning":
      return null;
    case "assistant":
      if ("tool_calls" in body) return callsOf(body).map(callText).join("\n");
      return body.content;
    default:
      return body.content;
  }
}

/** A user prompt as people read it: `! cmd` for shell input typed with `!`. */
export function promptText(content: string): string {
  const m = /^\s*<bash-input>([\s\S]*?)<\/bash-input>\s*$/.exec(content);
  return m ? "! " + m[1] : content;
}
