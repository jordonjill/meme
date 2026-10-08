import { promptText } from "./record";

const MAX_TITLE = 200;

/** First non-empty line of a prompt, whitespace collapsed. */
export function firstLine(text: string): string {
  for (const line of text.split("\n")) {
    const t = line.replace(/\s+/g, " ").replace(/[\x00-\x1f\x7f]/g, "").trim();
    if (t) return t.length > MAX_TITLE ? t.slice(0, MAX_TITLE) : t;
  }
  return "";
}

/**
 * Title (format.md §2 item 4): the user's own title, then the agent's generated
 * one, then the first prompt. A first prompt that is only a `/command` is skipped
 * when a real one follows.
 */
export function titleOf(custom: string | null, generated: string | null, prompts: string[]): string | null {
  if (custom?.trim()) return firstLine(custom);
  if (generated?.trim()) return firstLine(generated);
  const texts = prompts.map((p) => firstLine(promptText(p))).filter(Boolean);
  return texts.find((t) => !t.startsWith("/")) ?? texts[0] ?? null;
}
