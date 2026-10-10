import { existsSync } from "node:fs";
import path from "node:path";
import pkg from "../../../package.json";
import { ADAPTERS } from "../../adapters";
import { placeSkill, skillFile, skillState } from "../../install/skill";
import { currentPlatform, displayPath, type Platform } from "../../platform/paths";
import { findCommand } from "../../platform/spawn";
import { agentName, label } from "../../render/labels";
import { padEnd, plural } from "../../render/text";
import { counts, sources } from "../../store/queries";
import { parse, UsageError } from "../args";
import { createContext, write } from "../context";

export const installHelp = `Usage: meme install [--dry-run]

Set meme up on this machine: put the meme skill where the agents look for it,
and mirror all sessions once. Safe to run again; run it after upgrading meme.
It never changes CLAUDE.md, AGENTS.md, settings or hooks, and it skips a skill
folder named meme that meme did not create.

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
    const name = padEnd(agentName(adapter.agent), 12);
    const agentHome = adapter.home(platform);
    if (!agentPresent(platform, agentHome, adapter.launch("").cmd)) {
      lines.push(`  ${name} not found; no skill placed`);
      continue;
    }
    const dir = adapter.skillDir(platform);
    const file = displayPath(skillFile(dir), home);
    const state = skillState(dir);
    if (state === "foreign") {
      lines.push(`  ${name} skipped: ${displayPath(path.join(dir, "meme"), home)} exists and was not put there by meme`);
    } else if (state === "current") {
      lines.push(`  ${name} skill up to date: ${file}`);
    } else {
      if (!dry) placeSkill(dir);
      const verb = state === "missing" ? (dry ? "would add" : "added") : dry ? "would update" : "updated";
      lines.push(`  ${name} skill ${verb}: ${file}`);
    }
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
    const ctx = createContext();
    for (const s of sources(ctx.store.db)) {
      table.push([label(s.agent, s.env), displayPath(s.root, home), s.reachable ? plural(s.sessions, "session") : "not readable"]);
    }
    const c = counts(ctx.store.db);
    summary = `mirrored ${plural(c.sessions, "session")} into ${ctx.store.memory ? "memory (nothing here can be written)" : displayPath(ctx.store.file, home)}`;
  }
  const w = Math.max(0, ...table.map((r) => r[1].length));
  for (const [lab, dir, n] of table) lines.push(`  ${padEnd(lab, 8)} ${padEnd(dir, w)}  ${n}`);
  lines.push(`  ${summary}`);

  if (!findCommand("meme", platform.vars)) {
    lines.push("", `Note: \`meme\` is not on your PATH. The skill runs \`meme\`, so add the folder that holds it to PATH.`);
  }
  lines.push(
    "",
    "Try it",
    "  In an agent, just ask: \"continue the session from yesterday\" (in Claude Code, /meme works too)",
    "  meme continue           pick a session and continue it in an agent",
    "  meme ls                 sessions of this project",
    "  meme search <text>      search past sessions",
  );
  write(lines.join("\n") + "\n");
  return 0;
}
