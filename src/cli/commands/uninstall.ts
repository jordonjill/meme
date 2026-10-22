import { existsSync, lstatSync, readdirSync, realpathSync, rmdirSync, statSync } from "node:fs";
import path from "node:path";
import { removeDir, removeFile } from "../../platform/fs";
import { currentPlatform, displayPath } from "../../platform/paths";
import { findCommand } from "../../platform/spawn";
import { size } from "../../render/text";
import { parse, UsageError } from "../args";
import { agreed, write } from "../context";

export const uninstallHelp = `Usage: meme uninstall [--yes]

Remove meme's data in ~/.meme: the mirror of your sessions, the logs, and
the copies of agents' databases meme reads across WSL and Windows; then the
folder, if nothing else is in it. Your original sessions are not touched. Asks first ([y/N]); --yes skips
the question.
`;

/**
 * What meme keeps in its data folder, and all uninstall removes there: the folder may
 * be a link (plan §6 ⑨, R22), or MEME_HOME may name one that holds other files, even
 * the home folder (plan §6 ⑪, F2).
 */
const OWN = ["meme.sqlite", "meme.sqlite-journal", "meme.sqlite-wal", "meme.sqlite-shm", "logs/meme.log", "logs/meme.log.1", "cache/opencode"];
/** The folders that hold them, removed when that leaves them empty; the data folder itself last. */
const OWN_DIRS = ["logs", "cache", ""];

/** Is anything in the data folder not meme's? */
function holdsOthers(dir: string): boolean {
  const list = (rel: string) => {
    try {
      return readdirSync(path.join(dir, rel));
    } catch {
      return [];
    }
  };
  return OWN_DIRS.some((rel) =>
    list(rel).some((name) => !OWN.includes(rel ? `${rel}/${name}` : name) && !(rel === "" && OWN_DIRS.includes(name))),
  );
}

function ownSize(dir: string): number {
  let total = 0;
  for (const p of OWN.map((p) => path.join(dir, p))) {
    try {
      total += statSync(p).isDirectory() ? folderSize(p) : statSync(p).size;
    } catch {}
  }
  return total;
}

/** Where a linked data folder points (plan §6 ⑨, R22); null for a folder. */
function linkTarget(dir: string): string | null {
  try {
    return lstatSync(dir).isSymbolicLink() ? realpathSync(dir) : null;
  } catch {
    return null;
  }
}

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

  const target = linkTarget(data);
  lines.push("This removes:");
  lines.push(`  ${displayPath(data, home)}${target ? ` -> ${displayPath(target, home)}` : ""}   the mirror, the logs and copies (${size(ownSize(target ?? data))})`);
  if (holdsOthers(target ?? data)) lines.push(`Other files in ${displayPath(data, home)} are kept.`);
  lines.push("Your original sessions are not touched.");
  write(lines.join("\n") + "\n");

  if (!values.yes) {
    if (!process.stdin.isTTY || !process.stdout.isTTY) {
      process.stderr.write("meme: nothing removed. Removing needs the user's confirmation: run it in a terminal, or add --yes only if the user has explicitly asked to remove meme's data.\n");
      return 1;
    }
    if (!agreed("Remove them?")) {
      write("Nothing removed.\n");
      return 1;
    }
  }
  // meme's own files, the folders that held them if that leaves them empty, then a link to the folder.
  const where = target ?? data;
  for (const p of OWN) removeDir(path.join(where, p));
  for (const dir of OWN_DIRS) {
    try {
      rmdirSync(path.join(where, dir));
    } catch {}
  }
  if (target) removeFile(data);
  write(`Removed. ${programNote}\n`);
  return 0;
}
