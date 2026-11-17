import { createHash } from "node:crypto";
import { appendFileSync, mkdirSync, rmSync } from "node:fs";
import path from "node:path";
import { redactText } from "../redact/rules";
import { formatShelf, preambleFor, shelfFile, shelfKey } from "./entries";
import { appended, dayAndTime, dayFile, days, parseDay, readAll, without } from "./evidence";
import { withLock, type LockOptions } from "./lock";
import {
  addTombstones,
  bumpVersion,
  checkFormat,
  ensureFormat,
  memoryPaths,
  pruneSnapshots,
  readText,
  restoreSnapshot,
  shelvesIn,
  snapshotDirs,
  takeSnapshot,
  tombstones,
  writeFileAtomic,
  writeTombstones,
  type MemoryPaths,
  type OpenShelf,
  type Tombstone,
} from "./store";
import { MAX_LINE, normalize, oneLine, TIERS, type Entry, type EntryKind, type Evidence, type EvidenceKind, type Scope, type Shelf, type Speaker, type Tier } from "./types";

/**
 * The one way into memory (memory-v0.3-draft §5). Whoever wants something written,
 * the user's `meme remember`, the pipeline with a model's proposal, an agent over
 * MCP, hands in a proposal; this checks it and writes. A model only ever proposes.
 */

/** Who is asking: the user themselves, the pipeline, or an agent. */
export type Origin = "user" | "pipeline" | "agent";

export interface NewEvidence {
  kind: EvidenceKind;
  tier: Tier;
  speaker: Speaker;
  scope: Scope;
  source: string;
  content: string;
  quote?: string;
  at: Date;
  label: string;
  /** Tells apart two pieces with the same words from the same source, like two runs of `meme remember`. */
  salt?: string;
}

export interface NewEntry {
  shelf: Shelf;
  text: string;
  kind: EntryKind;
  agents?: string;
  why?: string;
  when?: string;
  /** Which of the proposal's evidence it rests on, by position. */
  evidence: number[];
  /** For the first lines of a project's new file: what the project is (projects.ts). */
  project?: string;
}

export type Op = ({ op: "add" } & NewEntry) | { op: "update"; id: string; evidence: number[]; text?: string; why?: string; when?: string } | ({ op: "replace"; id: string } & NewEntry);

export interface Proposal {
  origin: Origin;
  evidence: NewEvidence[];
  ops: Op[];
}

export type Change = "added" | "more evidence" | "updated" | "replaced";

export type Outcome = { ok: true; id: string; shelf: Shelf; file: string; change: Change } | { ok: false; gate: Gate; reason: string };

/** The checks a proposal passes, by the names the design gives them. */
export type Gate = "format" | "source" | "rights" | "limit" | "target" | "forgotten";

export interface Applied {
  /** The ids of the evidence written, in the proposal's order; null for a piece that was not. */
  evidence: (string | null)[];
  /** One per op, in order. */
  outcomes: Outcome[];
  /** A secret was masked in something that was written. */
  masked: boolean;
  version: number;
}

export interface ApplyOptions {
  lock?: LockOptions;
  /** Can the words of this evidence be found where it says they are? Without it only `cli` is taken. */
  verify?: (e: NewEvidence) => boolean;
  /** The most changes to conclusions one proposal of the pipeline may make. */
  maxChanges?: number;
}

const MAX_CHANGES = 20;

const hashOf = (text: string) => createHash("sha256").update(normalize(text)).digest("hex").slice(0, 16);
const short = (text: string) => createHash("sha256").update(text).digest("hex").slice(0, 8);

interface Line {
  text: string;
  masked: boolean;
  problem: string | null;
}

/** One line, secrets masked, not too long. */
function line(raw: string, what: string): Line {
  const flat = oneLine(raw);
  const text = redactText(flat);
  const problem = !text ? `${what} is empty` : text.length > MAX_LINE ? `${what} is ${text.length} characters long; the most is ${MAX_LINE}` : null;
  return { text, masked: text !== flat, problem };
}

const strongest = (tiers: Tier[]): Tier => TIERS.find((t) => tiers.includes(t)) ?? "reported";
/** Said by the user or looked up: in force at once. Read out of behaviour or reported: a candidate until there is more. */
const statusFor = (basis: Tier) => (basis === "stated" || basis === "observed" ? "active" : "candidate");

/** In how many different places what is only inferred or reported has to be seen before it takes effect (memory.md v0.2 §6.2). */
const SEEN = 2;

/** One change to memory, as the digest tells it (state/changes.jsonl). */
export interface ChangeRecord {
  at: string;
  id: string;
  change: "added" | "replaced" | "updated" | "in force" | "forgotten";
  text: string;
  /** The conclusion file it is in, as shelfKey() names it. */
  shelf?: string;
  /** In force, or waiting to be seen again. */
  status?: string;
  replaces?: string;
  /** Where it was learned: the label of its evidence. */
  from?: string;
}

export function changesFile(p: MemoryPaths): string {
  return path.join(p.state, "changes.jsonl");
}

function logChanges(p: MemoryPaths, records: ChangeRecord[]): void {
  if (!records.length) return;
  mkdirSync(p.state, { recursive: true, mode: 0o700 });
  appendFileSync(changesFile(p), records.map((r) => JSON.stringify(r) + "\n").join(""), { mode: 0o600 });
}

export async function apply(dataDir: string, proposal: Proposal, opts: ApplyOptions = {}): Promise<Applied> {
  const p = memoryPaths(dataDir);
  return withLock(p.lock, () => applyLocked(p, proposal, opts), opts.lock);
}

function applyLocked(p: MemoryPaths, proposal: Proposal, opts: ApplyOptions): Applied {
  checkFormat(p);
  const byUser = proposal.origin === "user";
  const verify = opts.verify ?? ((e: NewEvidence) => e.source === "cli");
  let stones = tombstones(p);
  const forgotten = new Set(stones.map((t) => t.hash));
  const revived = new Set<string>();
  /** The user may bring back what they had forgotten; nobody else may. */
  const isForgotten = (text: string): boolean => {
    const h = hashOf(text);
    if (!forgotten.has(h)) return false;
    if (!byUser) return true;
    revived.add(h);
    return false;
  };
  let masked = false;

  // --- the evidence: one line each, secrets masked, the source checked
  const pieces: (Evidence | null)[] = proposal.evidence.map((e) => {
    const content = line(e.content, "the evidence");
    const quote = e.quote === undefined ? null : line(e.quote, "the quote");
    if (content.problem || quote?.problem || !verify(e) || isForgotten(content.text)) return null;
    masked ||= content.masked || Boolean(quote?.masked);
    return {
      id: `e-${short([e.source, e.salt ?? "", content.text].join("\n"))}`,
      kind: e.kind,
      tier: e.tier,
      speaker: e.speaker,
      scope: e.scope,
      source: e.source,
      ...dayAndTime(e.at),
      label: e.label,
      content: content.text,
      ...(quote ? { quote: quote.text } : {}),
    };
  });

  // --- the conclusions, changed in memory first
  const shelves = new Map<string, OpenShelf & { dirty?: true }>(shelvesIn(p.memory).map((s) => [shelfKey(s.shelf), s]));
  const find = (id: string) => {
    for (const s of shelves.values()) {
      const entry = s.entries.find((e) => e.id === id);
      if (entry) return { s, entry };
    }
    return null;
  };
  const open = (shelf: Shelf, project?: string) => {
    const key = shelfKey(shelf);
    let s = shelves.get(key);
    if (!s) shelves.set(key, (s = { shelf, file: shelfFile(p.memory, shelf), preamble: preambleFor(shelf, project), entries: [] }));
    return s;
  };

  let changes = 0;
  const refuse = (gate: Gate, reason: string): Outcome => ({ ok: false, gate, reason });
  const at = new Date().toISOString();
  const log: ChangeRecord[] = [];
  const note = (e: Entry, s: OpenShelf, change: ChangeRecord["change"], proof: Evidence[]) =>
    log.push({ at, id: e.id, change, text: e.text, shelf: shelfKey(s.shelf), status: e.status, ...(e.replaces ? { replaces: e.replaces } : {}), ...(proof[0] ? { from: proof[0].label } : {}) });

  // Where each piece of evidence was seen, to tell one place from two: what is on file, and what comes now.
  let sources: Map<string, string> | null = null;
  const placeOf = (id: string): string => {
    const now = pieces.find((x) => x?.id === id);
    if (now) return now.source.replace(/#.*$/, "");
    sources ??= new Map(readAll(p.evidence).map((x) => [x.id, x.source]));
    return (sources.get(id) ?? id).replace(/#.*$/, "");
  };
  /** Said by the user or looked up: in force at once. Inferred or reported: once seen in two different places. */
  const statusOf = (e: Entry) => (statusFor(e.basis) === "active" || new Set(e.evidence.map(placeOf)).size >= SEEN ? "active" : "candidate");
  /** An entry that replaces another takes its place once it is in force. */
  const retireReplaced = (e: Entry) => {
    if (e.status !== "active" || !e.replaces) return;
    const old = find(e.replaces);
    if (old && old.entry.status === "active") {
      old.entry.status = "replaced";
      old.entry.replacedBy = e.id;
      old.s.dirty = true;
    }
  };

  /** Adds an entry, or more evidence to the entry that already says the same. */
  const add = (n: NewEntry, replaces?: Entry): Outcome => {
    const text = line(n.text, "the entry");
    const why = n.why === undefined ? null : line(n.why, "the reason");
    const when = n.when === undefined ? null : line(n.when, "the situation");
    const problem = text.problem ?? why?.problem ?? when?.problem;
    if (problem) return refuse("format", problem);
    const proof = n.evidence.map((i) => pieces[i]).filter((e): e is Evidence => Boolean(e));
    if (!proof.length) return refuse("source", "none of its evidence could be checked");
    if (isForgotten(text.text)) return refuse("forgotten", "this was forgotten at the user's request");
    const basis = strongest(proof.map((e) => e.tier));
    if (replaces && !byUser && TIERS.indexOf(basis) > TIERS.indexOf(replaces.basis)) return refuse("rights", `evidence that is only ${basis} cannot replace what was ${replaces.basis}`);
    const s = open(n.shelf, n.project);
    const same = s.entries.find((e) => e !== replaces && normalize(e.text) === normalize(text.text));
    masked ||= text.masked || Boolean(why?.masked) || Boolean(when?.masked);
    let entry: Entry;
    let change: Change;
    if (same) {
      entry = same;
      change = same.status === "active" || same.status === "candidate" ? "more evidence" : "added";
      const before = entry.evidence.length;
      entry.evidence = [...new Set([...entry.evidence, ...proof.map((e) => e.id)])];
      if (TIERS.indexOf(basis) < TIERS.indexOf(entry.basis)) entry.basis = basis;
      const status = change === "added" || entry.status === "candidate" ? statusOf(entry) : entry.status;
      const promoted = entry.status === "candidate" && status === "active";
      if (change === "more evidence" && entry.evidence.length === before && status === entry.status && !replaces) return { ok: true, id: entry.id, shelf: s.shelf, file: s.file, change };
      entry.status = status;
      if (change === "added") delete entry.replacedBy;
      if (promoted && !replaces) note(entry, s, "in force", proof);
    } else {
      entry = { id: `m-${short(`${shelfKey(n.shelf)}\n${normalize(text.text)}`)}`, text: text.text, kind: n.kind, agents: n.agents ?? "all", basis, status: "candidate", evidence: proof.map((e) => e.id) };
      entry.status = statusOf(entry);
      s.entries.push(entry);
      change = "added";
    }
    if (why) entry.why = why.text;
    if (when) entry.when = when.text;
    s.dirty = true;
    if (replaces) {
      entry.replaces = replaces.id;
      // The old one goes only once the new one is in force (memory-v0.3-draft §5, G7).
      if (entry.status === "active") {
        replaces.status = "replaced";
        replaces.replacedBy = entry.id;
      }
      change = "replaced";
    }
    if (change === "added" || change === "replaced") note(entry, s, change, proof);
    return { ok: true, id: entry.id, shelf: s.shelf, file: s.file, change };
  };

  const outcomes: Outcome[] = proposal.ops.map((op): Outcome => {
    if (proposal.origin === "pipeline" && changes >= (opts.maxChanges ?? MAX_CHANGES)) return refuse("limit", "more changes than one run may make; left for the next one");
    let outcome: Outcome;
    if (op.op === "add") {
      outcome = add(op);
    } else {
      const at = find(op.id);
      if (!at) return refuse("target", `there is no entry ${op.id}`);
      const rewording = op.op === "replace" || op.text !== undefined || op.why !== undefined || op.when !== undefined;
      if (!byUser && at.entry.basis === "stated" && rewording) return refuse("rights", "only the user changes what the user said");
      if (op.op === "replace") {
        if (at.entry.status !== "active") return refuse("target", `${op.id} is ${at.entry.status}, not in force`);
        outcome = add(op, at.entry);
        if (outcome.ok) at.s.dirty = true;
      } else {
        const text = op.text === undefined ? null : line(op.text, "the entry");
        const why = op.why === undefined ? null : line(op.why, "the reason");
        const when = op.when === undefined ? null : line(op.when, "the situation");
        const problem = text?.problem ?? why?.problem ?? when?.problem;
        if (problem) return refuse("format", problem);
        if (text && isForgotten(text.text)) return refuse("forgotten", "this was forgotten at the user's request");
        const proof = op.evidence.map((i) => pieces[i]).filter((e): e is Evidence => Boolean(e));
        if (!proof.length && !rewording) return refuse("source", "none of its evidence could be checked");
        masked ||= Boolean(text?.masked) || Boolean(why?.masked) || Boolean(when?.masked);
        const e = at.entry;
        e.evidence = [...new Set([...e.evidence, ...proof.map((x) => x.id)])];
        if (text) e.text = text.text;
        if (why) e.why = why.text;
        if (when) e.when = when.text;
        at.s.dirty = true;
        if (e.status === "candidate" && statusOf(e) === "active") {
          e.status = "active";
          retireReplaced(e);
          note(e, at.s, "in force", proof);
        } else if (rewording) note(e, at.s, "updated", proof);
        outcome = { ok: true, id: e.id, shelf: at.s.shelf, file: at.s.file, change: rewording ? "updated" : "more evidence" };
      }
    }
    if (outcome.ok) changes++;
    return outcome;
  });

  // --- write: evidence first, then conclusions; all of it or none
  const newByDay = new Map<string, Evidence[]>();
  const dayTexts = new Map<string, string | null>();
  for (const e of pieces) {
    if (!e) continue;
    if (!dayTexts.has(e.day)) dayTexts.set(e.day, readText(dayFile(p.evidence, e.day)));
    const there = parseDay(dayTexts.get(e.day) ?? "", e.day).some((x) => x.id === e.id) || newByDay.get(e.day)?.some((x) => x.id === e.id);
    if (!there) newByDay.set(e.day, [...(newByDay.get(e.day) ?? []), e]);
  }
  const dirty = [...shelves.values()].filter((s) => s.dirty);
  if (!newByDay.size && !dirty.length && !revived.size) return { evidence: pieces.map((e) => e?.id ?? null), outcomes, masked, version: 0 };

  const snapshot = dirty.length ? takeSnapshot(p) : null;
  try {
    for (const [day, items] of newByDay) writeFileAtomic(dayFile(p.evidence, day), (dayTexts.get(day) ?? "") + appended(dayTexts.get(day) ?? null, items));
    for (const s of dirty) writeFileAtomic(s.file, formatShelf(s));
    if (revived.size) writeTombstones(p, (stones = stones.filter((t) => !revived.has(t.hash))));
    ensureFormat(p);
  } catch (err) {
    // Back to how it was: the days' files as read, the conclusions as in the snapshot.
    for (const [day] of newByDay) {
      const before = dayTexts.get(day) ?? null;
      if (before === null) rmSync(dayFile(p.evidence, day), { force: true });
      else writeFileAtomic(dayFile(p.evidence, day), before);
    }
    if (dirty.length) restoreSnapshot(p, snapshot);
    throw err;
  }
  pruneSnapshots(p);
  logChanges(p, log);
  return { evidence: pieces.map((e) => e?.id ?? null), outcomes, masked, version: bumpVersion(p) };
}

export interface Forgotten {
  entry: Entry;
  file: string;
  /** Evidence that went with it: what no other entry rests on. */
  evidence: string[];
}

/**
 * Forgets an entry for good (memory-v0.3-draft §8): the entry, the evidence only it
 * rested on, and its text in every snapshot. What stays is a hash, so that the same
 * words are not learned again from the sessions; the user saying them again lifts it.
 */
export async function forget(dataDir: string, id: string, opts: { lock?: LockOptions; now?: Date } = {}): Promise<Forgotten | null> {
  const p = memoryPaths(dataDir);
  return withLock(
    p.lock,
    () => {
      checkFormat(p);
      const shelves = shelvesIn(p.memory);
      const home = shelves.find((s) => s.entries.some((e) => e.id === id));
      if (!home) return null;
      const entry = home.entries.find((e) => e.id === id)!;
      const others = new Set(shelves.flatMap((s) => s.entries.filter((e) => e.id !== id).flatMap((e) => e.evidence)));
      const drop = new Set(entry.evidence.filter((e) => !others.has(e)));
      const stones: Tombstone[] = [{ id, hash: hashOf(entry.text), at: (opts.now ?? new Date()).toISOString() }];

      // The evidence, a day's file at a time.
      for (const day of drop.size ? days(p.evidence) : []) {
        const file = dayFile(p.evidence, day);
        const text = readText(file);
        if (text === null) continue;
        const gone = parseDay(text, day).filter((e) => drop.has(e.id));
        if (!gone.length) continue;
        for (const e of gone) stones.push({ id: e.id, hash: hashOf(e.content), at: stones[0]!.at });
        const rest = without(text, drop);
        if (rest === null) rmSync(file, { force: true });
        else writeFileAtomic(file, rest);
      }

      // The entry, where it is now and in every snapshot; what pointed at it no longer does.
      for (const dir of [p.memory, ...snapshotDirs(p)]) {
        for (const s of shelvesIn(dir)) {
          const kept = s.entries.filter((e) => e.id !== id);
          let touched = kept.length !== s.entries.length;
          for (const e of kept) {
            if (e.replaces !== id && e.replacedBy !== id) continue;
            if (e.replaces === id) delete e.replaces;
            if (e.replacedBy === id) delete e.replacedBy;
            touched = true;
          }
          if (touched) writeFileAtomic(s.file, formatShelf({ preamble: s.preamble, entries: kept }));
        }
      }
      addTombstones(p, stones);
      // The log of changes keeps no words of it either: its lines go, and one without them says it was forgotten.
      const log = readText(changesFile(p));
      if (log !== null) writeFileAtomic(changesFile(p), log.split("\n").filter((l) => l.trim() && !l.includes(`"id":"${id}"`)).map((l) => l + "\n").join(""));
      logChanges(p, [{ at: (opts.now ?? new Date()).toISOString(), id, change: "forgotten", text: "" }]);
      bumpVersion(p);
      return { entry, file: home.file, evidence: [...drop] };
    },
    opts.lock,
  );
}
