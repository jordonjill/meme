import { appendFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { changesFile, type ChangeRecord } from "./apply";
import { entriesIn, readText, shelfKey, writeFileAtomic, type MemoryPaths } from "./store";
import type { Entry } from "./types";

/**
 * The digest (plan-m2 F9, F13): memory forms by itself, and the user reads, now and
 * then, what changed since they last looked. Nothing here changes memory.
 */

/** Something said to be remembered and not kept: the model judged it for that time only, or it was not the user's words. */
export interface Declined {
  at: string;
  words: string;
  from: string;
  /** Why, when it is not that it was meant for that time only. */
  why?: string;
}

const seenFile = (p: MemoryPaths) => path.join(p.state, "digest-seen");
const declinedFile = (p: MemoryPaths) => path.join(p.state, "declined.jsonl");

function lines<T>(text: string | null): T[] {
  const out: T[] = [];
  for (const line of (text ?? "").split("\n")) {
    if (!line.trim()) continue;
    try {
      out.push(JSON.parse(line) as T);
    } catch {}
  }
  return out;
}

export function noteDeclined(p: MemoryPaths, d: Declined): void {
  mkdirSync(p.state, { recursive: true, mode: 0o700 });
  appendFileSync(declinedFile(p), JSON.stringify(d) + "\n", { mode: 0o600 });
}

/** When the user last read the digest; null before the first time. */
export function lastSeen(p: MemoryPaths): string | null {
  return readText(seenFile(p))?.trim() || null;
}

export function markSeen(p: MemoryPaths, now: Date): void {
  writeFileAtomic(seenFile(p), now.toISOString() + "\n");
}

/** A change to an entry that is still there, with what the entry is now. */
export interface Changed extends ChangeRecord {
  /** The conclusion file it is in, as shelfKey() names it. */
  shelf: string;
  /** In force or waiting, now. */
  status: "active" | "candidate";
}

export interface Digest {
  since: string | null;
  /** New since then, in force or waiting. */
  added: Changed[];
  /** New since then in place of an older entry, and in force. */
  replaced: Changed[];
  /** Waiting before, in force now. */
  inForce: Changed[];
  /** Reworded. */
  updated: Changed[];
  forgotten: number;
  declined: Declined[];
  /** Everything memory holds now, in force or waiting, with its file. */
  held: { shelf: string; entry: Entry }[];
}

/**
 * What changed since the user last looked, one line per entry still there (plan-m2
 * F13): what happened to it first decides, and what it is now is read from its file,
 * so that an entry added and taken into force since then counts as added, in force.
 */
export function digest(p: MemoryPaths, since = lastSeen(p)): Digest {
  const after = (r: { at: string }) => since === null || r.at > since;
  const changes = lines<ChangeRecord>(readText(changesFile(p))).filter(after);
  const held = entriesIn(p.memory)
    .filter((x) => x.entry.status === "active" || x.entry.status === "candidate")
    .map((x) => ({ shelf: shelfKey(x.shelf), entry: x.entry }));
  const now = new Map(held.map((h) => [h.entry.id, h] as const));
  const seen = new Map<string, ChangeRecord[]>();
  for (const r of changes) if (r.change !== "forgotten") seen.set(r.id, [...(seen.get(r.id) ?? []), r]);
  const d: Digest = { since, added: [], replaced: [], inForce: [], updated: [], forgotten: changes.filter((r) => r.change === "forgotten").length, declined: lines<Declined>(readText(declinedFile(p))).filter(after), held };
  for (const [id, rs] of seen) {
    const h = now.get(id);
    if (!h) continue;
    const first = rs.find((r) => r.change === "added" || r.change === "replaced");
    const status = h.entry.status as Changed["status"];
    const row = (r: ChangeRecord): Changed => ({ ...r, text: h.entry.text, shelf: h.shelf, status });
    if (first?.change === "replaced" && status === "active") d.replaced.push(row(first));
    else if (first) d.added.push(row(first));
    else if (rs.some((r) => r.change === "in force") && status === "active") d.inForce.push(row(rs.find((r) => r.change === "in force")!));
    else if (rs.some((r) => r.change === "updated")) d.updated.push(row(rs.findLast((r) => r.change === "updated")!));
  }
  return d;
}

/** The changes agents read: new in force, in place of an older entry, taken into force, reworded while in force. */
export function forAgents(d: Digest): Changed[] {
  return [...d.added, ...d.replaced, ...d.inForce, ...d.updated].filter((r) => r.status === "active");
}

/** How many of the entries agents read changed since the user last looked: what `meme status` tells. */
export function newSince(p: MemoryPaths): number {
  return forAgents(digest(p)).length;
}
