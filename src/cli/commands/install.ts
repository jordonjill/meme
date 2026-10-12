import { existsSync } from "node:fs";
import path from "node:path";
import pkg from "../../../package.json";
import { ADAPTERS } from "../../adapters";
import { PROFILES } from "../../adapters/profiles";
import { currentPlatform, displayPath, type Platform } from "../../platform/paths";
import { findCommand } from "../../platform/spawn";
import { agentName, label } from "../../render/labels";
import { padEnd, plural } from "../../render/text";
import { counts, sources } from "../../store/queries";
import { parse, UsageError } from "../args";
import { createContext, write } from "../context";
import { HOW_TO_CONTINUE } from "../usage";

export const installHelp = `Usage: meme install [--dry-run]

Set meme up on this machine: find the agents and their sessions, and mirror
all sessions once. Safe to run again. It changes nothing outside ~/.meme: no
skills, no ${PROFILES.map((p) => p.instructionFile).join(" or ")}, no settings, no hooks.

  --dry-run   show what would happen, change nothing
`;

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
  if (dry) {
    for (const adapter of ADAPTERS) {
      for (const root of adapter.roots(platform)) {
        let n: string;
        try {
          n = plural(adapter.listFiles(root).length, "session file");
        } catch {
          n = "not readable";
        }
        table.push([label(root.agent, root.env), displayPath(root.path, home), n]);
      }
    }
    summary = `would mirror them into ${displayPath(path.join(platform.dataDir, "meme.sqlite"), home)}`;
  } else {
    const ctx = await createContext();
    for (const s of sources(ctx.store.db)) {
      table.push([label(s.agent, s.env), displayPath(s.root, home), s.reachable ? plural(s.sessions, "session") : "not readable"]);
    }
    const c = counts(ctx.store.db);
    summary = `mirrored ${plural(c.sessions, "session")} into ${ctx.store.memory ? "memory (nothing here can be written)" : displayPath(ctx.store.file, home)}`;
  }
  const lw = Math.max(0, ...table.map((r) => r[0].length));
  const w = Math.max(0, ...table.map((r) => r[1].length));
  for (const [lab, dir, n] of table) lines.push(`  ${padEnd(lab, lw)}  ${padEnd(dir, w)}  ${n}`);
  lines.push(`  ${summary}`);

  if (!findCommand("meme", platform.vars)) {
    lines.push("", `Note: \`meme\` is not on your PATH yet; add the folder that holds it, so \`! meme continue\` works inside ${PROFILES.map((p) => p.name).join(" and ")}.`);
  }
  lines.push("", HOW_TO_CONTINUE);
  write(lines.join("\n") + "\n");
  return 0;
}
