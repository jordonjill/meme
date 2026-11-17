import type { Database } from "bun:sqlite";
import { appendFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { profileOf } from "../adapters/profiles";
import { estimateTokens } from "../handoff/budget";
import { allSessions, sessionRecords, type SessionRow } from "../store/queries";
import { apply, type NewEvidence, type Op } from "./apply";
import { ModelError, parseAnswer, type Ask, type Proposed } from "./model";
import { projectRef, type ProjectRef } from "./projects";
import { memoryPaths, readText, shelvesIn, type MemoryPaths } from "./store";
import { pieces, shown, transcript, type Shown } from "./transcript";
import { normalize, type Entry, type Shelf, type Tier } from "./types";

/**
 * The pipeline (memory-v0.3-draft §6): sessions that have gone quiet are read by a
 * model, which says what is worth keeping; meme checks that the words it quotes are
 * in the session and writes through apply(). The judging is the model's. meme only
 * sees to it that every memory rests on words that were really said.
 */

export const SYSTEM = `You keep the long-term memory that a person's coding agents share. You are given part of one session between that person (the user) and a coding agent, and what the memory already holds. Decide what in this session is worth keeping for later sessions, in this or any other agent.

Keep only what will still matter once this task is done:
- rules the user states for how agents should work ("always", "never", "from now on");
- facts about the user or their machines that an agent would otherwise have to ask again;
- facts about the project that its files do not plainly say: decisions and their reasons, how it is built, run and tested, what depends on what;
- experience: what was learned from how something turned out, such as a failure and what fixed it, or the user correcting the agent. Say what to do, and when it applies.

Do not keep: the progress or the details of the task itself; requests meant for this once; what the memory already holds; secrets; personal matters that have nothing to do with the work.

Most sessions hold little or nothing worth keeping. An empty list is a good answer.

Every memory must rest on words that are in the session. Copy them exactly into "quote", and give the number of the record they are in as "at": the number after # in that record's heading. A memory whose quote is not found in that record is thrown away. Prefer the user's own words.

Write each memory as one clear sentence, in the language the user writes in.

If a memory makes an entry of the existing memory out of date, give that entry's id as "replaces". If an existing entry already says the same, do not repeat it; only when the session gives new support for it, return it with that entry's id as "supports".

Answer with JSON only, in this form:
{"memories": [{"text": "...", "kind": "fact", "about": "rule", "quote": "...", "at": 12}]}
"kind" is "fact" or "experience". "about" is "rule" (how every agent should work with the user), "user" (the user and their machines) or "project" (this project). Optional: "when" (for experience, the situation it applies in), "why", "replaces", "supports".`;

/** A session is read once nothing has been added to it for this long. */
export const QUIET_MS = 2 * 60 * 60 * 1000;
/** A session never read that ended longer ago than this many days is set aside; `--all` reads those too. */
export const FIRST_RUN_DAYS = 14;
/** The most of a session given to the model in one question, in characters. */
const PIECE = 60_000;

interface Mark {
  session: string;
  /** The last record that was there when the session was read. */
  upto: number;
  at: string;
  model?: string;
  kept?: number;
  /** Not read, and why: `older` than what is read unasked. */
  skipped?: string;
}

const marksFile = (p: MemoryPaths) => path.join(p.state, "processed.jsonl");

/** How far each session has been read. */
export function readMarks(p: MemoryPaths): Map<string, Mark> {
  const marks = new Map<string, Mark>();
  for (const line of (readText(marksFile(p)) ?? "").split("\n")) {
    if (!line.trim()) continue;
    try {
      const m = JSON.parse(line) as Mark;
      marks.set(m.session, m);
    } catch {}
  }
  return marks;
}

function mark(p: MemoryPaths, m: Mark): void {
  mkdirSync(p.state, { recursive: true, mode: 0o700 });
  appendFileSync(marksFile(p), JSON.stringify(m) + "\n", { mode: 0o600 });
}

export interface Due {
  session: SessionRow;
  /** What of it has not been read yet, as the model will see it. */
  items: Shown[];
  /** The last record of the session, read or not. */
  upto: number;
  tokens: number;
  project: ProjectRef | null;
}

export interface PickOptions {
  now: number;
  /** Also sessions that were set aside for being old. */
  all?: boolean;
  /** Only this session, quiet or not. */
  only?: string;
  exclude: string[];
}

export interface Picked {
  due: Due[];
  /** Never read and too old to be read unasked, with their last record; a run sets them aside for good. */
  older: { session: SessionRow; upto: number }[];
}

export function pick(db: Database, p: MemoryPaths, opts: PickOptions): Picked {
  const marks = readMarks(p);
  const refs = new Map<string, ProjectRef>();
  const refOf = (project: string | null) => {
    if (!project) return null;
    if (!refs.has(project)) refs.set(project, projectRef(project));
    return refs.get(project)!;
  };
  const excluded = (s: SessionRow) => {
    const ref = refOf(s.project);
    return opts.exclude.some((x) => x === ref?.key || x === ref?.identity || (s.project !== null && (s.project === x || s.project.startsWith(x.replace(/[\\/]+$/, "") + path.sep) || s.project.startsWith(x.replace(/[\\/]+$/, "") + "/"))));
  };
  const out: Picked = { due: [], older: [] };
  for (const s of allSessions(db)) {
    if (opts.only && s.id !== opts.only) continue;
    if (!s.talked || (s.unreadable && !s.readable_until) || excluded(s)) continue;
    const ended = Date.parse(s.ended_at ?? "") || s.mtime || 0;
    if (!opts.only && opts.now - ended < QUIET_MS) continue;
    const before = marks.get(s.id);
    const from = before && !(before.skipped && opts.all) ? before.upto + 1 : 0;
    const records = sessionRecords(db, s.id);
    const items = shown(records, from);
    if (!items.length) continue;
    if (!opts.only && !opts.all && !before && opts.now - ended > FIRST_RUN_DAYS * 24 * 60 * 60 * 1000) {
      out.older.push({ session: s, upto: records.at(-1)?.seq ?? -1 });
      continue;
    }
    out.due.push({ session: s, items, upto: records.at(-1)?.seq ?? -1, tokens: estimateTokens(transcript(items)), project: refOf(s.project) });
  }
  return out;
}

export interface SessionResult {
  session: SessionRow;
  kept: number;
  /** Of the kept: in force at once, or waiting as candidates. */
  active: number;
  /** Why each one that was not kept was not. */
  dropped: string[];
}

export interface RunOptions {
  dataDir: string;
  /** What the model is called, for the record. */
  model: string;
  now: number;
  /** A secret that must not be sent, like the model's own key. */
  secret?: string;
  onSession?: (r: SessionResult) => void;
}

const TIER: Record<Shown["speaker"], Tier> = { user: "stated", tool: "observed", agent: "inferred" };

function shelfFor(item: Proposed, project: ProjectRef | null): Shelf | null {
  if (item.about === "project") return project ? { level: "project", project: project.key, file: item.kind === "experience" ? "EXPERIENCE" : "MEMORY" } : null;
  if (item.kind === "experience") return { level: "user", file: "EXPERIENCE" };
  return { level: "user", file: item.about === "user" ? "USER" : "RULES" };
}

/** What memory holds for a project and for the user, in force or waiting: what the model is shown, so that it does not repeat it. */
function held(p: MemoryPaths, project: ProjectRef | null): Entry[] {
  return shelvesIn(p.memory)
    .filter((s) => s.shelf.level === "user" || s.shelf.project === project?.key)
    .flatMap((s) => s.entries.filter((e) => e.status === "active" || e.status === "candidate"));
}

/** Asks, and once more when the answer cannot be read. */
async function memoriesIn(ask: Ask, user: string): Promise<Proposed[]> {
  try {
    return parseAnswer(await ask(SYSTEM, user));
  } catch (err) {
    if (!(err instanceof ModelError) || !/^the model('s answer| did not answer)/.test(err.message)) throw err;
    return parseAnswer(await ask(SYSTEM, `${user}\n\nAnswer with JSON only, in the form described.`));
  }
}

/**
 * Reads the sessions that are due. A session is marked as read when all of it went
 * through; when the model fails, the run stops there and that session stays unread.
 */
export async function run(due: Due[], older: Picked["older"], ask: Ask, opts: RunOptions): Promise<SessionResult[]> {
  const p = memoryPaths(opts.dataDir);
  const results: SessionResult[] = [];
  const at = new Date(opts.now).toISOString();
  for (const o of older) mark(p, { session: o.session.id, upto: o.upto, at, skipped: "older" });
  for (const d of due) {
    const result: SessionResult = { session: d.session, kept: 0, active: 0, dropped: [] };
    const agent = profileOf(d.session.agent).name;
    const label = `${agent} · ${d.project ? d.project.identity.replace(/[\\/]+$/, "").split(/[\\/]/).pop() : "no project"}`;
    for (const piece of pieces(d.items, PIECE)) {
      const holds = held(p, d.project);
      const text = transcript(piece);
      const question = [
        `Project: ${d.project?.identity ?? "(none)"}`,
        `Agent: ${agent}`,
        "",
        "What the memory already holds for here:",
        holds.length ? holds.map((e) => `[${e.id}] ${e.text}`).join("\n") : "(nothing yet)",
        "",
        `The session, records #${piece[0]!.seq} to #${piece.at(-1)!.seq}:`,
        opts.secret && opts.secret.length >= 8 ? text.split(opts.secret).join("[REDACTED]") : text,
      ].join("\n");
      const proposed = await memoriesIn(ask, question);

      const evidence: NewEvidence[] = [];
      const ops: Op[] = [];
      for (const item of proposed) {
        const wanted = normalize(item.quote);
        const has = (s: Shown) => normalize(s.text).includes(wanted);
        // The one thing meme insists on: the words are in the session. A model may get the
        // record's number wrong; then the record that has them is the one, and who said them goes by it.
        const record = wanted.length < 4 ? undefined : (piece.find((s) => s.seq === item.at && has(s)) ?? piece.find(has));
        if (!record) {
          result.dropped.push("its quote is not in the session");
          continue;
        }
        const shelf = shelfFor(item, d.project);
        if (!shelf) {
          result.dropped.push("it is about a project, and the session has none");
          continue;
        }
        evidence.push({
          kind: item.kind,
          tier: TIER[record.speaker],
          speaker: record.speaker,
          scope: shelf.level === "project" ? `project:${shelf.project}` : "user",
          source: `session:${d.session.id}#${record.seq}`,
          content: item.text,
          quote: item.quote,
          at: new Date(Date.parse(record.ts ?? d.session.ended_at ?? "") || opts.now),
          label,
        });
        const entry = { shelf, text: item.text, kind: item.kind, evidence: [evidence.length - 1], project: d.project?.identity, ...(item.when ? { when: item.when } : {}), ...(item.why ? { why: item.why } : {}) };
        ops.push(item.supports ? { op: "update", id: item.supports, evidence: [evidence.length - 1] } : item.replaces ? { op: "replace", id: item.replaces, ...entry } : { op: "add", ...entry });
      }
      if (!ops.length) continue;
      const done = await apply(opts.dataDir, { origin: "pipeline", evidence, ops }, { verify: () => true });
      const now = new Map(held(p, d.project).map((e) => [e.id, e] as const));
      for (const outcome of done.outcomes) {
        if (!outcome.ok) {
          result.dropped.push(outcome.reason);
          continue;
        }
        result.kept++;
        if (now.get(outcome.id)?.status === "active") result.active++;
      }
    }
    mark(p, { session: d.session.id, upto: d.upto, at, model: opts.model, kept: result.kept });
    results.push(result);
    opts.onSession?.(result);
  }
  return results;
}
