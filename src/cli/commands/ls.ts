import { agentNamed, agentWords } from "../../adapters/profiles";
import type { Agent } from "../../adapters/types";
import { ENV_WORDS, type Env } from "../../platform/env";
import { listing, lsText, type ListFilter } from "../../render/ls";
import { allSessions } from "../../store/queries";
import { runPicker } from "../../tui/picker";
import { parse, UsageError } from "../args";
import { createContext, output, stoppedNotice, write } from "../context";

export const lsHelp = `Usage: meme ls [-a] [--agent ${agentWords("|")}] [--env wsl|win|mac|linux] [--plain]

List the sessions of the current project, newest first; all projects when the
current one has none. A continued session shows up once, as its newest part.
Run from inside an agent, the agent's own session is left out.

  -a, --all        all projects
  --agent <name>   only ${agentWords()} sessions
  --env <name>     only sessions from wsl, win (windows), mac (macos) or linux
  --plain          plain text, even in a terminal

In a terminal: ↑↓ select, Enter open, Space preview, type to search titles,
projects, branches and ids, ←→ filter by platform or agent, Tab switch between
those two rows, Ctrl+A all projects, Esc quit.
`;

export function parseAgent(v: string | undefined): Agent | undefined {
  if (v === undefined) return undefined;
  const agent = agentNamed(v);
  if (agent) return agent;
  throw new UsageError(`unknown agent: ${v} (use ${agentWords()})`);
}

export function parseEnv(v: string | undefined): Env | undefined {
  if (v === undefined) return undefined;
  const e = ENV_WORDS[v.toLowerCase()];
  if (e) return e;
  throw new UsageError(`unknown env: ${v} (use wsl, win or windows, mac or macos, linux)`);
}

export async function ls(argv: string[]): Promise<number> {
  const { values, positionals } = parse(argv, {
    all: { type: "boolean", short: "a" },
    agent: { type: "string" },
    env: { type: "string" },
    plain: { type: "boolean" },
    help: { type: "boolean", short: "h" },
  });
  if (values.help) {
    write(lsHelp);
    return 0;
  }
  if (positionals.length) throw new UsageError(`ls takes no arguments, got ${positionals[0]}`);
  const filter: ListFilter = { all: Boolean(values.all), agent: parseAgent(values.agent), env: parseEnv(values.env), project: "" };
  const ctx = await createContext();
  filter.project = ctx.project;
  filter.exclude = ctx.current;
  const out = output(Boolean(values.plain));
  if (out.interactive) return runPicker(ctx, out, filter);
  const stopped = stoppedNotice(ctx.wslStopped, ctx.now, ctx.wslSilent);
  if (stopped) write(stopped + "\n");
  write(lsText(listing(allSessions(ctx.store.db), filter), { home: ctx.platform.home, now: ctx.now, st: out.st, width: out.width }));
  return 0;
}
