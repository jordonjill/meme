import { keptFromModel, promptText } from "./record";

const MAX_TITLE = 200;

/** A terminal's escape sequences, whole: CSI (`\x1b[31m`), OSC (`\x1b]0;title\x07`) and the two-character ones. */
const ESCAPES = /\x1b(?:\[[0-?]*[ -/]*[@-~]|\][^\x07\x1b]*(?:\x07|\x1b\\)?|[@-Z\\-_])/g;

/** The first non-empty line of a text, whitespace collapsed, escape sequences and control characters dropped (plan §6 ⑪, F20). */
function firstWholeLine(text: string): string {
  for (const line of text.split("\n")) {
    const t = line.replace(ESCAPES, "").replace(/\s+/g, " ").replace(/[\x00-\x1f\x7f]/g, "").trim();
    if (t) return t;
  }
  return "";
}

/** First non-empty line of a prompt, whitespace collapsed, at most 200 characters. */
export function firstLine(text: string): string {
  const t = firstWholeLine(text);
  return t.length > MAX_TITLE ? t.slice(0, MAX_TITLE) : t;
}

const segmenter = new Intl.Segmenter();

/**
 * A title: the first line, up to about 200 characters, with `…` when it was cut,
 * never inside a character (plan §6 ⑩.1). The handoff starts with it in full.
 */
function titleLine(text: string): string {
  const t = firstWholeLine(text);
  if (t.length <= MAX_TITLE) return t;
  // A character is at most a few code units; this is plenty for 200 of them.
  const chars = Array.from(segmenter.segment(t.slice(0, MAX_TITLE * 16)), (x) => x.segment);
  return chars.length <= MAX_TITLE ? t : chars.slice(0, MAX_TITLE - 1).join("") + "…";
}

/**
 * Title (format.md §2 item 4): the user's own title, then the agent's generated
 * one, then the first prompt. A first prompt that is only a `/command` or a `!`
 * shell command is skipped when a real one follows.
 */
export function titleOf(custom: string | null, generated: string | null, prompts: string[]): string | null {
  if (custom?.trim()) return titleLine(custom);
  if (generated?.trim()) return titleLine(generated);
  // A command kept from the model is never the title, which a handoff starts with (plan §6 ⑪, F9).
  const texts = prompts.filter((p) => !keptFromModel(p)).map((p) => titleLine(promptText(p))).filter(Boolean);
  return texts.find((t) => !t.startsWith("/") && !t.startsWith("! ")) ?? texts[0] ?? null;
}
