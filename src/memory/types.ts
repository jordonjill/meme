/**
 * The words of meme's memory (memory-v0.3-draft §1, §4). Evidence is what was said
 * or seen, with where; an entry is a conclusion drawn from evidence. Entries are
 * facts (someone said so, or it can be looked up) or experience (learned from how
 * something turned out).
 */

/** What a piece of evidence is about. */
export type EvidenceKind = "fact" | "experience" | "feedback" | "outcome";
export const EVIDENCE_KINDS: readonly EvidenceKind[] = ["fact", "experience", "feedback", "outcome"];

export type EntryKind = "fact" | "experience";
export const ENTRY_KINDS: readonly EntryKind[] = ["fact", "experience"];

/**
 * How a statement is known, strongest first: the user said it; it can be looked up (a
 * tool's output, the machine); it was read out of behaviour; someone other than the
 * user reported it (an agent, a third party, a write over MCP).
 */
export type Tier = "stated" | "observed" | "inferred" | "reported";
export const TIERS: readonly Tier[] = ["stated", "observed", "inferred", "reported"];

export type Speaker = "user" | "agent" | "tool" | "other";
export const SPEAKERS: readonly Speaker[] = ["user", "agent", "tool", "other"];

/** `user`, or `project:<key>` (see projects.ts). */
export type Scope = string;

export interface Evidence {
  id: string;
  kind: EvidenceKind;
  tier: Tier;
  speaker: Speaker;
  scope: Scope;
  /** Where the words are: `cli` for `meme remember`; sessions and uploads later. */
  source: string;
  /** When it was said, to the minute, in this machine's time. */
  day: string;
  time: string;
  /** What the block it was written in is called, e.g. `meme remember`. */
  label: string;
  /** One sentence. */
  content: string;
  /** The words themselves, when the content is not already them. */
  quote?: string;
}

export type Status = "candidate" | "active" | "replaced" | "retired" | "stale";
export const STATUSES: readonly Status[] = ["candidate", "active", "replaced", "retired", "stale"];

export interface Entry {
  id: string;
  /** One line: the fact, or what to do. */
  text: string;
  kind: EntryKind;
  /** The agents it is for: `all`, or one agent's name. */
  agents: string;
  /** The strongest tier among its evidence when it was written. */
  basis: Tier;
  status: Status;
  why?: string;
  /** Experience only: the situation it applies in. */
  when?: string;
  evidence: string[];
  replaces?: string;
  replacedBy?: string;
  /** Lines under the entry that meme did not write; kept as they are. */
  extra?: string[];
}

/** The file an entry is in; it says whom the entry is about. */
export type Shelf =
  | { level: "user"; file: "USER" | "RULES" | "MEMORY" | "EXPERIENCE" }
  | { level: "project"; project: string; file: "MEMORY" | "EXPERIENCE" };

/** The longest an entry's text, its why and when, a piece of evidence or a quote may be. */
export const MAX_LINE = 300;

/** Letters and digits only, so two wordings of one sentence compare equal. */
export function normalize(text: string): string {
  return text
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\s\p{P}\p{S}]+/gu, " ")
    .trim();
}

/** One line: runs of white space, line breaks among them, become one space. */
export function oneLine(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}
