import { callsOf, contentOf, promptText, type Rec } from "../model/record";
import { describeCall, resultFailed, resultText } from "../model/tools";

/**
 * A session as text for the model (memory-v0.3-draft §6.1, memory.md §2.2): one
 * line or block per record, with the record's number, so that what the model quotes
 * can be looked up. Nothing is left out for being unimportant; long parts are only
 * shortened. History copied from another session, what the agent's own software put
 * in, and reasoning are not the conversation and are not shown.
 */

export type Speaker = "user" | "agent" | "tool";

export interface Shown {
  seq: number;
  speaker: Speaker;
  /** What the model sees of this record; a quote has to be in here. */
  text: string;
  ts: string | null;
}

/** The most of a user's message, of what the AI said, and of a tool's output that is passed on. */
const MOST = { user: 6000, agent: 3000, result: 800 };

/** The start and the end of a long text; what is between is the least telling. */
function shortened(text: string, most: number): string {
  if (text.length <= most) return text;
  const half = Math.floor(most / 2);
  return `${text.slice(0, half)}\n[… ${(text.length - 2 * half).toLocaleString("en-US")} characters left out …]\n${text.slice(-half)}`;
}

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
      const content = contentOf(body);
      const said = calls.length ? calls.map((c) => describeCall(c)).map((d) => `${d.name}: ${d.summary}`).join("\n") : content;
      if (said?.trim()) out.push({ seq: r.seq, speaker: "agent", text: shortened(said, MOST.agent), ts: r.ts });
    } else if (body.role === "tool") {
      const content = contentOf(body) ?? "";
      const failed = resultFailed("ok" in body ? (body.ok as boolean | undefined) : undefined, content);
      out.push({ seq: r.seq, speaker: "tool", text: `${failed ? "failed" : "ok"}\n${shortened(resultText(content).trim(), MOST.result)}`.trim(), ts: r.ts });
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
