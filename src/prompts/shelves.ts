/**
 * What each memory file holds (plan-m2 F10, F12), said once: to the person who opens
 * the file, in its first lines; and to a model, in the prompts and the tool descriptions.
 */

/** What a memory is about, as a model says it; experience goes with the user's files or with the project. */
export type About = "rule" | "user" | "general" | "project";
export const ABOUT: readonly About[] = ["rule", "user", "general", "project"];

export interface ShelfWords {
  /** The heading of its file. */
  title: string;
  /** What it holds, said to the person reading the file. */
  forYou: string;
}

/** By file; `PROJECT` is a project's MEMORY.md, the user's own being `MEMORY`. */
export const SHELF_WORDS: Record<"RULES" | "USER" | "MEMORY" | "EXPERIENCE" | "PROJECT", ShelfWords> = {
  RULES: { title: "Rules", forYou: "How you want every agent to work with you." },
  USER: { title: "About you", forYou: "Who you are: your work, what you know, your machines." },
  MEMORY: { title: "Memory", forYou: "What to remember beyond one project: across your projects, or from sessions in none." },
  EXPERIENCE: { title: "Experience", forYou: "What was learned from how things turned out." },
  PROJECT: { title: "Project memory", forYou: "Facts about this project." },
};

/** What each `about` stands for, said to a model. */
export const ABOUT_WORDS: Record<About, string> = {
  rule: "how every agent should work with the user",
  user: "who the user is: their work, what they know, their machines",
  general: "what to remember beyond one project",
  project: "this project",
};

/** `"rule" (how every agent …), "user" (…) or "project" (…)`. */
export function aboutChoices(): string {
  const each = ABOUT.map((a) => `"${a}" (${ABOUT_WORDS[a]})`);
  return `${each.slice(0, -1).join(", ")} or ${each.at(-1)}`;
}
