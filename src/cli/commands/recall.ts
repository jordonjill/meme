import { runningAgent } from "../../adapters/profiles";
import { recall as recallEntries } from "../../memory/context";
import { parseShelf } from "../../memory/entries";
import { storeDir } from "../../memory/place";
import { memoryProject } from "../../memory/projects";
import { memoryPaths, readText } from "../../memory/store";
import { currentPlatform } from "../../platform/paths";
import { parse, UsageError } from "../args";
import { projectOf, write } from "../context";
import { titleOf } from "./memory";

export const recallHelp = `Usage: meme recall <words> [--all]

Find what meme remembers about something: the entries that have to do with
the words, the closest first. It looks among your own entries and those of
the project of the current directory.

  --all   also in other projects' entries

\`meme memory show <id>\` tells where an entry comes from.
`;

/** The most entries shown; what comes after is far from the words. */
const MOST = 10;

export async function recall(argv: string[]): Promise<number> {
  const { values, positionals } = parse(argv, { all: { type: "boolean" }, help: { type: "boolean", short: "h" } });
  if (values.help) {
    write(recallHelp);
    return 0;
  }
  const words = positionals.join(" ").trim();
  if (!words) throw new UsageError("recall needs the words to look for, e.g. meme recall pnpm");
  const platform = currentPlatform();
  const scope = { memoryDir: memoryPaths(storeDir(platform)).memory, project: memoryProject(projectOf(platform, process.cwd())), agent: runningAgent(platform.vars)?.agent ?? null };
  const found = recallEntries(scope, words, Boolean(values.all)).slice(0, MOST);
  if (!found.length) {
    write(`Nothing in memory has to do with: ${words}\n`);
    return 0;
  }
  // Where each one is: the file's own title, or for a project's file what the project is.
  const places = new Map<string, string>();
  const place = (file: string) => {
    if (!places.has(file)) {
      const preamble = parseShelf(readText(file) ?? "").preamble;
      places.set(file, /^Project: (.+)$/m.exec(preamble)?.[1] ?? titleOf(preamble, file));
    }
    return places.get(file)!;
  };
  write(found.map((f) => `${f.entry.id}  ${f.entry.text}  (${place(f.file)})`).join("\n") + "\n");
  return 0;
}
