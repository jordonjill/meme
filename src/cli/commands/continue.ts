import { existsSync } from "node:fs";
import { ADAPTERS, launchable } from "../../adapters";
import { agentWords, profileOf, runningAgent } from "../../adapters/profiles";
import type { Adapter } from "../../adapters/types";
import { limitsIn } from "../../handoff/budget";
import { buildHandoff } from "../../handoff/build";
import { displayPath } from "../../platform/paths";
import { runAttached } from "../../platform/spawn";
import { findInWsl, wslCommand, wslExe, wslPlace, type WslPlace } from "../../platform/wsl";
import { agentName } from "../../render/labels";
import { listing, numberedText, type ListFilter, type Listing } from "../../render/ls";
import { allSessions, failureOf, getSession, handedOver, sessionFiles, sessionRecords, type SessionRow } from "../../store/queries";
import { chooseHandover, type AgentChoice, type Launchable } from "../../tui/handover";
import { CommandError, parse, UsageError } from "../args";
import { createContext, output, write, type Context } from "../context";
import { isListNumber, resolveTarget } from "../target";
import { HOW_TO_CONTINUE } from "../usage";
import { parseAgent } from "./ls";
import { unreadableMessage } from "./show";

export const continueHelp = `Usage: meme continue [<target>] [-a] [--in ${agentWords("|")}] [--fresh] [--plain]

Continue a session in a new agent session. The handoff is worked out from the
session each time and printed; nothing is written, and nothing is summarized.

${HOW_TO_CONTINUE}

A target is a number from the list (counted again each time, the same way), or
words that narrow it down: last, ${agentWords(", ")}, win, wsl, the start of a session
id, or a word from the title. One match is handed over; several are listed.

  -a, --all      list the sessions of all projects, not only this one
  --in <agent>   at a terminal, continue in ${agentWords()} without asking
  --fresh        only the user's messages: start over from the repository,
                 not from the previous agent's approach
  --plain        print instead of starting an agent, even in a terminal
`;

/** How many sessions the numbered list shows. */
const RECENT = 5;
const RECENT_ALL = 10;
const MATCHES = 20;

/**
 * The last line of a list printed into an agent session (plan §3.4): the agent
 * must not pick. Where `!` output reaches the model, the agent runs the user's
 * choice itself, so the handoff lands folded in its tool output; where it does
 * not, the user types the command.
 */
function forTheUser(how: string, vars: Record<string, string | undefined>): string {
  const yourself = runningAgent(vars)?.bangReachesModel ? ` When the user has chosen, run \`${how}\` yourself.` : "";
  return `This list is for the user. Ask which one to continue and wait; do not pick one yourself.${yourself} The user can also type: ! ${how}`;
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
    process.stderr.write(`meme: ${picked.short} was continued in ${cur.short}; handing over ${cur.short}, which includes it\n`);
  }
  return cur;
}

/** Windows reading a WSL session: the distribution its files are in (plan step 5). */
function wslOf(ctx: Context, s: SessionRow): WslPlace | null {
  if (ctx.platform.env !== "win" || s.env !== "wsl") return null;
  const file = sessionFiles(ctx.store.db, s.id)[0];
  return file ? wslPlace(ctx.platform, file) : null;
}

/**
 * A WSL session pushed from Windows continues in WSL: the agents and meme are
 * looked up there, as the user's shell finds them; the agent there fetches the
 * handoff with WSL's meme.
 */
function agentsInWsl(ctx: Context, s: SessionRow, place: WslPlace, wanted: readonly Adapter[]): AgentChoice {
  const dir = s.project;
  if (!dir) return { problem: `the session's project directory is unknown` };
  const there = `open WSL with \`wsl -d ${place.distro} --cd ${dir}\` and run \`meme continue ${s.short}\``;
  const r = findInWsl(ctx.platform, place, dir, ["meme", ...wanted.map((a) => a.launch("").cmd)]);
  if (!r.ok) return { problem: `could not start anything in WSL (${place.distro}): ${r.error}. To continue there yourself, ${there}` };
  if (!r.found.meme) return { problem: `meme is not installed in WSL (${place.distro}), and the agent there needs it to fetch the handoff. Install it there, then ${there}` };
  const agents: Launchable[] = wanted.filter((a) => r.found[a.launch("").cmd]).map((a) => ({ adapter: a, exe: r.found[a.launch("").cmd]!, wsl: place }));
  if (!agents.length) return { problem: `no agent to continue in, in WSL (${place.distro}): ${wanted.map((a) => `\`${a.launch("").cmd}\``).join(", ")} not found there` };
  return { agents };
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
  if (target && !ADAPTERS.some((a) => a.agent === target)) throw new UsageError(`--in ${values.in} is not supported`);

  // Two modes (plan §3.4): a person at a terminal gets an agent started for them;
  // an agent (or a pipe) gets text. Nothing is ever written.
  const out = output(Boolean(values.plain));
  const terminal = !values.plain && (out.interactive || process.env.MEME_TERMINAL === "1");
  if (!terminal && values.in) {
    throw new UsageError("--in starts an agent, which needs a terminal; here `meme continue <target>` prints the handoff instead");
  }

  const ctx = await createContext();
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
  // Never read: there is no handoff to give (arch.md §6.1, point 2).
  if (picked?.unreadable && !picked.readable_until) throw new CommandError(unreadableMessage(picked.short, failureOf(db, picked.id)));

  if (!terminal) {
    if (picked) {
      // The agent running meme keeps only so much of a command's output (its profile).
      const limits = limitsIn(runningAgent(ctx.platform.vars));
      const handoff = buildHandoff(
        {
          session: picked,
          records: sessionRecords(db, picked.id),
          env: ctx.platform.env,
          wsl: wslOf(ctx, picked),
          now: ctx.now,
          lookup: (ref, before) => handedOver(db, ref, before),
          current: ctx.current,
        },
        { fresh: Boolean(values.fresh), limits },
      );
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
        footer: forTheUser("meme continue <id>", ctx.platform.vars),
      }));
    } else {
      write(numberedText(recent(), {
        home: ctx.platform.home, now: ctx.now, st: out.st, width: out.width, numbered: true, allHint: "meme continue -a",
        footer: forTheUser(`meme continue${all} <number>`, ctx.platform.vars),
      }));
    }
    return 0;
  }

  // At a terminal: choose what is missing, then start the agent and let it fetch the handoff.
  if (problem) throw new CommandError(problem);
  const wanted = ADAPTERS.filter((a) => !target || a.agent === target);
  const local = launchable(ctx.platform).filter((a) => !target || a.adapter.agent === target);
  const noAgent = `no agent to continue in: ${wanted.map((a) => `${agentName(a.agent)} (\`${a.launch("").cmd}\`)`).join(", ")} not found on PATH`;
  // A WSL session seen from Windows may still have agents in WSL.
  if (!local.length && !ctx.platform.wsl.length && !(picked && wslOf(ctx, picked))) throw new CommandError(noAgent);
  const agentsFor = (s: SessionRow): AgentChoice => {
    const place = wslOf(ctx, s);
    if (place) return agentsInWsl(ctx, s, place, wanted);
    return local.length ? { agents: local } : { problem: noAgent };
  };
  let session = picked;
  let agent: Launchable | null = null;
  if (session && target) {
    const c = agentsFor(session);
    if ("problem" in c) throw new CommandError(c.problem);
    agent = c.agents[0]!;
  } else {
    if (!process.stdin.isTTY || !process.stdout.isTTY) throw new UsageError(`choosing needs a terminal; name the session and add --in ${agentWords("|")}`);
    const pickFrom = choices ? { ...filter, all: true, only: new Set(choices.rows.map((r) => r.id)) } : filter;
    const chosen = await chooseHandover(ctx, out, pickFrom, session, agentsFor, Boolean(target));
    if (!chosen) return 0;
    if ("problem" in chosen) throw new CommandError(chosen.problem);
    ({ session, agent } = chosen);
    if (session.unreadable && !session.readable_until) throw new CommandError(unreadableMessage(session.short, failureOf(db, session.id)));
  }

  const dir = session.project;
  // In WSL the directory was checked when wsl.exe started there to look for the agent.
  if (!dir || (!agent.wsl && !existsSync(dir))) throw new CommandError(`the session's project directory ${dir ?? "(unknown)"} is not there`);
  const sid = session.short;
  const command = `meme continue ${sid}${values.fresh ? " --fresh" : ""}`;
  const message = profileOf(agent.adapter.agent).firstMessage(command);
  const { args } = agent.adapter.launch(message);
  const where = agent.wsl ? `${dir} (WSL: ${agent.wsl.distro})` : displayPath(dir, ctx.platform.home);
  write(`Continuing ${sid} (${session.title ?? "untitled"}) in ${agentName(agent.adapter.agent)}, in ${where}\n`);
  ctx.store.db.close();
  // wsl.exe starts in a Windows directory and changes to the project itself.
  if (agent.wsl) return await runAttached(wslCommand(wslExe(ctx.platform)!, agent.wsl.distro, dir, [agent.exe, ...args]), ctx.platform.home);
  return await runAttached([agent.exe, ...args], dir);
}
