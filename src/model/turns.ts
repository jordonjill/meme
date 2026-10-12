import { isCompaction, userKind, type UserKind } from "./injected";
import { callsOf, contentOf, type Rec } from "./record";
import { commandOf, editedFiles, resultFailed } from "./tools";

/**
 * Turn numbers (plan §4.6.4): each real user prompt starts the next turn.
 * Records before the first prompt are turn 0.
 */
export function assignTurns(kinds: (UserKind | null)[]): number[] {
  let turn = 0;
  return kinds.map((k) => (k === "prompt" ? ++turn : turn));
}

export function kindOf(rec: Pick<Rec, "role" | "injected" | "body">): UserKind | null {
  if (rec.role !== "user") return null;
  if (rec.injected) return "injected";
  return userKind(contentOf(rec.body) ?? "");
}

export interface Turn {
  n: number;
  records: Rec[];
  prompt: Rec | null;
  steps: number;
  commands: number;
  failed: number;
  edited: string[];
  /** The last thing the AI said in this turn. */
  reply: string | null;
  /**
   * The AI's final reply: what it said after its last step, not a note before a
   * step ("let me check…"). Some agents mark it; this rule finds the same message
   * without a mark, for every agent. Null when the turn ended on a step.
   */
  final: string | null;
  interrupted: boolean;
  /** Records where the agent compacted its context (a summary or a marker). */
  compactions: Rec[];
}

export function groupTurns(records: Rec[]): { before: Rec[]; turns: Turn[] } {
  const before: Rec[] = [];
  const turns: Turn[] = [];
  for (const rec of records) {
    if (rec.role === "meta") continue;
    if (rec.turn === 0) {
      before.push(rec);
      continue;
    }
    let t = turns[turns.length - 1];
    if (!t || t.n !== rec.turn) {
      t = { n: rec.turn, records: [], prompt: null, steps: 0, commands: 0, failed: 0, edited: [], reply: null, final: null, interrupted: false, compactions: [] };
      turns.push(t);
    }
    t.records.push(rec);
  }
  for (const t of turns) summarize(t);
  return { before, turns };
}

function summarize(t: Turn): void {
  const edited = new Set<string>();
  for (const rec of t.records) {
    const kind = kindOf(rec);
    if (kind === "prompt" && !t.prompt) t.prompt = rec;
    if (kind === "interrupt") t.interrupted = true;
    if (isCompaction(rec.injected)) t.compactions.push(rec);
    if (rec.body.role === "assistant" && !rec.injected) {
      const calls = callsOf(rec.body);
      for (const call of calls) {
        t.steps++;
        if (commandOf(call) !== null) t.commands++;
        for (const f of editedFiles(call)) edited.add(f);
      }
      if (calls.length) t.final = null;
      const text = contentOf(rec.body);
      if (text && text.trim()) t.reply = t.final = text;
    }
    if (rec.body.role === "tool" && resultFailed(rec.body.ok, rec.body.content)) t.failed++;
  }
  t.edited = [...edited];
}

export type Ending = "finished" | "interrupted" | "unfinished";

/** How the session ended, judged from its last records (plan §4.6.4). */
export function endingOf(records: Rec[]): Ending {
  for (let i = records.length - 1; i >= 0; i--) {
    const rec = records[i]!;
    const role = rec.body.role;
    if (role === "meta" || role === "reasoning" || role === "system" || rec.injected) continue;
    if (role === "assistant") return "tool_calls" in rec.body ? "unfinished" : "finished";
    if (role === "tool") return "unfinished";
    if (role === "user") {
      const kind = kindOf(rec);
      if (kind === "interrupt") return "interrupted";
      if (kind === "output") return "finished";
      // A `/command` that got no reply is a local command such as /exit or /model.
      return (contentOf(rec.body) ?? "").trimStart().startsWith("/") ? "finished" : "unfinished";
    }
  }
  return "finished";
}

/** A session whose file changed in the last few minutes may still be running. */
const RUNNING_WINDOW_MS = 5 * 60_000;

/** When a session was last active: its last record's time, which (unlike the file's mtime) agents do not bump by housekeeping. */
export function lastActive(endedAt: string | null): number | null {
  const t = endedAt ? Date.parse(endedAt) : NaN;
  return Number.isNaN(t) ? null : t;
}

export function mayBeRunning(mtimeMs: number | null, now = Date.now()): boolean {
  if (mtimeMs === null) return false;
  // A little in the future is clock skew (Windows files seen from WSL); far in the future is not "now".
  const age = now - mtimeMs;
  return age < RUNNING_WINDOW_MS && age > -RUNNING_WINDOW_MS;
}
