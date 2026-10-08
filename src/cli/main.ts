#!/usr/bin/env bun
import pkg from "../../package.json";
import { fileLogger } from "../platform/log";
import { currentPlatform } from "../platform/paths";
import { LookupError } from "../store/queries";
import { UsageError } from "./args";
import { ls, lsHelp } from "./commands/ls";
import { search, searchHelp } from "./commands/search";
import { show, showHelp } from "./commands/show";
import { status, statusHelp } from "./commands/status";

const COMMANDS: Record<string, { run: (argv: string[]) => Promise<number>; help: string }> = {
  ls: { run: ls, help: lsHelp },
  show: { run: show, help: showHelp },
  search: { run: search, help: searchHelp },
  status: { run: status, help: statusHelp },
};

const USAGE = `meme ${pkg.version}: read your coding-agent sessions in one place.

Usage: meme <command> [options]

Commands:
  ls       list sessions (current project; -a for all)
  show     show a session, a turn per line
  search   search past sessions, like rg
  status   version, data location, session sources

Run \`meme <command> --help\` for a command's options.
`;

export async function main(argv: string[]): Promise<number> {
  const [command, ...rest] = argv;
  if (!command || command === "help" || command === "-h" || command === "--help") {
    const topic = command === "help" && rest[0] ? COMMANDS[rest[0]] : undefined;
    process.stdout.write(topic ? topic.help : USAGE);
    return 0;
  }
  if (command === "--version" || command === "-v" || command === "version") {
    process.stdout.write(`meme ${pkg.version}\n`);
    return 0;
  }
  const cmd = COMMANDS[command];
  if (!cmd) {
    process.stderr.write(`meme: unknown command: ${command}\n${USAGE}`);
    return 2;
  }
  try {
    return await cmd.run(rest);
  } catch (err) {
    if (err instanceof UsageError) {
      process.stderr.write(`meme ${command}: ${err.message}\nRun \`meme ${command} --help\` for usage.\n`);
      return 2;
    }
    if (err instanceof LookupError || err instanceof RangeError) {
      process.stderr.write(`meme: ${err.message}\n`);
      return 1;
    }
    // One short line for the user; the details go to the log (plan §3).
    const platform = currentPlatform();
    fileLogger(platform.dataDir).error(`meme ${argv.join(" ")}`, err);
    process.stderr.write(`meme: ${err instanceof Error ? err.message : String(err)} (details in ${platform.dataDir}/logs/meme.log)\n`);
    return 1;
  }
}

process.stdout.on("error", (err: NodeJS.ErrnoException) => {
  if (err.code === "EPIPE") process.exit(0);
});

if (import.meta.main) {
  const code = await main(process.argv.slice(2));
  process.exitCode = code;
}
