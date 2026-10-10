import { mkdirSync, readdirSync, statSync, unlinkSync, writeFileSync } from "node:fs";
import path from "node:path";
import { isReadOnlyError } from "../store/db";

const two = (n: number) => String(n).padStart(2, "0");

/** `~/.meme/handoffs/<id8>-<yyyymmdd-hhmm>.md`, local time (plan §3.4). */
export function handoffPath(dataDir: string, sessionId: string, now: number): string {
  const d = new Date(now);
  const stamp = `${d.getFullYear()}${two(d.getMonth() + 1)}${two(d.getDate())}-${two(d.getHours())}${two(d.getMinutes())}`;
  return path.join(dataDir, "handoffs", `${sessionId.slice(0, 8)}-${stamp}.md`);
}

/** Save the handoff; null when nothing can be written here (read-only mode). */
export function saveHandoff(dataDir: string, sessionId: string, text: string, now: number): string | null {
  const file = handoffPath(dataDir, sessionId, now);
  try {
    mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
    writeFileSync(file, text, { mode: 0o600 });
    return file;
  } catch (err) {
    if (isReadOnlyError(err)) return null;
    throw err;
  }
}

/** Handoff files are only a way to pass a handoff to a new agent, not an archive (plan §3.4). */
export const HANDOFF_DAYS = 7;

/** Delete handoff files older than HANDOFF_DAYS; runs with every command. Never throws. */
export function pruneHandoffs(dataDir: string, now: number): number {
  const dir = path.join(dataDir, "handoffs");
  let removed = 0;
  let names: string[];
  try {
    names = readdirSync(dir);
  } catch {
    return 0;
  }
  for (const name of names) {
    if (!name.endsWith(".md")) continue;
    const file = path.join(dir, name);
    try {
      if (now - statSync(file).mtimeMs > HANDOFF_DAYS * 86_400_000) {
        unlinkSync(file);
        removed++;
      }
    } catch {}
  }
  return removed;
}
