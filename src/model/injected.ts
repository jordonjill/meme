import { INJECTED, INTERRUPTS, OUTPUTS } from "./formats";

/**
 * What a user-role record really is. trajectory turns every user line into a
 * plain user message, so meme tells them apart again (plan §4.6.3), by the
 * agents' formats (their profiles) and, in the adapters, by flags on the line.
 *
 * - prompt: something the user said or typed, including `/commands` and `! shell` input
 * - injected: written by the agent harness (flagged lines, compact summaries, reminders)
 * - interrupt: the user stopped the turn; marks the turn, does not start one
 * - output: output of a local or shell command the user ran; belongs to its turn
 */
export type UserKind = "prompt" | "injected" | "interrupt" | "output";

/**
 * Why a record was injected (format.md §3, item 3): by the agent harness
 * (reminders, expanded commands, instructions), or a context compaction. A
 * compaction is its summary when the agent's record has it in readable form,
 * and only a marker ("compacted here") when the summary is encrypted.
 */
export type Injected = "harness" | "compact_summary" | "compaction";

export const isCompaction = (why: Injected | null): boolean => why === "compact_summary" || why === "compaction";

export function userKind(content: string): UserKind {
  const t = content.trimStart();
  if (INJECTED.some((re) => re.test(t))) return "injected";
  if (INTERRUPTS.some((re) => re.test(t))) return "interrupt";
  if (OUTPUTS.some((re) => re.test(t))) return "output";
  return "prompt";
}
