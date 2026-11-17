import type { Database } from "bun:sqlite";
import { readFileSync } from "node:fs";
import path from "node:path";
import { profileOf } from "../adapters/profiles";
import { endingOf, mayBeRunning, type Ending } from "../model/turns";
import { allSessions, sessionRecords, type SessionRow } from "../store/queries";

/**
 * Working memory (memory-v0.3-draft §4.3): the tasks in a project that were left
 * unfinished. Nothing is stored for it; it is worked out from the mirror of the
 * sessions each time, and a task is over as soon as its session was continued or
 * has aged out.
 */

export interface Task {
  session: SessionRow;
  /** Stopped by the user, or left in the middle of a step. */
  ending: Exclude<Ending, "finished">;
}

/** A session that has not gone on for this long is not a task any more. */
const DAYS = 7;
const MOST = 3;

export interface TaskOptions {
  now: number;
  /** The sessions that are running meme right now: the task at hand is not a task left behind. */
  current: Set<string>;
  /** The branch checked out now; a session on another branch is another line of work. */
  branch?: string | null;
}

export function unfinished(db: Database, project: string, opts: TaskOptions): Task[] {
  const tasks: Task[] = [];
  for (const s of allSessions(db)) {
    if (tasks.length >= MOST) break;
    if (s.project !== project || !s.talked || s.superseded || opts.current.has(s.id) || (s.unreadable && !s.readable_until)) continue;
    const ended = Date.parse(s.ended_at ?? "") || s.mtime || 0;
    if (opts.now - ended > DAYS * 24 * 60 * 60 * 1000) continue;
    if (opts.branch && s.branch && s.branch !== opts.branch) continue;
    // Still being written to: someone is working in it in another window.
    if (mayBeRunning(s.mtime, opts.now)) continue;
    const ending = endingOf(sessionRecords(db, s.id));
    if (ending !== "finished") tasks.push({ session: s, ending });
  }
  return tasks;
}

/** The branch checked out in a repository; null when its head is no branch, or it is no repository. */
export function branchOf(root: string): string | null {
  try {
    return /^ref: refs\/heads\/(.+)$/m.exec(readFileSync(path.join(root, ".git", "HEAD"), "utf8"))?.[1]?.trim() ?? null;
  } catch {
    return null;
  }
}

/** One line per task, with the command that takes it up again. */
export function taskLines(tasks: Task[]): string[] {
  return tasks.map(({ session: s, ending }) => {
    const day = (s.ended_at ?? "").slice(0, 10);
    const title = s.title ? `"${s.title.replace(/\s+/g, " ").slice(0, 80)}"` : "(no title)";
    return `- ${[day, profileOf(s.agent).name, s.branch ? `branch ${s.branch}` : ""].filter(Boolean).join(", ")}: ${title}, ${ending === "interrupted" ? "stopped by the user" : "left in the middle of a step"}. To take it up: meme continue ${s.short}`;
  });
}
