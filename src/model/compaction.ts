/**
 * Context compaction (handoff.md §7.8): agents keep their full record and add a
 * summary where they compacted. These helpers read the summary the same way for
 * every agent; how each one wraps it is in its profile.
 */
import { SUMMARY_CLOSINGS, SUMMARY_PREFIXES } from "./formats";

/**
 * The summary alone: without the agent's wrapping text, and without its closing
 * instructions to the model ("continue without asking"), which read by another
 * agent would be wrong.
 */
export function summaryText(content: string): string {
  let s = SUMMARY_PREFIXES.reduce((text, re) => text.replace(re, ""), content);
  let cut = s.length;
  for (const marker of SUMMARY_CLOSINGS) {
    const at = s.indexOf("\n" + marker);
    if (at >= 0 && at < cut) cut = at;
  }
  s = s.slice(0, cut);
  return s.trim();
}
