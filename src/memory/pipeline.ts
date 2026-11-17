import type { Database } from "bun:sqlite";
import { appendFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { profileOf } from "../adapters/profiles";
import { estimateTokens } from "../handoff/budget";
import { allSessions, sessionRecords, type SessionRow } from "../store/queries";
import { apply, type Change, type NewEvidence, type Op, type Origin } from "./apply";
import { ModelError, parseAnswer, type Ask, type Proposed } from "./model";
import { projectRef, type ProjectRef } from "./projects";
import { memoryPaths, readText, shelvesIn, writeFileAtomic, type MemoryPaths } from "./store";
import { pieces, shown, transcript, type Shown } from "./transcript";
import { normalize, type Entry, type Shelf, type Tier } from "./types";

/**
 * The pipeline (memory-v0.3-draft §6): sessions that have gone quiet are read by a
 * model, which says what is worth keeping; meme checks that the words it quotes are
 * in the session and writes through apply(). The judging is the model's. meme only
 * sees to it that every memory rests on words that were really said.
 */

/** How a memory is written, whoever asks for it: the same rules for the pipeline and for `remember`. */
const WRITING = `Every memory must rest on words that are in the records. Copy them exactly into "quote", and give the number of the record they are in as "at": the number after # in that record's heading. A memory whose quote is not found in that record is thrown away. Prefer the user's own words.

Write each memory as one clear sentence that stands on its own, in the language the user writes in. One memory says one thing. A memory about the project is kept with that project: do not name the project in it.

If a memory makes an entry of the existing memory out of date, give that entry's id as "replaces". If an existing entry already says the same, do not repeat it; return it with that entry's id as "supports" when the records give new support for it.

Answer with JSON only, in this form:
{"memories": [{"text": "...", "kind": "fact", "about": "rule", "quote": "...", "at": 12}]}
"kind" is "fact" or "experience". "about" is "rule" (how every agent should work with the user), "user" (the user and their machines) or "project" (this project). Optional: "when" (for experience, the situation it applies in), "why", "replaces", "supports".`;

/** The pipeline: reading a session for what is worth keeping. */
export const SYSTEM = `You keep the long-term memory that a person's coding agents share. You are given part of one session between that person (the user) and a coding agent, and what the memory already holds. Decide what in this session is worth keeping for later sessions, in this or any other agent.

Keep only what will still matter once this task is done:
- rules the user states for how agents should work ("always", "never", "from now on");
- facts about the user or their machines that an agent would otherwise have to ask again;
- facts about the project that its files do not plainly say: decisions and their reasons, how it is built, run and tested, what depends on what;
- experience: what was learned from how something turned out, such as a failure and what fixed it, or the user correcting the agent. Say what to do, and when it applies.

Do not keep: the progress or the details of the task itself; requests meant for this once; what the memory already holds; secrets; personal matters that have nothing to do with the work.

Most sessions hold little or nothing worth keeping. An empty list is a good answer.

${WRITING}`;

/** `remember`: the user asked for something to be kept; the model words it. */
export const KEEP_SYSTEM = `You keep the long-term memory that a person's coding agents share. The person (the user) asked for something to be remembered. You are given the user's words, the records around them when there are any, and what the memory already holds. Write what the user asked to keep, so that any agent reading it later understands it.

Keep what the user asked for, and nothing else from the records. Usually that is one memory; more only when the user said several separate things. Leave out what is meant for this once, like a request about the task at hand. If the memory already holds it, return it as "supports" instead of writing it again; if it changes what the memory holds, say which entry it "replaces".

${WRITING}`;

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

/** Is a project on the list of those never sent to the model: by what it is known by, its path, or a folder above it? */
export function isExcluded(project: string | null, ref: ProjectRef | null, list: string[]): boolean {
  return list.some((x) => {
    if (x === ref?.key || x === ref?.identity) return true;
    if (project === null) return false;
    const dir = x.replace(/[\\/]+$/, "");
    return project === x || project.startsWith(dir + path.sep) || project.startsWith(dir + "/");
  });
}

export interface PickOptions {
  now: number;
  /** Also sessions that were set aside for being old. */
  all?: boolean;
  /** Only this session, quiet or not. */
  only?: string;
  exclude: string[];
  /** The most sessions to read in one run, the latest first; the rest wait for the next. */
  limit?: number;
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
  const excluded = (s: SessionRow) => isExcluded(s.project, refOf(s.project), opts.exclude);
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
  if (opts.limit !== undefined) out.due = out.due.slice(0, opts.limit);
  return out;
}

/** When the pipeline last started, for starting it by itself only now and then. */
export function lastUpdate(p: MemoryPaths): number {
  return Date.parse(readText(path.join(p.state, "last-update"))?.trim() ?? "") || 0;
}

export function markUpdate(p: MemoryPaths, now: number): void {
  writeFileAtomic(path.join(p.state, "last-update"), new Date(now).toISOString() + "\n");
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
async function memoriesIn(ask: Ask, system: string, user: string): Promise<Proposed[]> {
  try {
    return parseAnswer(await ask(system, user));
  } catch (err) {
    if (!(err instanceof ModelError) || !/^the model('s answer| did not answer)/.test(err.message)) throw err;
    return parseAnswer(await ask(system, `${user}\n\nAnswer with JSON only, in the form described.`));
  }
}

/** One entry kept from what the model proposed. */
export interface Kept {
  id: string;
  file: string;
  change: Change;
  /** In force now, or waiting as a candidate. */
  active: boolean;
}

export interface Proposing {
  dataDir: string;
  /** Who is asking: the pipeline, the user, or an agent on the user's behalf. */
  origin: Origin;
  system: string;
  /** What comes before the records in the question. */
  intro: string[];
  /** Says which records follow. */
  heading: string;
  project: ProjectRef | null;
  /** Where each record is, for the evidence. */
  source: (record: Shown) => string;
  label: string;
  /** When the words were said, when the record does not say. */
  at: number;
  /** A secret that must not be sent, like the model's own key. */
  secret?: string;
  /** Tells apart two sayings of the same words from the same source. */
  salt?: string;
}

/**
 * Asks the model what to keep from some records, and writes what rests on words
 * that are really there (memory-v0.3-draft §6.1): the judging is the model's, the
 * check and the writing are meme's.
 */
export async function proposeAndKeep(piece: Shown[], ask: Ask, o: Proposing): Promise<{ kept: Kept[]; dropped: string[]; proposed: number }> {
  const p = memoryPaths(o.dataDir);
  const holds = held(p, o.project);
  const text = transcript(piece);
  const question = [
    ...o.intro,
    "What the memory already holds for here:",
    holds.length ? holds.map((e) => `[${e.id}] ${e.text}`).join("\n") : "(nothing yet)",
    "",
    o.heading,
    o.secret && o.secret.length >= 8 ? text.split(o.secret).join("[REDACTED]") : text,
  ].join("\n");
  const proposed = await memoriesIn(ask, o.system, question);

  const dropped: string[] = [];
  const evidence: NewEvidence[] = [];
  const ops: Op[] = [];
  for (const item of proposed) {
    const wanted = normalize(item.quote);
    const has = (s: Shown) => normalize(s.text).includes(wanted);
    // The one thing meme insists on: the words are in the records. A model may get the
    // record's number wrong; then the record that has them is the one, and who said them goes by it.
    const record = wanted.length < 4 ? undefined : (piece.find((s) => s.seq === item.at && has(s)) ?? piece.find(has));
    if (!record) {
      dropped.push("its quote is not in the session");
      continue;
    }
    const shelf = shelfFor(item, o.project);
    if (!shelf) {
      dropped.push("it is about a project, and the session has none");
      continue;
    }
    evidence.push({
      kind: item.kind,
      tier: TIER[record.speaker],
      speaker: record.speaker,
      scope: shelf.level === "project" ? `project:${shelf.project}` : "user",
      source: o.source(record),
      content: item.text,
      quote: item.quote,
      at: new Date(Date.parse(record.ts ?? "") || o.at),
      label: o.label,
      ...(o.salt ? { salt: o.salt } : {}),
    });
    const entry = { shelf, text: item.text, kind: item.kind, evidence: [evidence.length - 1], project: o.project?.identity, ...(item.when ? { when: item.when } : {}), ...(item.why ? { why: item.why } : {}) };
    ops.push(item.supports ? { op: "update", id: item.supports, evidence: [evidence.length - 1] } : item.replaces ? { op: "replace", id: item.replaces, ...entry } : { op: "add", ...entry });
  }
  const kept: Kept[] = [];
  if (ops.length) {
    const done = await apply(o.dataDir, { origin: o.origin, evidence, ops }, { verify: () => true });
    const now = new Map(held(p, o.project).map((e) => [e.id, e] as const));
    for (const outcome of done.outcomes) {
      if (!outcome.ok) dropped.push(outcome.reason);
      else kept.push({ id: outcome.id, file: outcome.file, change: outcome.change, active: now.get(outcome.id)?.status === "active" });
    }
  }
  return { kept, dropped, proposed: proposed.length };
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
      const got = await proposeAndKeep(piece, ask, {
        dataDir: opts.dataDir,
        origin: "pipeline",
        system: SYSTEM,
        intro: [`Project: ${d.project?.identity ?? "(none)"}`, `Agent: ${agent}`, ""],
        heading: `The session, records #${piece[0]!.seq} to #${piece.at(-1)!.seq}:`,
        project: d.project,
        source: (record) => `session:${d.session.id}#${record.seq}`,
        label,
        at: Date.parse(d.session.ended_at ?? "") || opts.now,
        secret: opts.secret,
      });
      result.kept += got.kept.length;
      result.active += got.kept.filter((k) => k.active).length;
      result.dropped.push(...got.dropped);
    }
    mark(p, { session: d.session.id, upto: d.upto, at, model: opts.model, kept: result.kept });
    results.push(result);
    opts.onSession?.(result);
  }
  return results;
}
