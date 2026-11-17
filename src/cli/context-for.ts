import { readFileSync } from "node:fs";
import path from "node:path";
import { PROFILES } from "../adapters/profiles";
import { buildContext, contextText } from "../memory/context";
import { storeDir } from "../memory/place";
import { projectRef } from "../memory/projects";
import { memoryPaths } from "../memory/store";
import { branchOf, taskLines, unfinished } from "../memory/tasks";
import type { Platform } from "../platform/paths";
import { createContext, currentSessions, projectOf } from "./context";

/**
 * What an agent is given from memory for where it works (`meme context`, its hook, and the MCP
 * tool of that name): one place, so that every way in gives the same.
 */

/** The project's own instruction files, as far as they are there: what they say is not said again. */
export function instructionsIn(root: string): string[] {
  const texts: string[] = [];
  for (const name of new Set(PROFILES.map((p) => p.instructionFile))) {
    try {
      texts.push(readFileSync(path.join(root, name), "utf8"));
    } catch {}
  }
  return texts;
}

export interface ContextRequest {
  cwd: string;
  /** The agent that will read it, as its adapter names it. */
  agent: string | null;
  task?: string;
  /** A session that is asking, besides those meme can tell from the environment. */
  session?: string;
}

/**
 * What an agent is given for a directory: what memory holds for it, and the tasks
 * left unfinished in its project. The tasks come from the mirror of the sessions;
 * when that cannot be had, they are left out.
 */
export async function contextFor(platform: Platform, req: ContextRequest): Promise<string> {
  const root = projectOf(platform, req.cwd);
  const ctx = buildContext({ memoryDir: memoryPaths(storeDir(platform)).memory, project: projectRef(root), agent: req.agent }, { task: req.task, instructions: instructionsIn(root) });
  let tasks: string[] = [];
  try {
    const sessions = await createContext();
    try {
      const current = currentSessions(platform.vars);
      if (req.session) current.add(req.session.toLowerCase());
      tasks = taskLines(unfinished(sessions.store.db, root, { now: sessions.now, current, branch: branchOf(root) }));
    } finally {
      sessions.store.db.close();
    }
  } catch {}
  return contextText(ctx, tasks);
}
