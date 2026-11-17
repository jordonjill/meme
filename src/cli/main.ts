#!/usr/bin/env bun
import { existsSync } from "node:fs";
import path from "node:path";
import pkg from "../../package.json";
import { fileLogger } from "../platform/log";
import { currentPlatform } from "../platform/paths";
import { StoreUnreachable } from "../memory/place";
import { LookupError } from "../store/queries";
import { CommandError, UsageError } from "./args";
import { timings } from "./context";
import { context, contextHelp } from "./commands/context";
import { continueHelp, continueSession } from "./commands/continue";
import { forget, forgetHelp } from "./commands/forget";
import { install, installHelp } from "./commands/install";
import { ls, lsHelp } from "./commands/ls";
import { mcp, mcpHelp } from "./commands/mcp";
import { memory, memoryHelp } from "./commands/memory";
import { plugin, pluginHelp } from "./commands/plugin";
import { recall, recallHelp } from "./commands/recall";
import { remember, rememberHelp } from "./commands/remember";
import { report, reportHelp } from "./commands/report";
import { search, searchHelp } from "./commands/search";
import { show, showHelp } from "./commands/show";
import { status, statusHelp } from "./commands/status";
import { uninstall, uninstallHelp } from "./commands/uninstall";

const COMMANDS: Record<string, { run: (argv: string[]) => Promise<number>; help: string }> = {
  ls: { run: ls, help: lsHelp },
  show: { run: show, help: showHelp },
  search: { run: search, help: searchHelp },
  continue: { run: continueSession, help: continueHelp },
  forget: { run: forget, help: forgetHelp },
  remember: { run: remember, help: rememberHelp },
  memory: { run: memory, help: memoryHelp },
  context: { run: context, help: contextHelp },
  recall: { run: recall, help: recallHelp },
  mcp: { run: mcp, help: mcpHelp },
  plugin: { run: plugin, help: pluginHelp },
  status: { run: status, help: statusHelp },
  install: { run: install, help: installHelp },
  uninstall: { run: uninstall, help: uninstallHelp },
  report: { run: report, help: reportHelp },
};

const USAGE = `meme ${pkg.version}: your coding-agent sessions in one place, ready to continue in any agent.

Usage: meme <command> [options]

Commands:
  ls          list sessions (current project; -a for all)
  show        show a session, a turn per line
  search      search past sessions, like rg
  continue    hand a session over to a new agent session
  forget      permanently delete sessions, from the agent and from meme
  remember    keep a rule or a fact in memory, in your own words
  memory      what meme remembers: list it, trace an entry, forget one
  context     what memory holds for here, for an agent to read before it starts
  recall      find what meme remembers about something
  mcp         serve memory to an agent (MCP); --help shows how to connect one
  plugin      write meme's plugin for an agent and show how to install it
  status      version, data location, session sources
  install     mirror all sessions once and show how to use meme
  uninstall   remove meme's data
  report      a report to paste into an issue, with no conversation in it

Run \`meme <command> --help\` for a command's options.
`;

/** A run this slow leaves a line in `meme.log` with how long each part took (plan §6 ⑧.3); `MEME_SLOW_MS` sets it for tests. */
const SLOW_MS = 2000;

/**
 * In a terminal the user may take their time choosing (the list, a [y/N]): only
 * the part before the command itself counts there.
 */
function logIfSlow(argv: string[], begun: number): void {
  const platform = currentPlatform();
  const limit = Number(platform.vars.MEME_SLOW_MS || SLOW_MS);
  // A command that reads no sessions (uninstall, help) is not slow on meme's account; and once the
  // data folder is gone (uninstall), nothing may bring it back (plan §6 ⑨, R4).
  if (timings.ready === undefined || !existsSync(platform.dataDir)) return;
  const end = process.stdout.isTTY ? timings.ready : performance.now();
  if (end < limit) return;
  const ms = (n: number | undefined) => (n === undefined ? null : Math.round(n));
  const parts: [string, number | null][] = [
    ["start", ms(begun)],
    ["open", ms(timings.open)],
    ["import", ms(timings.import)],
    ["wsl.exe", ms(timings.wsl)],
    ["import WSL", ms(timings.importWsl)],
    ["command", timings.ready === undefined ? null : ms(end - timings.ready)],
  ];
  const shown = parts.filter(([, n]) => n !== null).map(([k, n]) => `${k} ${n}`);
  fileLogger(platform.dataDir).info(`slow: meme ${argv.join(" ")} took ${Math.round(end)}ms (${shown.join(", ")})`);
}

export async function main(argv: string[]): Promise<number> {
  // Milliseconds since the process started: what Windows and the runtime took before meme's own code.
  const begun = performance.now();
  try {
    return await run(argv);
  } finally {
    logIfSlow(argv, begun);
  }
}

async function run(argv: string[]): Promise<number> {
  const [command, ...rest] = argv;
  if (!command || command === "help" || command === "-h" || command === "--help") {
    const topic = command === "help" && rest[0] ? COMMANDS[rest[0]] : undefined;
    if (command === "help" && rest[0] && !topic) {
      process.stderr.write(`meme: unknown command: ${rest[0]}\n${USAGE}`);
      return 2;
    }
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
    if (err instanceof LookupError || err instanceof CommandError || err instanceof StoreUnreachable) {
      process.stderr.write(`meme: ${err.message}\n`);
      return 1;
    }
    // One short line for the user; the details go to the log (plan §3).
    const platform = currentPlatform();
    fileLogger(platform.dataDir).error(`meme ${argv.join(" ")}`, err);
    process.stderr.write(`meme: ${err instanceof Error ? err.message : String(err)} (details in ${path.join(platform.dataDir, "logs", "meme.log")})\n`);
    process.stderr.write("To report it, run `meme report` and paste what it prints into an issue.\n");
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
