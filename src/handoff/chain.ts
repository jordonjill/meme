/**
 * The relay chain (handoff.md §7.3, A1). A session continued from a handoff has
 * meme's output in its records: a tool result, or the output of `!`. Its header
 * names the session handed over, whose user messages are fetched from the mirror
 * again, and so on up the chain. Nothing about the chain is stored; it is worked
 * out from the records each time.
 */
import { callsOf, contentOf, promptText, shellOutput, type Rec } from "../model/record";
import { PROFILES } from "../adapters/profiles";
import { LONG_OUTPUTS } from "../model/formats";
import { commandOf, resultText } from "../model/tools";
import { groupTurns, kindOf } from "../model/turns";
import type { SessionRow } from "../store/queries";
import { parts } from "./commands";

export interface Message {
  /** The turn it started, in its own session. */
  n: number;
  text: string;
}

export interface Upstream {
  /** The session's id as meme shows it; when it is gone, as the handoff named it. */
  short: string;
  /** The session it was handed over into; null for the one being handed over now. */
  into: string | null;
  session: SessionRow | null;
  messages: Message[];
  /** Where the messages come from: the mirror, the handoff recorded downstream (the session is gone), or nowhere. */
  from: "mirror" | "record" | "gone";
}

/** Finds a session by the start of its id; `before` is when it was handed over, to tell apart sessions sharing a start. */
export type Lookup = (ref: string, before: string | null) => { session: SessionRow; records: Rec[] } | null;

/** The header meme prints first (plan §4.6.6). */
const HEADER = /^# Handoff: [^\n]*\r?\nSource: [^\n]*?\bsession ([0-9a-f]{4,36})\b/;
/** `meme continue <target>` on its own: how a handoff is pulled, by the user with `!` or by the agent. */
const PULL = /^\s*(?:\S*[\\/])?meme(?:\.exe)?\s+continue(?:\s+[^\s|&;<>`$()]+)*\s*$/;
/** At most this many lines may come before a handoff's header: what the command printed first (`command -v meme`). */
const LINES_BEFORE = 5;
/** 2026-10-10, development only: the first message attached a handoff file named after the session. */
const HANDOFF_FILE = /^@\S*?[\\/]\.meme[\\/]handoffs[\\/]([0-9a-f]{8})-\d{8}-\d{4}\.md$/;
/** The first message meme starts an agent with (plan §2.3, the agents' profiles), up to the command. */
const LAUNCHES = PROFILES.map((p) => p.firstMessage("\u0000").split("\u0000")[0]! + "meme continue ");

/** The session a launch message asks the agent to hand over, e.g. `7e629e49`. */
function launchTarget(prompt: string): string | null {
  const l = LAUNCHES.find((x) => prompt.startsWith(x));
  return l ? (/^[0-9a-f][0-9a-f-]{3,}/i.exec(prompt.slice(l.length))?.[0]?.toLowerCase() ?? null) : null;
}

/**
 * In a turn meme started with its launch message, the agent may wrap the command
 * it was asked to run (`2>&1 | head -200`, `command -v meme;` before it): B4 of
 * the step 5 checks, plan §6 ⑧.3. One of the segments runs `meme continue <target>`.
 * Elsewhere such a command is someone looking at a handoff, not taking one over.
 */
function pullsTarget(command: string, target: string): boolean {
  return parts(command).some((p) => {
    const [name = "", sub, ref = ""] = p.words;
    const r = ref.toLowerCase();
    return /^meme(?:\.exe)?$/i.test(name.split(/[\\/]/).pop()!) && sub === "continue" && r.length >= 4 && (r.startsWith(target) || target.startsWith(r));
  });
}

const MAX_DEPTH = 8;

/**
 * A prompt that only drives meme: `! meme continue 2`, the message meme starts an
 * agent with, or the skill of the first drafts. Not the user's words about the work.
 */
export function isMemeCommand(prompt: string): boolean {
  const t = prompt.trim();
  return /^!\s*(?:\S*[\\/])?meme(?:\.exe)?(?:\s|$)/.test(t) || LAUNCHES.some((l) => t.startsWith(l)) || HANDOFF_FILE.test(t) || /^\/meme(?:\s|$)/.test(t);
}

/** The user's messages in a session, without meme's own commands. */
export function messagesOf(records: Rec[]): Message[] {
  return groupTurns(records)
    .turns.filter((t) => t.prompt)
    .map((t) => ({ n: t.n, text: promptText(contentOf(t.prompt!.body) ?? "").trim() }))
    .filter((m) => !isMemeCommand(m.text));
}

interface Found {
  ref: string;
  ts: string | null;
  /** The handoff as recorded, from its header on; null when only the id is known. */
  text: string | null;
}

/**
 * The handoff a command printed, if its output is one: meme's notes on stderr, an
 * agent's note on a long output ("Output too large … Preview") and a few lines the
 * command printed first may come before it.
 */
function handoffOutput(output: string): string | null {
  const text = LONG_OUTPUTS.reduce((t, re) => t.replace(re, ""), output).replace(/^(?:meme: [^\n]*\n)+/, "");
  let at = 0;
  for (const line of text.split("\n", LINES_BEFORE + 1)) {
    if (line.startsWith("# Handoff: ")) return HEADER.test(text.slice(at)) ? text.slice(at) : null;
    at += line.length + 1;
  }
  return null;
}

/**
 * Handoffs pulled into these records, in order: the output of a plain `meme
 * continue …`, typed with `!` or run by the agent, or of the command an agent ran
 * for meme's launch message; when the agent saved a long output to a file, the
 * preview it kept. A handoff merely shown on the way (piped into `head` while
 * working, read from a file, printed by a test) does not count.
 */
export function handoffsIn(records: Rec[]): Found[] {
  const out: Found[] = [];
  const commands = new Map<string, string>();
  let lastPrompt = "";
  let target: string | null = null;
  const add = (r: Rec, output: string | null) => {
    const text = output === null ? null : handoffOutput(output);
    if (text) out.push({ ref: HEADER.exec(text)![1]!, ts: r.ts, text });
  };
  for (const r of records) {
    const body = r.body;
    for (const call of callsOf(body)) {
      const command = commandOf(call);
      if (command) commands.set(call.id, command);
    }
    if (body.role === "tool") {
      const command = commands.get(body.tool_call_id) ?? "";
      if (PULL.test(command) || (target && pullsTarget(command, target))) add(r, resultText(body.content));
      continue;
    }
    if (body.role !== "user") continue;
    const kind = kindOf(r);
    if (kind === "prompt") {
      lastPrompt = promptText(body.content).trim();
      target = launchTarget(lastPrompt);
      const file = HANDOFF_FILE.exec(lastPrompt);
      if (file) out.push({ ref: file[1]!, ts: r.ts, text: null });
      // Some agents record a `!` command and its output together.
      const shell = shellOutput(body.content);
      if (shell !== null && PULL.test(lastPrompt.slice(1))) add(r, resultText(shell));
    } else if (kind === "output" && lastPrompt.startsWith("!") && PULL.test(lastPrompt.slice(1))) add(r, shellOutput(body.content) ?? body.content);
  }
  return out;
}

/** Numbered items of a section: `1. text`, continued on lines indented by three spaces; `↳` lines are not part of them. */
function items(lines: string[]): Message[] {
  const out: Message[] = [];
  for (const line of lines) {
    const m = /^(\d+)\. (.*)$/.exec(line);
    if (m) out.push({ n: Number(m[1]), text: m[2]! });
    else if (out.length && line.startsWith("   ") && !line.startsWith("   ↳ ")) out[out.length - 1]!.text += "\n" + line.slice(3);
    else if (out.length && line === "") out[out.length - 1]!.text += "\n";
  }
  return out.map((m) => ({ ...m, text: m.text.trim() })).filter((m) => !isMemeCommand(m.text));
}

/**
 * The user messages a recorded handoff carries, for when its session is gone
 * (forgotten): its own, and those of the sessions before it.
 */
export function parseHandoff(text: string, ref: string): { messages: Message[]; earlier: Upstream[] } | null {
  let messages: Message[] | null = null;
  const earlier: Upstream[] = [];
  for (const section of text.split(/\n(?=## )/)) {
    const [heading = "", ...rest] = section.split("\n");
    if (/^## User messages\b/.test(heading)) messages = items(rest);
    const e = /^## Earlier session ([0-9a-f]{4,36}) \(handed over into (this one|[0-9a-f]{4,36})\b/.exec(heading);
    if (e) earlier.push({ short: e[1]!, into: e[2] === "this one" ? ref : e[2]!, session: null, messages: items(rest), from: "record" });
  }
  return messages ? { messages, earlier } : null;
}

export interface Chain {
  /** Oldest first: each session after the ones handed over into it. */
  upstream: Upstream[];
  /** Sessions in the chain left out because the agent running meme is in them (S3, switching back). */
  current: string[];
}

/** The sessions handed over into this one, and into those (handoff.md §7.3, A1). */
export function relayChain(records: Rec[], self: string, lookup: Lookup, running: Set<string>): Chain {
  const chain: Chain = { upstream: [], current: [] };
  const seen = new Set([self]);
  /** A session in the mirror, handed over into `into` at `ts`: the ones before it first. */
  const visit = (found: { session: SessionRow; records: Rec[] }, into: string | null, ts: string | null, depth: number) => {
    const s = found.session;
    // The agent asking already has that session in its context.
    if (running.has(s.id)) {
      chain.current.push(s.short);
      return;
    }
    // What it had when it was handed over.
    const cut = ts ? Date.parse(ts) : NaN;
    const before = Number.isNaN(cut) ? found.records : found.records.filter((r) => !r.ts || !(Date.parse(r.ts) > cut));
    if (depth < MAX_DEPTH) walk(before, s.short, depth + 1);
    chain.upstream.push({ short: s.short, into, session: s, messages: messagesOf(before), from: "mirror" });
  };
  const walk = (recs: Rec[], into: string | null, depth: number) => {
    for (const h of handoffsIn(recs)) {
      const found = lookup(h.ref, h.ts);
      const key = found ? found.session.id : `ref:${h.ref}`;
      if (seen.has(key)) continue;
      seen.add(key);
      if (found) {
        visit(found, into, h.ts, depth);
        continue;
      }
      // Gone from the mirror: what the handoff recorded here says, and the sessions before it, from the mirror where they still are.
      const parsed = h.text ? parseHandoff(h.text, h.ref) : null;
      for (const e of parsed?.earlier ?? []) {
        const there = lookup(e.short, h.ts);
        const k = there ? there.session.id : `ref:${e.short}`;
        if (seen.has(k)) continue;
        seen.add(k);
        if (there) visit(there, e.into, h.ts, depth + 1);
        else chain.upstream.push(e);
      }
      chain.upstream.push({ short: h.ref, into, session: null, messages: parsed?.messages ?? [], from: parsed ? "record" : "gone" });
    }
  };
  walk(records, null, 0);
  return chain;
}
