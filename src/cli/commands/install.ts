import { existsSync, statSync } from "node:fs";
import path from "node:path";
import pkg from "../../../package.json";
import { ADAPTERS, installedAt, sourceTrouble } from "../../adapters";
import { PROFILES } from "../../adapters/profiles";
import type { SourceRoot } from "../../adapters/types";
import { currentPlatform, displayPath, type Platform } from "../../platform/paths";
import { findCommand } from "../../platform/spawn";
import { findInWsl, readsWsl, runningDistros, wslHomes } from "../../platform/wsl";
import { agentName, label } from "../../render/labels";
import { padEnd, plural, size } from "../../render/text";
import { counts, sources } from "../../store/queries";
import { parse, UsageError } from "../args";
import { createContext, write, type Context } from "../context";
import { HOW_TO_CONTINUE, INSTALL_HINT } from "../usage";

export const installHelp = `Usage: meme install [--dry-run]

Set meme up on this machine: find the agents and their sessions, and mirror
all sessions once. Safe to run again. It changes nothing outside ~/.meme: no
skills, no ${[...new Set(PROFILES.map((p) => p.instructionFile))].join(" or ")}, no settings, no hooks.

  --dry-run   show what would happen, change nothing
`;

/** "a, b and c". */
const inWords = (words: string[]) => (words.length <= 1 ? (words[0] ?? "") : `${words.slice(0, -1).join(", ")} and ${words.at(-1)}`);

/** Is the agent on this machine (its home folder, or its command on PATH)? */
export function agentPresent(platform: Platform, home: string, command: string): boolean {
  return existsSync(home) || findCommand(command, platform.vars) !== null;
}

/**
 * Agents on the other side of WSL and Windows where meme is not installed, so
 * `! meme continue` would not work in them (plan §6 ⑫, item 8). From Windows only
 * running distributions are asked, through the user's shell there; none is started.
 * From WSL, an agent's folder in a Windows user folder, and no `.meme` beside it.
 */
function elsewhere(ctx: Context): string[] {
  const p = ctx.platform;
  const out: string[] = [];
  if (p.env === "win") {
    for (const distro of [...new Set(p.wsl.map((h) => h.distro))]) {
      const place = p.wsl.find((h) => h.distro === distro)!;
      const tools = findInWsl(p, place, place.home, ["meme", ...PROFILES.map((x) => x.command)]);
      if (!tools.ok || tools.found.meme) continue;
      const agents = PROFILES.filter((x) => tools.found[x.command]).map((x) => x.name);
      if (agents.length) out.push(`Agents also in WSL (${distro}): ${agents.join(", ")}. To use \`! meme continue\` in them, install meme there too:`, `  ${INSTALL_HINT.linux}`);
    }
  } else if (p.env === "wsl" && p.windowsUsersDir) {
    const users = p.windowsUsersDir;
    const roots = ADAPTERS.flatMap((a) => a.roots(p)).filter((r) => r.env === "win" && installedAt(r));
    const userOf = (dir: string) => path.relative(users, dir).split(/[\\/]/)[0]!;
    const without = roots.filter((r) => !existsSync(path.join(users, userOf(r.path), ".meme")));
    const agents = PROFILES.filter((x) => without.some((r) => r.agent === x.agent)).map((x) => x.name);
    if (agents.length) out.push(`Agents also on Windows: ${agents.join(", ")}. To use \`! meme continue\` in them, install meme on Windows too:`, `  ${INSTALL_HINT.windows}`);
  }
  return out;
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
  let otherSide: string[] = [];
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
    summary = `would mirror them into ${displayPath(path.join(platform.dataDir, "meme.sqlite"), home)}`;
  } else {
    const ctx = await createContext();
    for (const s of sources(ctx.store.db)) {
      const state = s.reachable ? plural(s.sessions, "session") : sourceTrouble(s);
      table.push([label(s.agent, s.env), displayPath(s.root, home), state]);
    }
    const c = counts(ctx.store.db);
    summary = `mirrored ${plural(c.sessions, "session")} into ${ctx.store.memory ? "memory (nothing here can be written)" : displayPath(ctx.store.file, home)}`;
    otherSide = elsewhere(ctx);
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
  write(lines.join("\n") + "\n");
  return 0;
}
