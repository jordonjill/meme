/**
 * What a user-role record really is. trajectory turns every user line into a
 * plain user message, so meme tells them apart again (plan §4.6.3).
 *
 * - prompt: something the user said or typed, including `/commands` and `! shell` input
 *   (Claude Code's `<bash-input>`, Codex's `<user_shell_command>`)
 * - injected: written by the agent harness (isMeta, compact summaries, reminders)
 * - interrupt: `[Request interrupted by user…]`; marks the turn, does not start one
 * - output: output of a local or shell command the user ran; belongs to its turn
 */
export type UserKind = "prompt" | "injected" | "interrupt" | "output";

export interface RawFlags {
  isMeta?: unknown;
  isCompactSummary?: unknown;
}

const INTERRUPT = /^\[Request interrupted by user/;
const OUTPUT = /^<(?:bash-stdout|bash-stderr|local-command-stdout|local-command-stderr)>/;
const REMINDERS_ONLY = /^(?:\s*<system-reminder>[\s\S]*?<\/system-reminder>)+\s*$/;
const INJECTED_PREFIX = /^<(?:task-notification|local-command-caveat|environment_context|user_instructions|permissions instructions|turn_context)[\s>]/;
/** Codex puts the project's instructions in a user message (cc-switch treats it the same way). */
const CODEX_INSTRUCTIONS = /^# AGENTS\.md instructions\b/;

export function userKind(content: string, raw?: RawFlags): UserKind {
  if (raw?.isMeta === true || raw?.isCompactSummary === true) return "injected";
  const t = content.trimStart();
  if (REMINDERS_ONLY.test(t) || INJECTED_PREFIX.test(t) || CODEX_INSTRUCTIONS.test(t)) return "injected";
  if (INTERRUPT.test(t)) return "interrupt";
  if (OUTPUT.test(t)) return "output";
  return "prompt";
}
