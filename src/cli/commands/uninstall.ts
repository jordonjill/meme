import { existsSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { removeDir } from "../../platform/fs";
import { currentPlatform, displayPath } from "../../platform/paths";
import { findCommand } from "../../platform/spawn";
import { size } from "../../render/text";
import { parse, UsageError } from "../args";
import { agreed, write } from "../context";

export const uninstallHelp = `Usage: meme uninstall [--yes]

Remove the ~/.meme folder: the mirror of your sessions and the logs.
Your original sessions are not touched. Asks first ([y/N]); --yes skips
the question.
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

/**
 * The program to delete afterwards: the `meme` on PATH (which may be a link to
 * the file that runs), else the running single file itself.
 */
function programFile(vars: Record<string, string | undefined>): string | null {
  const onPath = findCommand("meme", vars);
  if (onPath) return onPath;
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

  const data = existsSync(platform.dataDir) ? platform.dataDir : null;

  const lines: string[] = [];
  const program = programFile(platform.vars);
  const programNote = program
    ? `To remove meme itself, delete ${displayPath(program, home)}${process.platform === "win32" ? " once this command has finished" : ""}.`
    : "meme is running from its sources; there is no program file to delete.";
  if (!data) {
    lines.push(`Nothing to remove: there is no ${displayPath(platform.dataDir, home)}.`);
    lines.push(programNote);
    write(lines.join("\n") + "\n");
    return 0;
  }

  lines.push("This removes:");
  lines.push(`  ${displayPath(data, home)}   the mirror and the logs (${size(folderSize(data))})`);
  lines.push("Your original sessions are not touched.");
  write(lines.join("\n") + "\n");

  if (!values.yes) {
    if (!process.stdin.isTTY || !process.stdout.isTTY) {
      process.stderr.write("meme: nothing removed; run `meme uninstall --yes` to go ahead\n");
      return 1;
    }
    if (!agreed("Remove them?")) {
      write("Nothing removed.\n");
      return 1;
    }
  }
  removeDir(data);
  write(`Removed. ${programNote}\n`);
  return 0;
}
