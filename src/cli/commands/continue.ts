import { existsSync } from "node:fs";
import { ADAPTERS, launchable } from "../../adapters";
import { buildHandoff } from "../../handoff/build";
import { displayPath } from "../../platform/paths";
import { runAttached } from "../../platform/spawn";
import { agentName } from "../../render/labels";
import { listing, numberedText, type ListFilter, type Listing } from "../../render/ls";
import { allSessions, getSession, sessionRecords, type SessionRow } from "../../store/queries";
import { chooseHandover } from "../../tui/handover";
import { CommandError, parse, UsageError } from "../args";
import { createContext, output, write, type Context } from "../context";
import { isListNumber, resolveTarget } from "../target";
import { HOW_TO_CONTINUE } from "../usage";
import { parseAgent } from "./ls";

export const continueHelp = `Usage: meme continue [<target>] [-a] [--in claude] [--fresh] [--plain]

Continue a session in a new agent session. The handoff is worked out from the
session each time and printed; nothing is written, and nothing is summarized.

${HOW_TO_CONTINUE}

A target is a number from the list (counted again each time, the same way), or
words that narrow it down: last, claude, codex, win, wsl, the start of a session
id, or a word from the title. One match is handed over; several are listed.

  -a, --all      list the sessions of all projects, not only this one
  --in claude    at a terminal, continue in Claude Code without asking
  --fresh        only the user's messages: start over from the repository,
                 not from the previous agent's approach
  --plain        print instead of starting an agent, even in a terminal
`;

/** How many sessions the numbered list shows. */
const RECENT = 5;
const RECENT_ALL = 10;
const MATCHES = 20;

/** The last line of a list printed into an agent session (plan §3.4): the agent must not pick. */
function forTheUser(how: string): string {
  return `This list is for the user. Ask which one to continue and wait; do not pick one yourself. The user can also type: ! ${how}`;
}

/** The newest session of a continuation chain holds all of it, so that is the one handed over. */
function chainHead(ctx: Context, picked: SessionRow): SessionRow {
  const seen = new Set([picked.id]);
  let cur = picked;
  while (cur.continued_in && !seen.has(cur.continued_in)) {
    const next = getSession(ctx.store.db, cur.continued_in);
    if (!next) break;
    seen.add(next.id);
    cur = next;
  }
  if (cur.id !== picked.id) {
    process.stderr.write(`meme: ${picked.id.slice(0, 8)} was continued in ${cur.id.slice(0, 8)}; handing over ${cur.id.slice(0, 8)}, which includes it\n`);
  }
  return cur;
}

export async function continueSession(argv: string[]): Promise<number> {
  const { values, positionals } = parse(argv, {
    in: { type: "string" },
    all: { type: "boolean", short: "a" },
    fresh: { type: "boolean" },
    plain: { type: "boolean" },
    help: { type: "boolean", short: "h" },
  });
  if (values.help) {
    write(continueHelp);
    return 0;
  }
  const target = values.in === undefined ? undefined : parseAgent(values.in);
  if (target && !ADAPTERS.some((a) => a.agent === target)) throw new UsageError(`--in ${values.in} is not supported yet; use --in claude`);

  // Two modes (plan §3.4): a person at a terminal gets an agent started for them;
  // an agent (or a pipe) gets text. Nothing is ever written.
  const out = output(Boolean(values.plain));
  const terminal = !values.plain && (out.interactive || process.env.MEME_TERMINAL === "1");
  if (!terminal && values.in) {
    throw new UsageError("--in starts an agent, which needs a terminal; here `meme continue <target>` prints the handoff instead");
  }

  const ctx = createContext();
  const db = ctx.store.db;
  const rows = allSessions(db);
  const filter: ListFilter = { all: Boolean(values.all), project: ctx.project, exclude: ctx.current };
  // The numbered list, counted the same way every time: a number means the same session as long as nothing new came in.
  const recent = (): Listing => {
    const l = listing(rows, filter);
    return { ...l, rows: l.rows.slice(0, l.filter.all ? RECENT_ALL : RECENT) };
  };

  // What the target points at: one session, several to choose from, or nothing.
  let picked: SessionRow | null = null;
  let choices: Listing | null = null;
  let problem: string | null = null;
  if (positionals.length === 1 && isListNumber(positionals[0]!)) {
    const n = Number(positionals[0]);
    picked = recent().rows[n - 1] ?? null;
    if (!picked) problem = `there is no number ${n} in the list`;
  } else if (positionals.length) {
    const r = resolveTarget(positionals, rows, filter);
    if (r.kind === "one") picked = r.session;
    else if (r.kind === "many") choices = { ...r.listing, rows: r.listing.rows.slice(0, MATCHES) };
    else problem = r.message;
  }
  if (picked) picked = chainHead(ctx, picked);

  if (!terminal) {
    if (picked) {
      const handoff = buildHandoff({ session: picked, records: sessionRecords(db, picked.id), env: ctx.platform.env, now: ctx.now }, { fresh: Boolean(values.fresh) });
      write(handoff.text);
      return 0;
    }
    if (problem) write(`meme: ${problem}. Pick from the list instead:\n`);
    const all = values.all ? " -a" : "";
    if (choices) {
      // Numbers would be counted against the plain list next time, so matches are named by id.
      write(numberedText(choices, {
        home: ctx.platform.home, now: ctx.now, st: out.st, width: out.width, numbered: false, allHint: "meme continue -a",
        heading: `Sessions matching "${positionals.join(" ")}" (newest first):`,
        footer: forTheUser("meme continue <id>"),
      }));
    } else {
      write(numberedText(recent(), {
        home: ctx.platform.home, now: ctx.now, st: out.st, width: out.width, numbered: true, allHint: "meme continue -a",
        footer: forTheUser(`meme continue${all} <number>`),
      }));
    }
    return 0;
  }

  // At a terminal: choose what is missing, then start the agent and let it fetch the handoff.
  if (problem) throw new CommandError(problem);
  const agents = launchable(ctx.platform).filter((a) => !target || a.adapter.agent === target);
  if (!agents.length) {
    const names = (target ? ADAPTERS.filter((a) => a.agent === target) : ADAPTERS).map((a) => `${agentName(a.agent)} (\`${a.launch("").cmd}\`)`);
    throw new CommandError(`no agent to continue in: ${names.join(", ")} not found on PATH`);
  }
  let agent = target ? agents[0]! : null;
  let session = picked;
  if (!session || !agent) {
    if (!process.stdin.isTTY || !process.stdout.isTTY) throw new UsageError("choosing needs a terminal; name the session and add --in claude");
    const pickFrom = choices ? { ...filter, all: true, only: new Set(choices.rows.map((r) => r.id)) } : filter;
    const chosen = await chooseHandover(ctx, out, pickFrom, session, agents, agent);
    if (!chosen) return 0;
    ({ session, agent } = chosen);
  }

  const dir = session.project;
  if (!dir || !existsSync(dir)) throw new CommandError(`the session's project directory ${dir ?? "(unknown)"} is not there`);
  const id8 = session.id.slice(0, 8);
  const command = `meme continue ${id8}${values.fresh ? " --fresh" : ""}`;
  const message = `Continue an earlier session: run \`${command}\` and follow the instructions at the top of its output.`;
  const { args } = agent.adapter.launch(message);
  write(`Continuing ${id8} (${session.title ?? "untitled"}) in ${agentName(agent.adapter.agent)}, in ${displayPath(dir, ctx.platform.home)}\n`);
  ctx.store.db.close();
  return await runAttached([agent.exe, ...args], dir);
}
