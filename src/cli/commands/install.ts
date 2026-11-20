import { existsSync, statSync } from "node:fs";
import path from "node:path";
import pkg from "../../../package.json";
import { ADAPTERS, installedAt, sourceTrouble } from "../../adapters";
import { PROFILES } from "../../adapters/profiles";
import type { SourceRoot } from "../../adapters/types";
import { layout } from "../../platform/layout";
import { currentPlatform, displayPath, type Platform } from "../../platform/paths";
import { findCommand } from "../../platform/spawn";
import { readsWsl, runningDistros, wslHomes } from "../../platform/wsl";
import { agentName, label } from "../../render/labels";
import { padEnd, plural, size } from "../../render/text";
import { counts, sources } from "../../store/queries";
import { parse, UsageError } from "../args";
import { agreed, createContext, insideAgent, write } from "../context";
import { hintLines, installThere, otherSides, question, todoFor, type OtherSide } from "../other-side";
import { HOW_TO_CONTINUE } from "../usage";

export const installHelp = `Usage: meme install [--dry-run]

Set meme up on this machine: find the agents and their sessions, and mirror
all sessions once. Safe to run again. It changes nothing outside ~/.meme: no
skills, no ${[...new Set(PROFILES.map((p) => p.instructionFile))].join(" or ")}, no settings, no hooks.

meme runs where it is installed. With WSL and Windows both in use, it looks
whether the other side has agents and no meme, or another version of it, and
in a terminal offers to install this version there too, with that side's own
installer. It asks first; elsewhere it only shows the line to run there.

  --dry-run   show what would happen, change nothing
`;

/** "a, b and c". */
const inWords = (words: string[]) => (words.length <= 1 ? (words[0] ?? "") : `${words.slice(0, -1).join(", ")} and ${words.at(-1)}`);

/** Is the agent on this machine (its home folder, or its command on PATH)? */
export function agentPresent(platform: Platform, home: string, command: string): boolean {
  return existsSync(home) || findCommand(command, platform.vars) !== null;
}

export async function install(argv: string[]): Promise<number> {
  const { values, positionals } = parse(argv, { "dry-run": { type: "boolean" }, help: { type: "boolean", short: "h" } });
  if (values.help) {
    write(installHelp);
    return 0;
  }
  if (positionals.length) throw new UsageError(`install takes no arguments, got ${positionals[0]}`);
  const dry = Boolean(values["dry-run"]);
  const platform = currentPlatform();
  const home = platform.home;
  const lines = [`meme ${pkg.version}${dry ? " (dry run: nothing is changed)" : ""}`, "", "Agents"];

  for (const adapter of ADAPTERS) {
    const command = adapter.launch("").cmd;
    const exe = findCommand(command, platform.vars);
    const state = exe ? `found: ${displayPath(exe, home)}` : agentPresent(platform, adapter.home(platform), command) ? `sessions found, but \`${command}\` is not on PATH` : "not found";
    lines.push(`  ${padEnd(agentName(adapter.agent), 12)} ${state}`);
  }

  lines.push("", "Sessions");
  const table: [string, string, string][] = [];
  let summary: string;
  // The other side of WSL and Windows: what to say about it, and what to ask once the rest is shown.
  let otherSide: string[] = [];
  let toAsk: OtherSide[] = [];
  if (dry) {
    // The sources a real run reads: on Windows also those in running WSL distributions, none started (plan §6 ⑪, F6).
    if (readsWsl(platform)) {
      const { running } = await runningDistros(platform);
      if (running.length) platform.wsl = wslHomes(platform, running);
    }
    const found: [root: SourceRoot, n: string][] = [];
    for (const adapter of ADAPTERS) {
      for (const root of adapter.roots(platform)) {
        let n: string;
        try {
          // A database on the other side is read from a copy in ~/.meme, which a dry run does not make.
          n = root.copy ? `database found (${size(statSync(root.path).size)})` : plural(adapter.listFiles(root).length, "session file");
        } catch {
          n = installedAt(root) ? "no sessions yet" : "not installed";
        }
        found.push([root, n]);
      }
    }
    // In the order install and status list them (plan §6 ⑪, F19).
    const cmp = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);
    found.sort(([a], [b]) => cmp(a.agent, b.agent) || cmp(a.env, b.env) || cmp(a.path, b.path));
    for (const [root, n] of found) table.push([label(root.agent, root.env), displayPath(root.path, home), n]);
    summary = `would mirror them into ${displayPath(layout(platform.dataDir).mirror, home)}`;
  } else {
    const ctx = await createContext();
    for (const s of sources(ctx.store.db)) {
      const state = s.reachable ? plural(s.sessions, "session") : sourceTrouble(s);
      table.push([label(s.agent, s.env), displayPath(s.root, home), state]);
    }
    const c = counts(ctx.store.db);
    summary = `mirrored ${plural(c.sessions, "session")} into ${ctx.store.memory ? "memory (nothing here can be written)" : displayPath(ctx.store.file, home)}`;
    const sides = otherSides(ctx.platform).filter((s) => todoFor(s, pkg.version));
    // A question needs a person at a terminal; a pipe or an agent gets the line to run by hand.
    if (process.stdin.isTTY && process.stdout.isTTY && !insideAgent(platform.vars)) toAsk = sides;
    else otherSide = sides.flatMap((s) => hintLines(s, pkg.version));
  }
  const lw = Math.max(0, ...table.map((r) => r[0].length));
  const w = Math.max(0, ...table.map((r) => r[1].length));
  for (const [lab, dir, n] of table) lines.push(`  ${padEnd(lab, lw)}  ${padEnd(dir, w)}  ${n}`);
  lines.push(`  ${summary}`);
  if (otherSide.length) lines.push("", ...otherSide);

  if (!findCommand("meme", platform.vars)) {
    lines.push("", `Note: \`meme\` is not on your PATH yet; add the folder that holds it, so \`! meme continue\` works inside ${inWords(PROFILES.map((p) => p.name))}.`);
  }
  lines.push("", HOW_TO_CONTINUE);
  lines.push("", "To give your agents meme's memory, connect them once: `meme mcp --help` shows how.");
  write(lines.join("\n") + "\n");

  for (const side of toAsk) {
    write("\n");
    if (!agreed(question(side, pkg.version)!)) {
      write(`Not installed ${side.where}. To do it yourself, run there:\n  ${side.hint}\n`);
      continue;
    }
    const code = installThere(side, pkg.version);
    write(code === 0 ? `meme ${pkg.version} is installed ${side.where}.\n` : `The installer ${side.where} did not finish${code === null ? "" : ` (exit ${code})`}. To do it yourself, run there:\n  ${side.hint}\n`);
  }
  return 0;
}
