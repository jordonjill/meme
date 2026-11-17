import pkg from "../../../package.json";
import { PROFILES } from "../../adapters/profiles";
import { INSTRUCTIONS, memoryTools } from "../../mcp/tools";
import { serve } from "../../mcp/server";
import { fileLogger } from "../../platform/log";
import { currentPlatform } from "../../platform/paths";
import { padEnd } from "../../render/text";
import { parse, UsageError } from "../args";
import { write } from "../context";

const connect = PROFILES.filter((p) => p.mcpConnect);
const width = Math.max("other agents".length, ...connect.map((p) => p.name.length));

export const mcpHelp = `Usage: meme mcp

Serves meme's memory to an agent over the Model Context Protocol, on standard
input and output. The agent starts it; you connect it once, with the agent's
own command. meme changes none of the agents' files itself.

${connect.map((p) => `  ${padEnd(p.name, width)}  ${p.mcpConnect}`).join("\n")}
  ${padEnd("other agents", width)}  add a local (stdio) server whose command is: meme mcp

The agent then has four tools: context (what memory holds for where it works),
recall (look something up), explain (where an entry comes from) and remember
(keep what you said). What you say is checked against your sessions: an agent
cannot put words in your mouth.
`;

export async function mcp(argv: string[]): Promise<number> {
  const { values, positionals } = parse(argv, { help: { type: "boolean", short: "h" } });
  // In a terminal nobody is speaking the protocol: say how it is used instead of waiting.
  if (values.help || process.stdin.isTTY) {
    write(mcpHelp);
    return 0;
  }
  if (positionals.length) throw new UsageError(`mcp takes no arguments, got ${positionals[0]}`);
  const platform = currentPlatform();
  const log = fileLogger(platform.dataDir);
  await serve(
    { name: "meme", version: pkg.version, instructions: INSTRUCTIONS, tools: memoryTools(platform) },
    Bun.stdin.stream(),
    (line) => process.stdout.write(line),
    (err) => {
      // Where meme cannot write there is no log; the agent still gets the error as the tool's answer.
      try {
        log.error("meme mcp", err);
      } catch {}
    },
  );
  return 0;
}
