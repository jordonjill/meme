/**
 * What each memory file holds (plan-m2 F10), said once: to the person who opens the
 * file, in its first lines; and to a model, in the prompts and the tool descriptions.
 */

/** What a memory is about, as a model says it; experience goes with the rules or with the project. */
export type About = "rule" | "user" | "project";
export const ABOUT: readonly About[] = ["rule", "user", "project"];

export interface ShelfWords {
  /** The heading of its file. */
  title: string;
  /** What it holds, said to the person reading the file. */
  forYou: string;
}

export const SHELF_WORDS: Record<"RULES" | "USER" | "EXPERIENCE" | "MEMORY", ShelfWords> = {
  RULES: { title: "Rules", forYou: "How you want every agent to work with you." },
  USER: { title: "About you", forYou: "Facts about you and your machines." },
  EXPERIENCE: { title: "Experience", forYou: "What was learned from how things turned out." },
  MEMORY: { title: "Project memory", forYou: "Facts about this project." },
};

/** What each `about` stands for, said to a model. */
export const ABOUT_WORDS: Record<About, string> = {
  rule: "how every agent should work with the user",
  user: "the user and their machines",
  project: "this project",
};

/** `"rule" (how every agent …), "user" (…) or "project" (…)`. */
export function aboutChoices(): string {
  const each = ABOUT.map((a) => `"${a}" (${ABOUT_WORDS[a]})`);
  return `${each.slice(0, -1).join(", ")} or ${each.at(-1)}`;
}
