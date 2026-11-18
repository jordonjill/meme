import { appendFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { changesFile, type ChangeRecord } from "./apply";
import { readText, shelvesIn, writeFileAtomic, type MemoryPaths } from "./store";
import type { Entry } from "./types";

/**
 * The digest (plan-m2 F9): memory forms by itself, and the user reads, now and then,
 * what changed since they last looked. Nothing here changes memory.
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

export interface Digest {
  since: string | null;
  added: ChangeRecord[];
  replaced: ChangeRecord[];
  inForce: ChangeRecord[];
  updated: ChangeRecord[];
  forgotten: number;
  /** Not in force yet: inferred or reported, seen in one place so far. */
  waiting: Entry[];
  declined: Declined[];
}

export function digest(p: MemoryPaths, since = lastSeen(p)): Digest {
  const after = (r: { at: string }) => since === null || r.at > since;
  const changes = lines<ChangeRecord>(readText(changesFile(p))).filter(after);
  const latest = new Map<string, ChangeRecord>();
  // One line per entry: what happened to it last.
  for (const r of changes) latest.set(r.id, r);
  const all = [...latest.values()];
  const of = (c: ChangeRecord["change"]) => all.filter((r) => r.change === c && r.status !== "candidate");
  return {
    since,
    added: of("added"),
    replaced: of("replaced"),
    inForce: of("in force"),
    updated: of("updated"),
    forgotten: all.filter((r) => r.change === "forgotten").length,
    waiting: shelvesIn(p.memory).flatMap((s) => s.entries.filter((e) => e.status === "candidate")),
    declined: lines<Declined>(readText(declinedFile(p))).filter(after),
  };
}

/** How many entries came in or took effect since the user last looked. */
export function newSince(p: MemoryPaths): number {
  const d = digest(p);
  return d.added.length + d.replaced.length + d.inForce.length;
}
