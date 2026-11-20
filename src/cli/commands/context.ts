import path from "node:path";
import { PROFILES, runningAgent } from "../../adapters/profiles";
import { currentPlatform } from "../../platform/paths";
import { parse } from "../args";
import { write } from "../context";
import { maybeStartUpdate } from "../background";
import { contextFor } from "../context-for";

export const contextHelp = `Usage: meme context [<what you are about to work on>]

What meme remembers that holds here, for an agent to read before it starts:
your rules, facts about you, facts about the project of the current directory
and facts that hold beyond one project, and the work left unfinished in it.
Given the task in a few words, also the few other entries that have to do
with it.

It prints nothing when there is nothing for here.

  --hook   for an agent's hook: the directory and the session are read from
           the JSON the agent gives on standard input, and nothing ever makes
           it fail
`;

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
      // An agent is starting: a good moment to let memory catch up, in the background.
      maybeStartUpdate(platform);
    } catch {}
    return 0;
  }
  write(await contextFor(platform, { cwd: process.cwd(), agent: runningAgent(platform.vars)?.agent ?? null, task: positionals.join(" ").trim() || undefined }));
  maybeStartUpdate(platform);
  return 0;
}
