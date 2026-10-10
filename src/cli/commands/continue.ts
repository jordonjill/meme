import { existsSync, readFileSync } from "node:fs";
import { ADAPTERS, launchable } from "../../adapters";
import { buildHandoff } from "../../handoff/build";
import { saveHandoff } from "../../handoff/file";
import { displayPath } from "../../platform/paths";
import { editorCommand, runAttached } from "../../platform/spawn";
import { agentName, label } from "../../render/labels";
import { listing, lsText, type ListFilter } from "../../render/ls";
import { allSessions, getSession, resolveSession, sessionRecords, type SessionRow } from "../../store/queries";
import { chooseHandover } from "../../tui/handover";
import { CommandError, parse, UsageError } from "../args";
import { createContext, output, write, type Context } from "../context";
import { parseAgent } from "./ls";

export const continueHelp = `Usage: meme continue [<session>] [-a] [--in claude] [--edit] [--fresh] [--plain]

Continue a session in a new agent session.

In a terminal:
  meme continue             pick a session from the list, then the agent to
                            continue in; meme starts that agent in the session's
                            project, and its first message points at a handoff file
  meme continue <session>   the same for this session
  --in claude               continue in Claude Code without asking
  --edit                    open the handoff in $EDITOR before the agent starts

Inside an agent, through a pipe, or with --plain:
  meme continue             list the recent sessions of this project
  meme continue <session>   print the handoff; nothing is written

  -a, --all                 list the sessions of all projects, not only this one
  --fresh                   only the user's messages: start over from the
                            repository, not from the previous agent's approach

The handoff is copied verbatim from the session; nothing is summarized. Handoff
files are temporary: they are deleted after 7 days.
`;

const RECENT = 5;

/**
 * The session to hand over. A continued session is handed over as the newest
 * session of its chain, which holds all of it.
 */
function resolveHead(db: Context["store"]["db"], ref: string): SessionRow {
  const picked = resolveSession(db, ref);
  const seen = new Set([picked.id]);
  let cur = picked;
  while (cur.continued_in && !seen.has(cur.continued_in)) {
    const next = getSession(db, cur.continued_in);
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
    edit: { type: "boolean" },
    fresh: { type: "boolean" },
    plain: { type: "boolean" },
    help: { type: "boolean", short: "h" },
  });
  if (values.help) {
    write(continueHelp);
    return 0;
  }
  if (positionals.length > 1) throw new UsageError(`continue takes one session, got ${positionals.join(" ")}`);
  const target = values.in === undefined ? undefined : parseAgent(values.in);
  if (target && !ADAPTERS.some((a) => a.agent === target)) throw new UsageError(`--in ${values.in} is not supported yet; use --in claude`);

  // Two modes (plan §3.4): a person at a terminal gets an agent started for them;
  // an agent (or a pipe) gets the handoff as text and nothing is written.
  const out = output(Boolean(values.plain));
  const terminal = !values.plain && (out.interactive || process.env.MEME_TERMINAL === "1");
  if (!terminal && (values.in || values.edit)) {
    throw new UsageError("--in and --edit start an agent, which needs a terminal; here `meme continue <id>` prints the handoff instead");
  }

  const ctx = createContext();
  const db = ctx.store.db;
  const filter: ListFilter = { all: Boolean(values.all), project: ctx.project, exclude: ctx.current };
  const handoffOf = (s: SessionRow) =>
    buildHandoff({ session: s, records: sessionRecords(db, s.id), env: ctx.platform.env, now: ctx.now }, { fresh: Boolean(values.fresh) }).text;

  if (!terminal) {
    if (!positionals.length) {
      const l = listing(allSessions(db), filter);
      write(lsText({ ...l, rows: l.rows.slice(0, RECENT) }, {
        home: ctx.platform.home, now: ctx.now, st: out.st, width: out.width,
        footer: "Run `meme continue <id>` to print the handoff for one.",
      }));
      return 0;
    }
    write(handoffOf(resolveHead(db, positionals[0]!)));
    return 0;
  }

  const agents = launchable(ctx.platform).filter((a) => !target || a.adapter.agent === target);
  if (!agents.length) {
    const names = (target ? ADAPTERS.filter((a) => a.agent === target) : ADAPTERS).map((a) => `${agentName(a.agent)} (\`${a.launch("").cmd}\`)`);
    throw new CommandError(`no agent to continue in: ${names.join(", ")} not found on PATH`);
  }
  let session = positionals.length ? resolveHead(db, positionals[0]!) : null;
  let agent = target ? agents[0]! : null;
  if (!session || !agent) {
    if (!process.stdin.isTTY || !process.stdout.isTTY) throw new UsageError("choosing needs a terminal; name the session and add --in claude");
    const chosen = await chooseHandover(ctx, out, filter, session, agents, agent);
    if (!chosen) return 0;
    ({ session, agent } = chosen);
  }

  const dir = session.project;
  if (!dir || !existsSync(dir)) throw new CommandError(`the session's project directory ${dir ?? "(unknown)"} is not there`);
  const file = saveHandoff(ctx.platform.dataDir, session.id, handoffOf(session), ctx.now);
  if (!file) throw new CommandError("cannot write a handoff file here (read-only mode); run `meme continue <id> --plain` and paste its output instead");
  if (values.edit) {
    const code = await runAttached([...editorCommand(ctx.platform.env), file]);
    if (code !== 0) throw new CommandError(`the editor exited with code ${code}; nothing was handed over`);
    if (!readFileSync(file, "utf8").trim()) throw new CommandError("the handoff file is empty; nothing was handed over");
  }

  const id8 = session.id.slice(0, 8);
  const message =
    `This session was handed over from ${agentName(session.agent)} (session ${id8}, ${label(session.agent, session.env)}). ` +
    `Read ${file} first. Then tell me in two or three sentences what was being done, where it stopped and what you would do next, and wait for my go-ahead.`;
  const { args } = agent.adapter.launch(message);
  const home = ctx.platform.home;
  write(`Continuing ${id8} (${session.title ?? "untitled"}) in ${agentName(agent.adapter.agent)}, in ${displayPath(dir, home)}\nHandoff: ${displayPath(file, home)}\n`);
  ctx.store.db.close();
  return await runAttached([agent.exe, ...args], dir);
}
