import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { EVIDENCE_KINDS, SPEAKERS, TIERS, type Evidence } from "./types";

/**
 * Evidence files: one Markdown file per day, by the day the words were said, written
 * by meme alone and only ever added to (memory-v0.3-draft §3.2). The one exception is
 * forgetting, which rewrites a day's file without the evidence that goes.
 *
 *   # 2026-11-17
 *
 *   ## 14:32 · meme remember
 *   - e-91c05a1b · fact · stated · user · user · cli
 *     Reply in Chinese; keep the repository in English.
 *     > the words themselves, when the line above is not already them
 */

const SEP = " · ";
const DAY_FILE = /^(\d{4}-\d{2}-\d{2})\.md$/;

export function dayFile(dir: string, day: string): string {
  return path.join(dir, `${day}.md`);
}

/** The day and the minute, in this machine's time. */
export function dayAndTime(at: Date): { day: string; time: string } {
  const two = (n: number) => String(n).padStart(2, "0");
  return {
    day: `${at.getFullYear()}-${two(at.getMonth() + 1)}-${two(at.getDate())}`,
    time: `${two(at.getHours())}:${two(at.getMinutes())}`,
  };
}

function itemLines(e: Evidence): string[] {
  const lines = [`- ${[e.id, e.kind, e.tier, e.speaker, e.scope, e.source].join(SEP)}`, `  ${e.content}`];
  if (e.quote) lines.push(`  > ${e.quote}`);
  return lines;
}

/** What to add to a day's file for these pieces of evidence, all of one day; `existing` is the file so far. */
export function appended(existing: string | null, items: Evidence[]): string {
  if (!items.length) return "";
  const out: string[] = [];
  if (existing === null) out.push(`# ${items[0]!.day}`);
  // Evidence of the same minute and origin goes under the heading that is already the last one.
  let block = existing?.split("\n").findLast((l) => l.startsWith("## ")) ?? "";
  for (const e of items) {
    const head = `## ${e.time}${SEP}${e.label}`;
    if (head !== block) {
      out.push("", head);
      block = head;
    }
    out.push(...itemLines(e));
  }
  const text = out.join("\n") + "\n";
  return existing !== null && existing.length && !existing.endsWith("\n") ? "\n" + text : text;
}

/** The evidence in a day's file. Lines that are not evidence are passed over. */
export function parseDay(text: string, day: string): Evidence[] {
  const found: Evidence[] = [];
  let time = "00:00";
  let label = "";
  let last: Evidence | null = null;
  let wantContent = false;
  for (const line of text.split("\n")) {
    const head = /^## (\d{2}:\d{2})(?: · (.*))?$/.exec(line);
    if (head) {
      time = head[1]!;
      label = head[2] ?? "";
      last = null;
      continue;
    }
    if (line.startsWith("- ")) {
      const f = line.slice(2).split(SEP);
      last = null;
      if (f.length !== 6 || !isOneOf(EVIDENCE_KINDS, f[1]) || !isOneOf(TIERS, f[2]) || !isOneOf(SPEAKERS, f[3])) continue;
      last = { id: f[0]!, kind: f[1], tier: f[2], speaker: f[3], scope: f[4]!, source: f[5]!, day, time, label, content: "" };
      found.push(last);
      wantContent = true;
      continue;
    }
    if (!last || !line.startsWith("  ")) continue;
    const body = line.slice(2);
    if (wantContent) {
      last.content = body;
      wantContent = false;
    } else if (body.startsWith("> ")) {
      last.quote = body.slice(2);
    }
  }
  return found.filter((e) => e.content);
}

function isOneOf<T extends string>(list: readonly T[], v: string | undefined): v is T {
  return (list as readonly string[]).includes(v ?? "");
}

/** A day's file without some of its evidence; null when nothing is left to keep. */
export function without(text: string, ids: Set<string>): string | null {
  const out: string[] = [];
  let dropping = false;
  for (const line of text.split("\n")) {
    if (line.startsWith("- ")) dropping = ids.has(line.slice(2).split(SEP)[0]!);
    else if (!line.startsWith("  ")) dropping = false;
    if (!dropping) out.push(line);
  }
  // A heading whose evidence is all gone goes too.
  const kept: string[] = [];
  for (let i = 0; i < out.length; i++) {
    const line = out[i]!;
    if (line.startsWith("## ")) {
      const next = out.slice(i + 1).find((l) => l.trim() !== "");
      if (next === undefined || next.startsWith("## ")) continue;
    }
    kept.push(line);
  }
  const text2 = kept.join("\n").replace(/\n{3,}/g, "\n\n").replace(/\n*$/, "\n");
  return kept.some((l) => l.startsWith("- ")) ? text2 : null;
}

/** The days there is evidence for, oldest first. */
export function days(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .map((name) => DAY_FILE.exec(name)?.[1])
    .filter((d): d is string => Boolean(d))
    .sort();
}

export function readDay(dir: string, day: string): Evidence[] {
  try {
    return parseDay(readFileSync(dayFile(dir, day), "utf8"), day);
  } catch {
    return [];
  }
}

/** All the evidence there is. Fine while there is little; an index comes with reading (plan-m2 F3). */
export function readAll(dir: string): Evidence[] {
  return days(dir).flatMap((day) => readDay(dir, day));
}
