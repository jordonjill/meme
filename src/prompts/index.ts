import { createHash } from "node:crypto";
import readSession from "./read-session.md" with { type: "text" };
import remember from "./remember.md" with { type: "text" };
import experience from "./shelves/experience.md" with { type: "text" };
import project from "./shelves/project.md" with { type: "text" };
import rules from "./shelves/rules.md" with { type: "text" };
import aboutUser from "./shelves/user.md" with { type: "text" };
import writing from "./writing.md" with { type: "text" };
import { aboutChoices } from "./shelves";

/**
 * Everything meme says to a model, in one folder (plan-m2 F10); README.md lists who
 * reads what. Long prompts are Markdown files, filled here: `{{name}}` stands for a
 * value, and a name without a value, or a value without its name, is an error when
 * meme starts, never a prompt with a hole in it. The Markdown files are built into
 * the single file.
 */

export { ABOUT, ABOUT_WORDS, SHELF_WORDS, aboutChoices, type About } from "./shelves";
export { CONTEXT_NOTICE, MCP_INSTRUCTIONS, TOOL_WORDS } from "./agents";

export function fill(template: string, values: Record<string, string>): string {
  const used = new Set<string>();
  const out = template.replace(/\{\{(\w+)\}\}/g, (_, name: string) => {
    if (!(name in values)) throw new Error(`a prompt has {{${name}}} and no value for it`);
    used.add(name);
    return values[name]!;
  });
  const unused = Object.keys(values).filter((n) => !used.has(n));
  if (unused.length) throw new Error(`a prompt has no place for ${unused.join(", ")}`);
  return out;
}

/** A Markdown file's text without the line end editors put at its end. */
const text = (md: string) => md.replace(/\n$/, "");

/**
 * The kinds of memory as the model is told them (plan-m2 F11): each with the "kind"
 * and "about" that put a memory of that kind in its file, as shelfFor() in
 * src/memory/pipeline.ts does, and the rules of its own file under shelves/.
 */
const KINDS: [heading: string, rules: string][] = [
  ['Rules for every agent ("kind": "fact", "about": "rule")', rules],
  ['About the user and their machines ("kind": "fact", "about": "user")', aboutUser],
  ['Experience ("kind": "experience"; "about": "project" when it holds in this project only, "rule" when it holds everywhere)', experience],
  ['Facts about this project ("kind": "fact", "about": "project")', project],
];

/** How a memory is written: shared by reading sessions and by `remember`. */
export const WRITING = fill(text(writing), { about: aboutChoices(), kinds: KINDS.map(([heading, body]) => `### ${heading}\n${text(body)}`).join("\n\n") });

/** The pipeline: reading part of a session for what is worth keeping. */
export const READ_SESSION = fill(text(readSession), { writing: WRITING });

/** `remember`: the user asked for something to be kept; the model words it. */
export const REMEMBER = fill(text(remember), { writing: WRITING });

/** Said once more when the model's answer could not be read. */
export const ANSWER_AGAIN = "Answer with JSON only, in the form described.";

/**
 * Which prompts a memory was written with: a short hash of them, noted with each
 * change and each session read, so that what a version wrote can be found when the
 * prompts are tuned.
 */
export const PROMPTS_VERSION = createHash("sha256").update(READ_SESSION).update("\0").update(REMEMBER).digest("hex").slice(0, 8);
