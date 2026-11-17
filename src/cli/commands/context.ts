import { readFileSync } from "node:fs";
import path from "node:path";
import { PROFILES, runningAgent } from "../../adapters/profiles";
import { buildContext, contextText } from "../../memory/context";
import { projectRef } from "../../memory/projects";
import { memoryPaths } from "../../memory/store";
import { currentPlatform } from "../../platform/paths";
import { parse } from "../args";
import { projectOf, write } from "../context";

export const contextHelp = `Usage: meme context [<what you are about to work on>]

What meme remembers that holds here, for an agent to read before it starts:
your rules, facts about you, and facts about the project of the current
directory. Given the task in a few words, also the few other entries that have
to do with it.

It only reads. It prints nothing when memory has nothing for here.
`;

/** The project's own instruction files, as far as they are there: what they say is not said again. */
function instructionsIn(root: string): string[] {
  const texts: string[] = [];
  for (const name of new Set(PROFILES.map((p) => p.instructionFile))) {
    try {
      texts.push(readFileSync(path.join(root, name), "utf8"));
    } catch {}
  }
  return texts;
}

export async function context(argv: string[]): Promise<number> {
  const { values, positionals } = parse(argv, { help: { type: "boolean", short: "h" } });
  if (values.help) {
    write(contextHelp);
    return 0;
  }
  const platform = currentPlatform();
  const root = projectOf(platform, process.cwd());
  const scope = { memoryDir: memoryPaths(platform.dataDir).memory, project: projectRef(root), agent: runningAgent(platform.vars)?.agent ?? null };
  write(contextText(buildContext(scope, { task: positionals.join(" ").trim() || undefined, instructions: instructionsIn(root) })));
  return 0;
}
