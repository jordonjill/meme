import { mkdirSync, readdirSync, readFileSync, renameSync, rmSync, statSync } from "node:fs";
import path from "node:path";
import type { ProjectRef } from "./projects";
import { rememberWords, type About, type Remembered, type RememberRequest } from "./remember";
import { writeFileAtomic, type MemoryPaths } from "./store";
import type { Shown } from "./transcript";

/**
 * What an agent passed on to be remembered, waiting for meme's model to word it
 * (plan-m2 F9). The agent is answered at once; the item is kept here first, so that
 * nothing is lost when the agent closes before the model answers: the next run of
 * the pipeline takes up what is left.
 */
export interface InboxItem {
  /** The user's words, secrets masked. */
  words: string;
  note?: string;
  about?: About;
  session: string;
  focus: number;
  /** The user's message and the ones around it, as found when the agent asked. */
  records: Shown[];
  project: ProjectRef | null;
  label: string;
  at: string;
}

const dir = (p: MemoryPaths) => path.join(p.state, "inbox");
/** An item someone took and has not finished in this long was left by a process that died. */
const STALE_MS = 10 * 60 * 1000;

export function putInbox(p: MemoryPaths, item: InboxItem): string {
  const file = path.join(dir(p), `${Date.now().toString(36)}-${crypto.randomUUID().slice(0, 8)}.json`);
  writeFileAtomic(file, JSON.stringify(item) + "\n");
  return file;
}

/** Takes an item for this process alone; null when another has it. */
function take(file: string): string | null {
  const mine = `${file.replace(/\.json(\.\d+\.taken)?$/, ".json")}.${process.pid}.taken`;
  try {
    renameSync(file, mine);
    return mine;
  } catch {
    return null;
  }
}

/** The items waiting, and those taken by a process that did not finish them. */
export function waiting(p: MemoryPaths, now = Date.now()): string[] {
  let names: string[];
  try {
    names = readdirSync(dir(p)).sort();
  } catch {
    return [];
  }
  return names
    .map((n) => path.join(dir(p), n))
    .filter((f) => {
      if (f.endsWith(".json")) return true;
      if (!f.endsWith(".taken")) return false;
      try {
        return now - statSync(f).mtimeMs > STALE_MS;
      } catch {
        return false;
      }
    });
}

/** Words one item; the item goes once that is done, kept or not. */
export async function processItem(dataDir: string, file: string, model: RememberRequest["model"]): Promise<Remembered | null> {
  const mine = take(file);
  if (!mine) return null;
  let item: InboxItem;
  try {
    item = JSON.parse(readFileSync(mine, "utf8")) as InboxItem;
  } catch {
    rmSync(mine, { force: true });
    return null;
  }
  const done = await rememberWords({
    dataDir,
    origin: "agent",
    records: item.records,
    focus: item.focus,
    words: item.words,
    about: item.about,
    ...(item.note ? { note: item.note } : {}),
    project: item.project,
    source: (record) => `session:${item.session}#${record.seq}`,
    label: item.label,
    at: new Date(item.at),
    model,
  });
  rmSync(mine, { force: true });
  return done;
}

export function ensureInbox(p: MemoryPaths): void {
  mkdirSync(dir(p), { recursive: true, mode: 0o700 });
}
