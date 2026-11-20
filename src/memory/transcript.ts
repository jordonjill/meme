import { callsOf, contentOf, promptText, type Rec } from "../model/record";
import { describeCall, isBookkeeping, resultFailed, resultText } from "../model/tools";

/**
 * A session as text for the model (memory-v0.3-draft §6.1, memory.md §2.2): one
 * line or block per record, with the record's number, so that what the model quotes
 * can be looked up. What the user and the AI said is shown, shortened only when long.
 * Of the work, each call is one short line, and a tool's output is shown only when
 * the call failed: lessons come from what went wrong, and the commands and their
 * output were three quarters of what was sent (measured 2026-11-17). History copied
 * from another session, what the agent's own software put in, its bookkeeping calls
 * and reasoning are not the conversation and are not shown.
 */

export type Speaker = "user" | "agent" | "tool";

export interface Shown {
  seq: number;
  speaker: Speaker;
  /** What the model sees of this record; a quote has to be in here. */
  text: string;
  ts: string | null;
}

/** The most of a user's message, of what the AI said, of a call's line, and of a failed call's output that is passed on. */
const MOST = { user: 6000, agent: 3000, call: 200, failure: 300 };

/** The start and the end of a long text; what is between is the least telling. */
function shortened(text: string, most: number): string {
  if (text.length <= most) return text;
  const half = Math.floor(most / 2);
  return `${text.slice(0, half)}\n[… ${(text.length - 2 * half).toLocaleString("en-US")} characters left out …]\n${text.slice(-half)}`;
}

/** The start of a line: what a command is comes first, a script's body after. */
const cut = (line: string, most: number) => (line.length <= most ? line : `${line.slice(0, most - 1)}…`);

export function shown(records: Rec[], from = 0): Shown[] {
  const out: Shown[] = [];
  for (const r of records) {
    if (r.seq < from || r.copied || r.injected) continue;
    const body = r.body;
    if (body.role === "user") {
      const content = contentOf(body);
      if (content?.trim()) out.push({ seq: r.seq, speaker: "user", text: shortened(promptText(content), MOST.user), ts: r.ts });
    } else if (body.role === "assistant") {
      const calls = callsOf(body);
      const work = calls.filter((c) => !isBookkeeping(c));
      const said = calls.length ? work.map((c) => describeCall(c)).map((d) => cut(`${d.name}: ${d.summary}`, MOST.call)).join("\n") : contentOf(body);
      if (said?.trim()) out.push({ seq: r.seq, speaker: "agent", text: shortened(said, MOST.agent), ts: r.ts });
    } else if (body.role === "tool") {
      const content = contentOf(body) ?? "";
      if (!resultFailed("ok" in body ? (body.ok as boolean | undefined) : undefined, content)) continue;
      out.push({ seq: r.seq, speaker: "tool", text: `failed\n${shortened(resultText(content).trim(), MOST.failure)}`.trim(), ts: r.ts });
    }
  }
  return out;
}

const LABEL: Record<Speaker, string> = { user: "user", agent: "assistant", tool: "tool result" };

export function transcript(items: Shown[]): string {
  return items.map((s) => `[#${s.seq} ${LABEL[s.speaker]}]\n${s.text}`).join("\n\n");
}

/** Pieces of at most `most` characters, cut between records; one record longer than that is a piece of its own. */
export function pieces(items: Shown[], most: number): Shown[][] {
  const out: Shown[][] = [];
  let size = 0;
  for (const s of items) {
    const cost = s.text.length + 30;
    if (!out.length || (size + cost > most && out.at(-1)!.length)) {
      out.push([]);
      size = 0;
    }
    out.at(-1)!.push(s);
    size += cost;
  }
  return out;
}
