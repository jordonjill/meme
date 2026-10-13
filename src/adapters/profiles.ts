/**
 * The agents meme knows, by their profiles (arch.md §6.1). Adding an agent is
 * its adapter, its profile, and a line here. Pure data: every layer can import it.
 */
import { claudeCodeProfile } from "./claude-code.profile";
import { codexProfile } from "./codex.profile";
import { openCodeProfile } from "./opencode.profile";
import { piProfile } from "./pi.profile";
import type { Agent, Profile } from "./types";

/** In the order lists and filters show them. */
export const PROFILES: readonly Profile[] = [claudeCodeProfile, codexProfile, openCodeProfile, piProfile];

export function profileOf(agent: Agent): Profile {
  return PROFILES.find((p) => p.agent === agent)!;
}

/** The agent a word names (`claude`, `cc`, `codex`), if any. */
export function agentNamed(word: string): Agent | undefined {
  const w = word.toLowerCase();
  return PROFILES.find((p) => p.aliases.includes(w))?.agent;
}

/** "claude or codex", or with `sep` between all of them ("claude|codex"): the word to type for each agent. */
export function agentWords(sep?: string): string {
  const words = PROFILES.map((p) => p.aliases[0]!);
  if (sep) return words.join(sep);
  return words.length <= 1 ? (words[0] ?? "") : `${words.slice(0, -1).join(", ")} or ${words.at(-1)}`;
}

/** The agent running meme, from the variables its tool calls see; the innermost when one runs inside another. */
export function runningAgent(vars: Record<string, string | undefined>): Profile | null {
  return [...PROFILES].filter((p) => p.inside(vars)).sort((a, b) => b.nesting - a.nesting)[0] ?? null;
}
