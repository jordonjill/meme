/**
 * The agents' text formats and tool knowledge, all together (arch.md §6.1): a
 * record does not say which agent wrote it, and the agents' formats do not
 * overlap, so each check tries every agent's.
 */
import { PROFILES } from "../adapters/profiles";
import type { Formats } from "../adapters/types";

const all = <K extends keyof Formats>(key: K): NonNullable<Formats[K]>[] =>
  PROFILES.map((p) => p.formats[key]).filter((v): v is NonNullable<Formats[K]> => v !== undefined);

export const INJECTED: RegExp[] = PROFILES.flatMap((p) => p.formats.injected);
export const INTERRUPTS = all("interrupt");
export const OUTPUTS = all("output");
export const SHELL_INPUTS = all("shellInput");
export const SHELL_OUTPUTS = all("shellOutput");
export const HIDDEN = all("hidden");
export const LONG_OUTPUTS = all("longOutput");
export const RESULT_HEADERS = all("resultHeader");
export const EXIT_CODES = all("exitCode");
export const FAILED = all("failed");
export const SUMMARY_PREFIXES = all("summaryPrefix");
export const SUMMARY_CLOSINGS = all("summaryClosing").flat();

/** The first match of any of the patterns, by position. */
export function firstMatch(patterns: RegExp[], text: string): RegExpExecArray | null {
  let best: RegExpExecArray | null = null;
  for (const re of patterns) {
    const m = re.exec(text);
    if (m && (!best || m.index < best.index)) best = m;
  }
  return best;
}

export function toolCommand(name: string, args: Record<string, unknown>): string | null {
  for (const p of PROFILES) {
    const c = p.tools.command(name, args);
    if (c !== null) return c;
  }
  return null;
}

export function toolEdits(name: string, args: Record<string, unknown>): string[] {
  for (const p of PROFILES) {
    const files = p.tools.edited(name, args);
    if (files.length) return files;
  }
  return [];
}

/** A call that keeps an agent's own lists or screens, not the work (memory leaves it out). */
export function toolBookkeeping(name: string): boolean {
  return PROFILES.some((p) => p.tools.bookkeeping?.test(name));
}

export function toolDescription(name: string, args: Record<string, unknown>, command: string | null): { name: string; summary: string } | null {
  for (const p of PROFILES) {
    const d = p.tools.describe?.(name, args, command);
    if (d) return d;
  }
  return null;
}
