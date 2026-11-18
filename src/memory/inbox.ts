import { mkdirSync, readdirSync, readFileSync, renameSync, rmSync, statSync } from "node:fs";
import path from "node:path";
import { noteDeclined } from "./digest";
import type { ProjectRef } from "./projects";
import { rememberWords, type About, type Remembered, type RememberRequest } from "./remember";
import { memoryPaths, writeFileAtomic, type MemoryPaths } from "./store";
import type { Shown } from "./transcript";

/**
 * What an agent passed on to be remembered, waiting to be worded (plan-m2 F9, F10).
 * The agent is answered at once; the item is kept here first, so that nothing is
 * lost when the agent closes before the model answers: the next run of the pipeline
 * takes up what is left.
 *
 * An item can also wait to be found: `meme remember` run inside an agent may be the
 * user's own `! meme remember`, which shows in the session only once it has run.
 * Such an item is kept once its words are found among the user's messages, and not
 * kept when they are not found within FIND_MS.
 */
export interface InboxItem {
  /** The user's words, secrets masked. */
  words: string;
  note?: string;
  about?: About;
  /** Keep the words as they are, without the model. */
  asIs?: true;
  /** Where the user said them: the session, the message, and the records around it. Absent while the item waits to be found. */
  session?: string;
  focus?: number;
  records?: Shown[];
  project: ProjectRef | null;
  label: string;
  at: string;
}

/** Where words were found among the user's messages. */
export interface Found {
  session: string;
  /** The session's project folder. */
  root: string | null;
  focus: number;
  records: Shown[];
  at: Date | null;
}

/** For items that wait to be found: how to look for the words, and the model for where they were found. */
export interface Finding {
  find(words: string): Promise<Found | null>;
  modelFor(root: string | null): RememberRequest["model"];
  project(root: string | null): ProjectRef | null;
}

/** How long an item waits for its words to show in a session. */
export const FIND_MS = 2 * 60 * 1000;

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

/**
 * Words one item; the item goes once that is done, kept or not. Null when another
 * process has it, or when it waits to be found and may still be.
 */
export async function processItem(dataDir: string, file: string, model: RememberRequest["model"], finding?: Finding, now = Date.now()): Promise<Remembered | null> {
  const mine = take(file);
  if (!mine) return null;
  let item: InboxItem;
  try {
    item = JSON.parse(readFileSync(mine, "utf8")) as InboxItem;
  } catch {
    rmSync(mine, { force: true });
    return null;
  }
  let at = new Date(item.at);
  if (item.session === undefined || item.focus === undefined || !item.records) {
    const found = finding ? await finding.find(item.words) : null;
    if (!found) {
      if (finding && now - at.getTime() > FIND_MS) {
        noteDeclined(memoryPaths(dataDir), { at: item.at, words: item.words, from: item.label, why: "not found in what you said" });
        rmSync(mine, { force: true });
        return { kept: [], dropped: [], by: "not found" };
      }
      // Back for later: the session may not show it yet.
      renameSync(mine, mine.replace(/\.\d+\.taken$/, ""));
      return null;
    }
    item = { ...item, session: found.session, focus: found.focus, records: found.records, project: finding!.project(found.root) };
    at = found.at ?? at;
    model = item.asIs ? null : finding!.modelFor(found.root);
  }
  const session = item.session!;
  const done = await rememberWords({
    dataDir,
    origin: "agent",
    records: item.records!,
    focus: item.focus!,
    words: item.words,
    about: item.about,
    ...(item.note ? { note: item.note } : {}),
    project: item.project,
    source: (record) => `session:${session}#${record.seq}`,
    label: item.label,
    at,
    model: item.asIs ? null : model,
  });
  rmSync(mine, { force: true });
  return done;
}

export function ensureInbox(p: MemoryPaths): void {
  mkdirSync(dir(p), { recursive: true, mode: 0o700 });
}
