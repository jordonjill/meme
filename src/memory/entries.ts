import path from "node:path";
import { SHELF_WORDS } from "../prompts";
import { ENTRY_KINDS, STATUSES, TIERS, type Entry, type Shelf } from "./types";

/**
 * Conclusion files: Markdown a person can read and correct, one entry per section
 * (memory-v0.3-draft §3.3). The file an entry is in says whom it is about.
 *
 *   ## m-3f2a91c0 Install dependencies with pnpm, not npm.
 *   - kind: fact · agents: all · basis: stated · status: active
 *   - why: the repository has pnpm-lock.yaml
 *   - evidence: e-91c05a1b, e-a7d2c001
 *   - replaces: m-1b07aa10
 */

const SEP = " · ";
const HEAD = /^## (m-[0-9a-f]{8}) (.+)$/;

export function shelfFile(memoryDir: string, shelf: Shelf): string {
  return shelf.level === "user" ? path.join(memoryDir, `${shelf.file}.md`) : path.join(memoryDir, "projects", shelf.project, `${shelf.file}.md`);
}

export function shelfKey(shelf: Shelf): string {
  return shelf.level === "user" ? shelf.file : `projects/${shelf.project}/${shelf.file}`;
}

/** The first lines of a new file. `project` is what the folder stands for: a remote address or a path. */
export function preambleFor(shelf: Shelf, project?: string): string {
  // What each file is for, as its first lines say to whoever opens it.
  const { title, forYou: about } = SHELF_WORDS[shelf.file];
  const lines = [`# ${title}`, ""];
  if (shelf.level === "project" && project) lines.push(`Project: ${project}`, "");
  lines.push(`${about} Kept by meme: \`meme memory show <id>\` tells where an entry comes from.`);
  return lines.join("\n") + "\n";
}

export interface ShelfText {
  /** Everything before the first entry, kept as it is. */
  preamble: string;
  entries: Entry[];
}

export function parseShelf(text: string): ShelfText {
  const lines = text.split("\n");
  const first = lines.findIndex((l) => HEAD.test(l));
  const preamble = (first < 0 ? lines : lines.slice(0, first)).join("\n").replace(/\n*$/, "\n");
  const entries: Entry[] = [];
  let e: Entry | null = null;
  for (const line of first < 0 ? [] : lines.slice(first)) {
    const head = HEAD.exec(line);
    if (head) {
      e = { id: head[1]!, text: head[2]!, kind: "fact", agents: "all", basis: "inferred", status: "candidate", evidence: [] };
      entries.push(e);
      continue;
    }
    if (!e || !line.trim()) continue;
    if (!line.startsWith("- ") || !setFields(e, line.slice(2))) (e.extra ??= []).push(line);
  }
  return { preamble, entries };
}

/** Reads `key: value` pairs of one line into the entry; false when the line is not such a line. */
function setFields(e: Entry, line: string): boolean {
  const pairs = line.split(SEP).map((part) => /^([a-z ]+): (.*)$/.exec(part));
  if (pairs.some((p) => !p)) return false;
  for (const p of pairs) {
    const [key, value] = [p![1]!, p![2]!];
    if (key === "kind" && isOneOf(ENTRY_KINDS, value)) e.kind = value;
    else if (key === "agents") e.agents = value;
    else if (key === "basis" && isOneOf(TIERS, value)) e.basis = value;
    else if (key === "status" && isOneOf(STATUSES, value)) e.status = value;
    else if (key === "why") e.why = value;
    else if (key === "when") e.when = value;
    else if (key === "evidence") e.evidence = value.split(",").map((s) => s.trim()).filter(Boolean);
    else if (key === "replaces") e.replaces = value;
    else if (key === "replaced by") e.replacedBy = value;
    else return false;
  }
  return true;
}

function isOneOf<T extends string>(list: readonly T[], v: string): v is T {
  return (list as readonly string[]).includes(v);
}

export function formatShelf(shelf: ShelfText): string {
  const out = [shelf.preamble.replace(/\n*$/, "")];
  for (const e of shelf.entries) {
    out.push("", `## ${e.id} ${e.text}`);
    out.push(`- ${[`kind: ${e.kind}`, `agents: ${e.agents}`, `basis: ${e.basis}`, `status: ${e.status}`].join(SEP)}`);
    if (e.when) out.push(`- when: ${e.when}`);
    if (e.why) out.push(`- why: ${e.why}`);
    if (e.evidence.length) out.push(`- evidence: ${e.evidence.join(", ")}`);
    if (e.replaces) out.push(`- replaces: ${e.replaces}`);
    if (e.replacedBy) out.push(`- replaced by: ${e.replacedBy}`);
    if (e.extra) out.push(...e.extra);
  }
  return out.join("\n") + "\n";
}
