import type { Database } from "bun:sqlite";
import { isCompaction } from "../model/injected";
import { callsOf, contentOf, promptText, shellOutput, type Rec } from "../model/record";
import { firstLine } from "../model/title";
import { describeCall, oneLine, resultFailed, resultText } from "../model/tools";
import { endingOf, groupTurns, kindOf, lastActive, mayBeRunning, type Ending, type Turn } from "../model/turns";
import { displayPath } from "../platform/paths";
import { ancestors, failureOf, LookupError, sessionRecords, shortId, uidsOf, unknownIn, type Ancestor, type SessionRow } from "../store/queries";
import { coloredLabel, type Style } from "./labels";
import { ago, padStart, plural, size, span, trimmedLines, truncate, when, width, wrap } from "./text";

export interface ShowModel {
  session: SessionRow;
  records: Rec[];
  turns: Turn[];
  /** Turn number → the session the turns before it came from, and how (a continuation or fork point). */
  separators: Map<number, Ancestor>;
  /** The short id of the session this one was continued in, if any. */
  continuedIn: string | null;
  ending: Ending;
  /** What meme could not read of it (arch.md §6.1): said under the header. */
  notes: string[];
}

/** A session meme cannot read any more, or with records it does not know (arch.md §6.1, points 2 and 4). */
export function readNotes(db: Database, session: SessionRow, now: number): string[] {
  const notes: string[] = [];
  if (session.unreadable && session.readable_until) {
    notes.push(`meme can't read this session's file any more (${failureOf(db, session.id) ?? "unknown error"}): this is the session as of ${when(session.readable_until, new Date(now))}; what came after is missing. See \`meme status\`.`);
  }
  const unknown = unknownIn(db, session.id, "unknown");
  const n = unknown.reduce((a, u) => a + u.count, 0);
  if (n) notes.push(`${plural(n, "record")} meme couldn't read (${unknown.map((u) => u.type).join(", ")}); see \`meme status\`.`);
  // The second layer: lines of types meme knows that became nothing (plan §6 ⑦.1).
  const unread = unknownIn(db, session.id, "unread");
  const m = unread.reduce((a, u) => a + u.count, 0);
  if (m) notes.push(`${plural(m, "record")} of known types meme couldn't read (${unread.map((u) => u.type).join(", ")}); see \`meme status\`.`);
  return notes;
}

export function buildShow(db: Database, session: SessionRow, now = Date.now()): ShowModel {
  const records = sessionRecords(db, session.id);
  const { turns } = groupTurns(records);
  const continuedIn = session.continued_in ? shortId(db, session.continued_in) : null;
  return { session, records, turns, separators: continuationPoints(db, session, turns), continuedIn, ending: endingOf(records), notes: readNotes(db, session, now) };
}

/**
 * Where the chain changes hands. B continued from A (or forked from it) starts
 * with A's records; a turn belongs to the oldest session that has its prompt.
 */
function continuationPoints(db: Database, session: SessionRow, turns: Turn[]): Map<number, Ancestor> {
  const out = new Map<number, Ancestor>();
  const chain = ancestors(db, session.id);
  if (chain.length === 0) return out;
  const sets = chain.map((p) => ({ ...p, uids: uidsOf(db, p.id) }));
  const forkParent = chain.at(-1)?.link === "forked" ? chain.at(-1)! : null;
  const originOf = (t: Turn) => {
    const rec = t.prompt ?? t.records[0];
    const found = rec?.uid ? sets.find((s) => s.uids.has(rec.uid!)) : undefined;
    if (found) return found;
    // A fork keeps what it took from its parent even after the parent rolled that part back.
    if (forkParent && session.fork_point !== null && rec && rec.seq < session.fork_point) return forkParent;
    return null;
  };
  let prev: Ancestor | null | undefined;
  for (const t of turns) {
    const origin = originOf(t);
    if (prev && origin?.id !== prev.id) out.set(t.n, { id: prev.id, short: prev.short, link: prev.link });
    prev = origin;
  }
  return out;
}

export interface ShowOptions {
  st: Style;
  /** Line width; lines are cut (plain) or wrapped (terminal) to it. */
  width: number;
  home: string;
  now: number;
  /** Tool results and injected messages in full, nothing cut. */
  full: boolean;
  /** Also injected messages and reasoning. */
  /** `--hidden`: also injected messages and reasoning. */
  hidden: boolean;
  /** Wrap long lines instead of cutting them (the interactive viewer). */
  wrap: boolean;
}

export function headerLines(m: ShowModel, o: ShowOptions): string[] {
  const s = m.session;
  const title = `${o.st.bold(s.title ?? "(untitled)")}  [${coloredLabel(o.st, s.agent, s.env)}]`;
  const facts = [
    s.project ? displayPath(s.project, o.home) : null,
    s.branch,
    span(s.started_at, s.ended_at, new Date(o.now)),
    plural(m.turns.length ? m.turns[m.turns.length - 1]!.n : 0, "turn"),
    size(s.size),
    s.archived ? "archived" : null,
  ].filter(Boolean);
  return [title, o.st.dim(facts.join(" · ")), ...m.notes.map((n) => o.st.yellow(n))];
}

export function endingLine(m: ShowModel, o: ShowOptions): string {
  const text: Record<Ending, string> = {
    finished: "Last turn finished",
    interrupted: "Last turn was interrupted",
    unfinished: "Last turn did not finish (it stopped at a tool call or without a reply)",
  };
  let line = text[m.ending];
  const active = lastActive(m.session.ended_at);
  if (mayBeRunning(active, o.now)) line += `; it was active ${ago(new Date(active!).toISOString(), o.now, true)}, it may still be running`;
  return line;
}

export function numberWidth(m: ShowModel): number {
  return String(m.turns.length ? m.turns[m.turns.length - 1]!.n : 0).length;
}

export function separatorLine(from: Ancestor, o: ShowOptions): string {
  return o.st.dim(`  ── ${from.link} from ${from.short} ──`);
}

/** Where the agent compacted its context (handoff.md §7.3). */
const COMPACTED = "── compacted here ──";

const RESULT_LINES = 3;

export function stepFacts(t: Turn): string[] {
  const facts: string[] = [];
  if (t.steps) facts.push(plural(t.steps, "step"));
  if (t.commands) facts.push(plural(t.commands, "command"));
  if (t.edited.length) facts.push(`edited ${plural(t.edited.length, "file")}`);
  if (t.failed) facts.push(`${t.failed} failed`);
  if (t.interrupted) facts.push("interrupted");
  return facts;
}

function promptOf(t: Turn): string {
  const c = t.prompt ? contentOf(t.prompt.body) : null;
  return c === null ? "" : promptText(c);
}

/** One turn folded into at most three lines (list.md §6, style B). */
export function foldedTurn(t: Turn, numW: number, o: ShowOptions, selected = false): string[] {
  const indent = " ".repeat(2 + numW + 3);
  const room = Math.max(10, o.width - indent.length);
  const prompt = promptOf(t);
  const head = firstLine(prompt);
  const more = trimmedLines(prompt).length > 1 || width(head) > room;
  const num = padStart(String(t.n), numW);
  const out = [`  ${selected ? o.st.inverse(num) : o.st.bold(num)} ${o.st.cyan("❯")} ${truncate(head, room) + (more && width(head) <= room ? "…" : "")}`];
  const facts = stepFacts(t);
  if (facts.length) out.push(indent + o.st.dim("▸ " + facts.join(" · ")));
  if (t.reply) {
    const r = firstLine(t.reply);
    const cut = truncate(r, room - 2);
    const tail = cut === r && trimmedLines(t.reply).length > 1 ? "…" : "";
    out.push(indent + "● " + cut + tail);
  }
  if (t.compactions.length) out.push(o.st.dim("  " + COMPACTED));
  return out;
}

/** One turn in full, a line per step (list.md §6, style A). */
export function expandedTurn(t: Turn, numW: number, o: ShowOptions, selected = false): string[] {
  const indent = " ".repeat(2 + numW + 3);
  const out: string[] = [];
  const room = Math.max(10, o.width - indent.length - 2);
  // What people said is never cut (wrapped on screen); tool output is cut unless --full.
  const prose = (s: string): string[] => (o.wrap ? wrap(s, room) : [s]);
  const detail = (s: string): string[] => (o.full ? prose(s) : [truncate(s, room)]);
  const push = (mark: string, text: string[], style: (s: string) => string = (s) => s, fit = detail) => {
    text.forEach((line, i) => {
      for (const [j, piece] of fit(line).entries()) out.push(indent + (i === 0 && j === 0 ? mark : "  ") + style(piece));
    });
  };
  const limited = (text: string, max = RESULT_LINES): string[] => {
    const all = trimmedLines(text);
    if (o.full || all.length <= max) return all.length ? all : ["(empty)"];
    return [...all.slice(0, max), o.st.dim(`… ${plural(all.length - max, "more line")}`)];
  };

  const results = new Map<string, Rec>();
  for (const rec of t.records) if (rec.body.role === "tool") results.set(rec.body.tool_call_id, rec);
  const shown = new Set<Rec>();

  const num = padStart(String(t.n), numW);
  for (const rec of t.records) {
    if (shown.has(rec)) continue;
    const body = rec.body;
    const kind = kindOf(rec);
    if (isCompaction(rec.injected)) {
      out.push(indent + o.st.dim(COMPACTED));
      // The summary is the agent's, not the AI speaking in this turn: only with --hidden.
      if (o.hidden && rec.injected === "compact_summary") push(o.st.dim("⚙ "), limited(contentOf(body) ?? ""), o.st.dim);
      continue;
    }
    if (rec === t.prompt) {
      const text = trimmedLines(promptOf(t));
      const head = `  ${selected ? o.st.inverse(num) : o.st.bold(num)} ${o.st.cyan("❯")} `;
      text.forEach((line, i) => {
        for (const [j, piece] of prose(line).entries()) out.push((i === 0 && j === 0 ? head : indent) + piece);
      });
      // Some agents record a `!` command and its output together.
      const output = shellOutput(contentOf(body) ?? "");
      if (output !== null) push(o.st.dim("⎿ "), limited(resultText(output)), o.st.dim);
      continue;
    }
    if (kind === "injected") {
      if (o.hidden) push(o.st.dim("⚙ "), limited(contentOf(body) ?? ""), o.st.dim);
      else out.push(indent + o.st.dim("⚙ injected message (hidden)"));
      continue;
    }
    if (kind === "interrupt") {
      out.push(indent + o.st.yellow("⏹ " + oneLine(contentOf(body) ?? "")));
      continue;
    }
    if (kind === "output" || kind === "prompt") {
      push("⎿ ", limited(promptText(contentOf(body) ?? "")));
      continue;
    }
    if (body.role === "reasoning") {
      if (o.hidden) push(o.st.dim("∴ "), limited(body.content, o.full ? Infinity : 10), o.st.dim);
      continue;
    }
    if (body.role === "assistant" && "tool_calls" in body) {
      for (const call of callsOf(body)) {
        const result = results.get(call.id);
        const failed = result?.body.role === "tool" && resultFailed(result.body.ok, result.body.content);
        const { name, summary } = describeCall(call);
        const line = `${name}${summary ? "  " + summary : ""}`;
        out.push(indent + (failed ? o.st.red("✗ ") : o.st.green("● ")) + (o.full ? line : truncate(line, room)));
        if (result) {
          shown.add(result);
          const text = resultText(contentOf(result.body) ?? "");
          push(o.st.dim("⎿ "), limited(text), o.st.dim);
        }
      }
      continue;
    }
    if (body.role === "assistant") {
      push("● ", trimmedLines(body.content), undefined, prose);
      continue;
    }
    if (body.role === "tool") {
      push(o.st.dim("⎿ "), limited(body.content), o.st.dim);
      continue;
    }
    if (body.role === "system" || body.role === "observation") {
      push(o.st.dim("⚙ "), limited(body.content), o.st.dim);
    }
  }
  return out;
}

/** The whole session as plain text: folded, or with the given turns expanded. */
export function showText(m: ShowModel, o: ShowOptions, expand: "none" | "all" | number): string {
  const out = headerLines(m, o);
  const numW = numberWidth(m);
  const id = m.session.short;
  if (typeof expand === "number") {
    const t = m.turns.find((x) => x.n === expand);
    if (!t) throw new LookupError(`session ${id} has ${plural(m.turns.length ? m.turns[m.turns.length - 1]!.n : 0, "turn")}; there is no turn ${expand}`);
    out.push(...expandedTurn(t, numW, o));
    return out.join("\n") + "\n";
  }
  for (const t of m.turns) {
    const from = m.separators.get(t.n);
    if (from) out.push(separatorLine(from, o));
    out.push(...(expand === "all" ? expandedTurn(t, numW, o) : foldedTurn(t, numW, o)));
  }
  if (m.turns.length === 0) out.push(o.st.dim("  (no conversation)"));
  if (m.continuedIn) out.push(o.st.dim(`  ── continued in ${m.continuedIn}: run \`meme show ${m.continuedIn}\` ──`));
  out.push(o.st.dim(endingLine(m, o) + "."));
  if (expand === "none" && m.turns.length) {
    out.push(`Run \`meme show ${id} <turn>\` to expand a turn, or \`meme show ${id} --full\` for everything.`);
  }
  return out.join("\n") + "\n";
}
