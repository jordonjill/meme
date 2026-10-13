import { NormalizationError, normalizeToCanonical, type CanonicalRecord } from "@letta-ai/trajectory";
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

/**
 * trajectory's diagnostics for lines it drops on purpose (a subagent's lines in
 * the parent file, harness noise, injected context): not something meme failed
 * to read (the second layer of the alarm, plan §6 ⑦.1).
 */
export const TRAJECTORY_DROPS = new Set(["sidechain_record_dropped", "noise_record_dropped", "injected_context_dropped"]);

/** The 0-based line indexes trajectory says it dropped on purpose. */
export function droppedLines(diagnostics: { code: string; inputLine?: number }[]): Set<number> {
  const out = new Set<number>();
  for (const d of diagnostics) if (TRAJECTORY_DROPS.has(d.code) && d.inputLine) out.add(d.inputLine - 1);
  return out;
}

/** A record type's key: `type`, or `type/subtype` (Claude Code's system lines) or `type/payload.type` (Codex). */
export function typeKey(type: unknown, sub: unknown): string {
  const t = typeof type === "string" ? type : "(no type)";
  return typeof sub === "string" ? `${t}/${sub}` : t;
}

/** Read in full: trajectory's default truncation would not be faithful. */
export const BOUNDS = { toolArguments: { maxCharacters: null }, toolResults: { maxCharacters: null } };

/**
 * trajectory's canonical records of a transcript, and the lines it dropped on
 * purpose. A transcript with no user or no AI records (only `!` commands, a
 * rollback to the first message) is read as a partial one, which keeps what is
 * there (plan §6 ⑨, R13). A group id that clashes with the file's: read without it.
 */
export function canonical(source: "claude-code" | "codex", text: string, o: { groupId?: string; partial?: boolean } = {}): { records: CanonicalRecord[]; dropped: Set<number> } {
  const run = (groupId: string | undefined, partial: boolean) => {
    const context = { ...(groupId ? { groupId } : {}), ...(partial ? { partial } : {}) };
    const r = normalizeToCanonical({ source, transcript: text, bounds: BOUNDS, ...(groupId || partial ? { sourceContext: context } : {}) });
    return { records: r.records, dropped: droppedLines(r.diagnostics) };
  };
  const attempt = (groupId: string | undefined, partial: boolean): { records: CanonicalRecord[]; dropped: Set<number> } => {
    try {
      return run(groupId, partial);
    } catch (err) {
      if (!(err instanceof NormalizationError)) throw err;
      if (!partial && (err.code === "missing_user_records" || err.code === "missing_assistant_records")) return attempt(groupId, true);
      if (groupId && err.code === "source_group_conflict") return attempt(undefined, partial);
      throw err;
    }
  };
  return attempt(o.groupId, Boolean(o.partial));
}
