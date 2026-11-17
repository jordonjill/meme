import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import pkg from "../../../package.json";
import { agentNamed, PROFILES } from "../../adapters/profiles";
import { removeDir } from "../../platform/fs";
import { currentPlatform, displayPath } from "../../platform/paths";
import { findCommand } from "../../platform/spawn";
import { isReadOnlyError } from "../../store/db";
import { CommandError, parse, UsageError } from "../args";
import { write } from "../context";

const withPlugin = PROFILES.filter((p) => p.plugin);

export const pluginHelp = `Usage: meme plugin [<agent>]

Writes meme's plugin for an agent into ~/.meme/plugins and shows the agent's
own commands that install it. With the plugin the agent is given what meme
remembers when a session starts, without having to ask, and has the tools of
\`meme mcp\`. meme changes none of the agents' files itself: you run the
commands.

Agents with a plugin: ${withPlugin.map((p) => p.name).join(", ")}. Others connect with \`meme mcp\`
(see \`meme mcp --help\`).

The plugin holds no memory, only how to call meme; it need not be installed
again when memory changes.
`;

/** Where an agent's plugin is written; uninstall removes the folder that holds them. */
export function pluginDir(dataDir: string, agent: string): string {
  return path.join(dataDir, "plugins", agent);
}

export async function plugin(argv: string[]): Promise<number> {
  const { values, positionals } = parse(argv, { help: { type: "boolean", short: "h" } });
  if (values.help) {
    write(pluginHelp);
    return 0;
  }
  if (positionals.length > 1) throw new UsageError(`too many arguments: ${positionals.slice(1).join(" ")}`);
  let chosen = withPlugin;
  if (positionals[0]) {
    const agent = agentNamed(positionals[0]);
    chosen = withPlugin.filter((p) => p.agent === agent);
    if (!chosen.length) throw new UsageError(`there is no plugin for ${positionals[0]}; there is one for ${withPlugin.map((p) => p.aliases[0]).join(", ")}. Other agents connect with \`meme mcp\``);
  }
  const platform = currentPlatform();
  const home = platform.home;
  // The command the agent will run: `meme` when that is found on PATH, else this very program.
  const meme = findCommand("meme", platform.vars) || /^bun(\.exe)?$/i.test(path.basename(process.execPath)) ? "meme" : process.execPath;
  const lines: string[] = [];
  for (const p of chosen) {
    const made = p.plugin!(meme, pkg.version);
    const dir = pluginDir(platform.dataDir, p.agent);
    try {
      // Written afresh: a file an older meme put there and this one does not is not left behind.
      removeDir(dir);
      for (const [name, text] of Object.entries(made.files)) {
        const file = path.join(dir, name);
        mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
        writeFileSync(file, text, { mode: 0o600 });
      }
    } catch (err) {
      if (isReadOnlyError(err)) throw new CommandError(`meme cannot write here (${displayPath(platform.dataDir, home)} cannot be written); no plugin was made`);
      throw err;
    }
    if (lines.length) lines.push("");
    lines.push(`${p.name}: the plugin is in ${displayPath(dir, home)}. To install it, run:`, ...made.install(dir).map((c) => `  ${c}`), "To take it out again:", ...made.remove.map((c) => `  ${c}`));
  }
  if (meme === "meme" && !findCommand("meme", platform.vars)) lines.push("", "Note: `meme` is not on your PATH yet; the agent will not find it until it is.");
  write(lines.join("\n") + "\n");
  return 0;
}
