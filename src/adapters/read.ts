import { readFileSync } from "node:fs";

/**
 * Read a JSONL session. A running agent may be in the middle of writing the last
 * line; that line is left out until it is complete (storage.md 2.4).
 */
export function readJsonl(path: string): string {
  const text = readFileSync(path, "utf8");
  return dropPartialLine(text);
}

export function dropPartialLine(text: string): string {
  if (text === "" || text.endsWith("\n")) return text;
  const cut = text.lastIndexOf("\n");
  const last = text.slice(cut + 1);
  try {
    JSON.parse(last);
    return text;
  } catch {
    return text.slice(0, cut + 1);
  }
}

/** Each non-empty line parsed as a JSON object; other lines are skipped. */
export function parseLines(text: string): { index: number; obj: Record<string, unknown> }[] {
  const out: { index: number; obj: Record<string, unknown> }[] = [];
  const lines = text.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    if (!line.trim()) continue;
    try {
      const v = JSON.parse(line);
      if (v && typeof v === "object" && !Array.isArray(v)) out.push({ index: i, obj: v });
    } catch {}
  }
  return out;
}
