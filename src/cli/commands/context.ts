import { readFileSync } from "node:fs";
import path from "node:path";
import { PROFILES, runningAgent } from "../../adapters/profiles";
import { buildContext, contextText } from "../../memory/context";
import { projectRef } from "../../memory/projects";
import { memoryPaths } from "../../memory/store";
import { branchOf, taskLines, unfinished } from "../../memory/tasks";
import { currentPlatform, type Platform } from "../../platform/paths";
import { parse } from "../args";
import { createContext, currentSessions, projectOf, write } from "../context";

export const contextHelp = `Usage: meme context [<what you are about to work on>]

What meme remembers that holds here, for an agent to read before it starts:
your rules, facts about you, facts about the project of the current directory,
and the work left unfinished in it. Given the task in a few words, also the
few other entries that have to do with it.

It prints nothing when there is nothing for here.

  --hook   for an agent's hook: the directory and the session are read from
           the JSON the agent gives on standard input, and nothing ever makes
           it fail
`;

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
  const ctx = buildContext({ memoryDir: memoryPaths(platform.dataDir).memory, project: projectRef(root), agent: req.agent }, { task: req.task, instructions: instructionsIn(root) });
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

/** What an agent's hook passes on standard input: a JSON object; anything else is nothing. */
async function hookInput(): Promise<Record<string, unknown>> {
  try {
    const parsed: unknown = JSON.parse(await Bun.stdin.text());
    return typeof parsed === "object" && parsed !== null && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

export async function context(argv: string[]): Promise<number> {
  const { values, positionals } = parse(argv, { hook: { type: "boolean" }, help: { type: "boolean", short: "h" } });
  if (values.help) {
    write(contextHelp);
    return 0;
  }
  const platform = currentPlatform();
  const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : undefined);
  if (values.hook) {
    // A hook must never stand in the agent's way: whatever goes wrong, say nothing and succeed.
    try {
      const input = await hookInput();
      // Another agent that loads this agent's hooks is not the one the plugin was installed for.
      if (PROFILES.some((p) => p.foreignHook?.(input, platform.vars))) return 0;
      const cwd = str(input.cwd);
      write(await contextFor(platform, { cwd: cwd && path.isAbsolute(cwd) ? cwd : process.cwd(), agent: runningAgent(platform.vars)?.agent ?? null, task: str(input.prompt), session: str(input.session_id) }));
    } catch {}
    return 0;
  }
  write(await contextFor(platform, { cwd: process.cwd(), agent: runningAgent(platform.vars)?.agent ?? null, task: positionals.join(" ").trim() || undefined }));
  return 0;
}
