/**
 * Context compaction (handoff.md §7.8): agents keep their full record and add a
 * summary where they compacted. These helpers read the summary the same way for
 * every agent.
 */

/** Codex puts this before the summary it hands the model (`compacted.message`). */
const CODEX_PREFIX = /^\s*Another language model started to solve this problem[\s\S]*?use the information in this summary to assist with your own analysis:\s*/;
/** Claude Code's opening, up to the "Summary:" line. */
const CLAUDE_PREFIX = /^\s*This session is being continued from a previous conversation[^\n]*\n(?:[^\n]*\n){0,3}?\s*Summary:[ \t]*\n/;
/**
 * Claude Code's closing instructions to the model after it compacted: where the
 * full transcript is, "continue without asking", and that recent messages follow.
 * Read by another agent they would be wrong, so they are dropped.
 */
const CLAUDE_TAIL = [
  "If you need specific details from before compaction",
  "Continue the conversation from where it left off",
  "Please continue the conversation from where",
  "The messages after this summary are the most recent messages",
  "Recent messages are preserved verbatim",
];

/** The summary alone: without the agent's wrapping text and instructions. */
export function summaryText(content: string): string {
  let s = content.replace(CODEX_PREFIX, "").replace(CLAUDE_PREFIX, "");
  let cut = s.length;
  for (const marker of CLAUDE_TAIL) {
    const at = s.indexOf("\n" + marker);
    if (at >= 0 && at < cut) cut = at;
  }
  s = s.slice(0, cut);
  return s.trim();
}
