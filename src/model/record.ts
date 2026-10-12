import type { NormalizedRecord } from "@letta-ai/trajectory";
import { firstMatch, SHELL_INPUTS, SHELL_OUTPUTS } from "./formats";
import type { Injected } from "./injected";
import { callText, parseArgs } from "./tools";

/** The inner layer: one trajectory record, verbatim (after redaction). */
export type Body = NormalizedRecord;

/** A record as the store keeps it, with meme's outer fields (format.md §3). */
export interface Rec {
  seq: number;
  uid: string | null;
  part: number;
  turn: number;
  /** Not said by the user or the AI, and why; null for the conversation itself. */
  injected: Injected | null;
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
  const m = firstMatch(SHELL_INPUTS, content);
  return m ? "! " + m[1] : content;
}

/** The output of a `!` command: some agents record it with the command, others in the next record. */
export function shellOutput(content: string): string | null {
  const m = firstMatch(SHELL_OUTPUTS, content);
  return m ? m[1]! : null;
}
