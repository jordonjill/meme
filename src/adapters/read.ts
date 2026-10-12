import { readFileSync } from "node:fs";
import type { UnknownType } from "./types";

/**
 * Read a JSONL session. A running agent may be in the middle of writing the last
 * line; that line is left out until it is complete (storage.md 2.4).
 */
export function readJsonl(path: string): string {
  const text = readFileSync(path, "utf8");
  return dropPartialLine(text);
}

export function dropPartialLine(text: string): string {
  if (text === "" || text.endsWith("\n")) return text;
  const cut = text.lastIndexOf("\n");
  const last = text.slice(cut + 1);
  try {
    JSON.parse(last);
    return text;
  } catch {
    return text.slice(0, cut + 1);
  }
}

/** Each non-empty line parsed as a JSON object; other lines are skipped. */
export function parseLines(text: string): { index: number; obj: Record<string, unknown> }[] {
  const out: { index: number; obj: Record<string, unknown> }[] = [];
  const lines = text.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    if (!line.trim()) continue;
    try {
      const v = JSON.parse(line);
      if (v && typeof v === "object" && !Array.isArray(v)) out.push({ index: i, obj: v });
    } catch {}
  }
  return out;
}

/**
 * Counts the lines whose record type the profile does not list (arch.md §6.1,
 * point 4). A key is `type` or `type/subtype`; a type listed on its own covers
 * all its subtypes.
 */
export class TypeCounter {
  private readonly counts = new Map<string, UnknownType>();
  constructor(private readonly known: Record<string, string>) {}

  add(type: string, sub: string | null, version: string | null): void {
    const key = sub ? `${type}/${sub}` : type;
    if (this.known[key] !== undefined || this.known[type] !== undefined) return;
    const k = `${key}\u0000${version ?? ""}`;
    const prev = this.counts.get(k);
    if (prev) prev.count++;
    else this.counts.set(k, { type: key, version, count: 1 });
  }

  /** A line that is not a JSON object. */
  notJson(version: string | null): void {
    this.add("(not JSON)", null, version);
  }

  list(): UnknownType[] {
    return [...this.counts.values()];
  }
}
