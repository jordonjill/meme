import { existsSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { ADAPTERS } from "../../adapters";
import { removeSkill, skillFile, skillState } from "../../install/skill";
import { removeDir } from "../../platform/fs";
import { currentPlatform, displayPath } from "../../platform/paths";
import { size } from "../../render/text";
import { parse, UsageError } from "../args";
import { write } from "../context";

export const uninstallHelp = `Usage: meme uninstall [--yes]

Remove the meme skills and the ~/.meme folder (the mirror, handoff files and
logs). Your original sessions are not touched. Asks you to type yes first;
--yes skips the question.
`;

function folderSize(dir: string): number {
  let total = 0;
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    try {
      total += e.isDirectory() ? folderSize(p) : statSync(p).size;
    } catch {}
  }
  return total;
}

/** Where the program itself lives, if it is a built single file. */
function programFile(): string | null {
  const exe = process.execPath;
  return /^bun(\.exe)?$/i.test(path.basename(exe)) ? null : exe;
}

export async function uninstall(argv: string[]): Promise<number> {
  const { values, positionals } = parse(argv, { yes: { type: "boolean" }, help: { type: "boolean", short: "h" } });
  if (values.help) {
    write(uninstallHelp);
    return 0;
  }
  if (positionals.length) throw new UsageError(`uninstall takes no arguments, got ${positionals[0]}`);
  const platform = currentPlatform();
  const home = platform.home;

  const skills: string[] = [];
  const kept: string[] = [];
  for (const adapter of ADAPTERS) {
    const dir = adapter.skillDir(platform);
    const state = skillState(dir);
    if (state === "current" || state === "outdated") skills.push(dir);
    else if (state === "foreign") kept.push(path.join(dir, "meme"));
  }
  const data = existsSync(platform.dataDir) ? platform.dataDir : null;

  const lines: string[] = [];
  const program = programFile();
  const programNote = program ? `To remove meme itself, delete ${program}.` : "meme is running from its sources; there is no program file to delete.";
  if (!skills.length && !data) {
    lines.push("Nothing to remove: no meme skill and no meme data folder.");
    for (const k of kept) lines.push(`Left alone: ${displayPath(k, home)} (not put there by meme)`);
    lines.push(programNote);
    write(lines.join("\n") + "\n");
    return 0;
  }

  lines.push("This removes:");
  for (const dir of skills) lines.push(`  ${displayPath(skillFile(dir), home)}   the meme skill`);
  if (data) lines.push(`  ${displayPath(data, home)}   the mirror, handoff files and logs (${size(folderSize(data))})`);
  for (const k of kept) lines.push(`Left alone: ${displayPath(k, home)} (not put there by meme)`);
  lines.push("Your original sessions are not touched.");
  write(lines.join("\n") + "\n");

  if (!values.yes) {
    if (!process.stdin.isTTY || !process.stdout.isTTY) {
      process.stderr.write("meme: nothing removed; run `meme uninstall --yes` to go ahead\n");
      return 1;
    }
    const answer = prompt("Type yes to remove them:");
    if (answer?.trim().toLowerCase() !== "yes") {
      write("Nothing removed.\n");
      return 1;
    }
  }
  for (const dir of skills) removeSkill(dir);
  if (data) removeDir(data);
  write(`Removed. ${programNote}\n`);
  return 0;
}
