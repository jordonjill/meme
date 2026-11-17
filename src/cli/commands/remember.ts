import { LockTimeout } from "../../memory/lock";
import { storeDir } from "../../memory/place";
import { projectRef } from "../../memory/projects";
import { modelFor, rememberWords, type About } from "../../memory/remember";
import { NewerFormat } from "../../memory/store";
import { oneLine } from "../../memory/types";
import { currentPlatform, displayPath } from "../../platform/paths";
import { redactText } from "../../redact/rules";
import { isReadOnlyError } from "../../store/db";
import { CommandError, parse, UsageError } from "../args";
import { projectOf, write } from "../context";

export const rememberHelp = `Usage: meme remember "<what to remember>" [--project | --about-me]

Keep something in meme's memory, for every agent that reads it.

With a model set up (\`meme model\`), the model words it, decides whether it is a
rule, a fact about you or about this project, and whether it repeats or replaces
something already remembered; your words are kept as the evidence. Without one,
your words go in as they are, and nothing is sent anywhere.

  (no option)   a rule for every agent: how you want them to work with you
  --project     a fact about the project of the current directory
  --about-me    a fact about you or your machines

With a model the options are hints. \`meme memory\` lists what is remembered;
\`meme memory forget <id>\` removes it.
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
  const root = projectOf(platform, process.cwd());
  const ref = projectRef(root);
  // Secrets are masked before the words go anywhere, the model included.
  const flat = oneLine(text);
  const words = redactText(flat);
  const about: About | undefined = values.project ? "project" : values["about-me"] ? "user" : undefined;
  const { model } = modelFor(store, platform.vars, root, ref);

  let done;
  try {
    done = await rememberWords({
      dataDir: store,
      origin: "user",
      records: [{ seq: 0, speaker: "user", text: words, ts: null }],
      focus: 0,
      words,
      about,
      project: ref,
      source: () => "cli",
      label: "meme remember",
      at: now,
      // Each time the user says it counts as one more piece of evidence.
      salt: now.toISOString(),
      model,
    });
  } catch (err) {
    if (err instanceof NewerFormat || err instanceof LockTimeout) throw new CommandError(`${err.message}; nothing was remembered`);
    if (isReadOnlyError(err)) throw new CommandError(`meme cannot write its memory here (${displayPath(store, home)} cannot be written); nothing was remembered`);
    throw err;
  }
  if (!done.kept.length) throw new CommandError(`not remembered: ${done.dropped.at(-1) ?? "nothing was kept"}`);
  for (const k of done.kept) {
    const where = displayPath(k.file, home);
    // Worded by the model, the entry is shown: it is not what was typed.
    const said = done.by === "model" ? `: ${k.text}` : "";
    if (k.change === "more evidence") write(`Already remembered as ${k.id} in ${where}${said}; noted that you said it again.\n`);
    else if (k.change === "replaced") write(`Remembered ${k.id} in ${where}, in place of an older entry${said}\n`);
    else write(`Remembered ${k.id} in ${where}${said ? said : "."}\n`);
  }
  if (done.modelError) write(`The model could not be asked (${done.modelError}); your words were kept as they are.\n`);
  if (words !== flat) write("A secret in it was masked before it was stored.\n");
  return 0;
}
