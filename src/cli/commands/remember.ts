import { apply, type Applied } from "../../memory/apply";
import { LockTimeout } from "../../memory/lock";
import { storeDir } from "../../memory/place";
import { projectRef } from "../../memory/projects";
import { NewerFormat } from "../../memory/store";
import type { Shelf } from "../../memory/types";
import { currentPlatform, displayPath } from "../../platform/paths";
import { isReadOnlyError } from "../../store/db";
import { CommandError, parse, UsageError } from "../args";
import { projectOf, write } from "../context";

export const rememberHelp = `Usage: meme remember "<what to remember>" [--project | --about-me]

Keep something in meme's memory, in your own words, for every agent that reads
it. Nothing is sent anywhere and no model is asked.

  (no option)   a rule for every agent: how you want them to work with you
  --project     a fact about the project of the current directory
  --about-me    a fact about you or your machines

\`meme memory\` lists what is remembered; \`meme memory forget <id>\` removes it.
`;

export async function remember(argv: string[]): Promise<number> {
  const { values, positionals } = parse(argv, {
    project: { type: "boolean" },
    "about-me": { type: "boolean" },
    help: { type: "boolean", short: "h" },
  });
  if (values.help) {
    write(rememberHelp);
    return 0;
  }
  if (values.project && values["about-me"]) throw new UsageError("--project and --about-me do not go together");
  const text = positionals.join(" ").trim();
  if (!text) throw new UsageError('remember needs the words to remember, e.g. meme remember "reply in Chinese"');

  const platform = currentPlatform();
  const home = platform.home;
  const store = storeDir(platform);
  const now = new Date();
  let shelf: Shelf = { level: "user", file: values["about-me"] ? "USER" : "RULES" };
  let scope = "user";
  let project: string | undefined;
  if (values.project) {
    const ref = projectRef(projectOf(platform, process.cwd()));
    shelf = { level: "project", project: ref.key, file: "MEMORY" };
    scope = `project:${ref.key}`;
    project = ref.identity;
  }

  let done: Applied;
  try {
    done = await apply(store, {
      origin: "user",
      // The user's own words are the evidence; each time they are said counts.
      evidence: [{ kind: "fact", tier: "stated", speaker: "user", scope, source: "cli", content: text, at: now, label: "meme remember", salt: now.toISOString() }],
      ops: [{ op: "add", shelf, text, kind: "fact", evidence: [0], project }],
    });
  } catch (err) {
    if (err instanceof NewerFormat || err instanceof LockTimeout) throw new CommandError(`${err.message}; nothing was remembered`);
    if (isReadOnlyError(err)) throw new CommandError(`meme cannot write its memory here (${displayPath(store, home)} cannot be written); nothing was remembered`);
    throw err;
  }
  const outcome = done.outcomes[0]!;
  if (!outcome.ok) throw new CommandError(`not remembered: ${outcome.reason}`);
  const where = displayPath(outcome.file, home);
  write(outcome.change === "added" ? `Remembered ${outcome.id} in ${where}.\n` : `Already remembered as ${outcome.id} in ${where}; noted that you said it again.\n`);
  if (done.masked) write("A secret in it was masked before it was stored.\n");
  return 0;
}
