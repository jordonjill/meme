import { existsSync } from "node:fs";
import path from "node:path";
import { adapterFor } from "../../adapters";
import { PROFILES, profileOf } from "../../adapters/profiles";
import type { ForgetPlan } from "../../adapters/types";
import { lastActive, mayBeRunning } from "../../model/turns";
import { removeDir, removeFile } from "../../platform/fs";
import { displayPath } from "../../platform/paths";
import { commandLine } from "../../platform/spawn";
import { coloredLabel } from "../../render/labels";
import { ago, padEnd } from "../../render/text";
import { ancestors, getSession, resolveSession, sessionFiles, type SessionRow } from "../../store/queries";
import { pickSession } from "../../tui/picker";
import { deleteFile, recomputeCopied } from "../../store/sync";
import { CommandError, parse, UsageError } from "../args";
import { agreed, createContext, insideAgent, output, write, type Context } from "../context";
import { openCheck } from "../open";

export const forgetHelp = `Usage: meme forget [<session>...] [--yes] [--chain]

Permanently delete sessions: from the agent that made them, then from meme's
mirror. Name each session by its id (any unique start of it), or, in a
terminal, leave the ids out and pick the session from the list. meme lists
everything it will delete and asks before deleting.

  --yes     do not ask; needed inside an agent, and only when the user has
            explicitly asked to delete these sessions
  --chain   also delete the earlier sessions a continued session came from

${PROFILES.map((p) => p.forgetHelp).join("\n")}
The session that runs meme cannot be deleted, nor one open in an agent. Where
meme cannot tell whether a session is open, it does not delete one active in
the last few minutes.
`;

interface Item {
  session: SessionRow;
  plan: ForgetPlan;
  files: string[];
}

/** The sessions a continued session came from, nearest first (the continued-in chain). */
function earlierParts(ctx: Context, id: string): SessionRow[] {
  const chain = ancestors(ctx.store.db, id);
  const out: SessionRow[] = [];
  for (let i = chain.length - 1; i >= 0 && chain[i]!.link === "continued"; i--) {
    const s = getSession(ctx.store.db, chain[i]!.id);
    if (s) out.push(s);
  }
  return out;
}

function forksOf(ctx: Context, id: string): SessionRow[] {
  return ctx.store.db
    .query<{ id: string }, [string]>("SELECT id FROM sessions WHERE forked_from = ? ORDER BY ended_at DESC")
    .all(id)
    .map((r) => getSession(ctx.store.db, r.id)!)
    .filter(Boolean);
}

export async function forget(argv: string[]): Promise<number> {
  const { values, positionals } = parse(argv, {
    yes: { type: "boolean" },
    chain: { type: "boolean" },
    help: { type: "boolean", short: "h" },
  });
  if (values.help) {
    write(forgetHelp);
    return 0;
  }
  const interactive = Boolean(process.stdin.isTTY && process.stdout.isTTY) && !insideAgent();
  if (!positionals.length && !interactive) throw new UsageError("name the sessions to delete by id; `meme ls` shows them");
  for (const ref of positionals) {
    // Only ids: deleting by a number or a word from the title is too easy to get wrong.
    if (!/^[0-9a-f][0-9a-f-]{3,}$/i.test(ref)) throw new UsageError(`forget takes session ids (at least 4 characters), not "${ref}"`);
  }

  const ctx = await createContext();
  if (ctx.store.readonly) throw new CommandError("nothing can be deleted here: meme is in read-only mode (inside a sandbox?)");
  const out = output(false);
  const st = out.st;
  const home = ctx.platform.home;

  // What was named, or picked from the list: never the session that runs meme, nor
  // one open in an agent, nor one meme cannot tell about that was written in the
  // last few minutes (plan §6 ⑧.3, ⑧.4); not even with --yes.
  const check = openCheck(ctx.platform);
  const open = check.open;
  const chosen: SessionRow[] = [];
  if (!positionals.length) {
    const picked = await pickSession(ctx, out, { all: false, project: ctx.project, exclude: ctx.current }, "Delete which session?", "choose", (r) => (open.has(r.id) ? "open now" : null));
    if (!picked) return 0;
    chosen.push(picked);
  }
  for (const ref of positionals) {
    const s = resolveSession(ctx.store.db, ref);
    if (ctx.current.has(s.id)) throw new CommandError(`${s.short} is the session that is running meme; it cannot delete itself`);
    if (!chosen.some((c) => c.id === s.id)) chosen.push(s);
  }
  /** Why a session must not be deleted now, if it must not. */
  const stillOpen = (s: SessionRow): string | null => {
    const o = open.get(s.id);
    if (o) return `${s.short} is open in ${profileOf(o.agent).name} (${o.where}, process ${o.pid}). Close it there first.`;
    if (mayBeRunning(lastActive(s.ended_at), ctx.now) && check.stateOf(s.id, sessionFiles(ctx.store.db, s.id)) === "unknown") {
      return `${s.short} was active ${ago(s.ended_at, ctx.now, true)} and may still be open in ${profileOf(s.agent).name}. Close it there first, or delete it in a few minutes.`;
    }
    return null;
  };
  const why = chosen.map(stillOpen).filter((w): w is string => w !== null);
  if (why.length) throw new CommandError(`${why.join(" ")} Nothing deleted.`);

  // A continued session: its earlier part stays in the older session unless that goes too.
  for (const s of [...chosen]) {
    const earlier = earlierParts(ctx, s.id).filter((e) => !chosen.some((c) => c.id === e.id));
    if (!earlier.length) continue;
    const names = earlier.map((e) => e.short).join(", ");
    write(`${s.short} was continued from ${names}. ${names} still ${earlier.length === 1 ? "holds" : "hold"} the first part of this conversation; if only ${s.short} is deleted, ${names} ${earlier.length === 1 ? "shows" : "show"} up in the list again.\n`);
    let include = Boolean(values.chain);
    if (!include && interactive) include = agreed(`Also delete ${names}?`);
    if (include) for (const e of earlier) if (!ctx.current.has(e.id) && !stillOpen(e)) chosen.push(e);
    write("\n");
  }

  const items: Item[] = chosen.map((session) => {
    const files = sessionFiles(ctx.store.db, session.id);
    const adapter = adapterFor(session.agent);
    let plan: ForgetPlan = adapter
      ? adapter.forgetPlan({ id: session.id, env: session.env, files }, ctx.platform)
      : { steps: [], gone: [], notes: [], blocked: "meme does not know how to delete this agent's sessions" };
    // Some agents refuse to delete a session while a fork still reads its history
    // from it (its profile, plan §3.5): name the forks too, or delete them first.
    const forks = profileOf(session.agent).keepsForkParents ? forksOf(ctx, session.id).filter((f) => !chosen.some((c) => c.id === f.id)) : [];
    if (!plan.blocked && forks.length) {
      const list = forks.map((f) => `${f.short} "${f.title ?? "untitled"}"`).join(", ");
      plan = {
        ...plan,
        steps: [],
        blocked: `${profileOf(session.agent).name} does not delete a session while ${forks.length === 1 ? "a fork reads" : "forks read"} its history from it: ${list}. Name ${forks.length === 1 ? "the fork" : "the forks"} too (\`meme forget ${[session, ...forks].map((s) => s.short).join(" ")}\`; ${forks.length === 1 ? "it is" : "they are"} deleted first), or delete ${forks.length === 1 ? "it" : "them"} first.`,
      };
    }
    return { session, plan, files };
  });
  // Forks before the sessions they were forked from, so the agent lets the parent go.
  const order = (i: Item): number => {
    let depth = 0;
    for (let s: SessionRow | null = i.session; s?.forked_from && depth < 16; s = chosen.find((c) => c.id === s!.forked_from) ?? null) depth++;
    return -depth;
  };
  items.sort((a, b) => order(a) - order(b));

  // Everything that will happen, before anything does.
  const lines = [`meme forget will permanently delete ${items.length === 1 ? "this session" : "these sessions"}:`];
  for (const { session: s, plan, files } of items) {
    const active = lastActive(s.ended_at);
    lines.push("", `  ${st.bold(s.title ?? "(untitled)")}  [${coloredLabel(st, s.agent, s.env)}]  ${s.short}  last active ${active ? ago(new Date(active).toISOString(), ctx.now, true) : "at an unknown time"}`);
    if (plan.blocked) {
      lines.push(`    ${st.yellow("cannot be deleted from here:")} ${plan.blocked}`);
      continue;
    }
    const removes = plan.steps.filter((x) => x.kind === "remove");
    const w = Math.max(0, ...removes.map((x) => displayPath(x.path, home).length + (x.kind === "remove" && x.dir ? 1 : 0)));
    for (const step of plan.steps) {
      if (step.kind === "remove") lines.push(`    ${padEnd(displayPath(step.path, home) + (step.dir ? "/" : ""), w)}  ${st.dim(step.what)}`);
      else {
        const program = path.basename(step.cmd[0]!).replace(/\.(exe|cmd|bat)$/i, "");
        lines.push(`    runs: ${step.shown ?? [program, ...step.cmd.slice(1)].join(" ")}`, `    ${st.dim(step.what + ":")}`);
        for (const f of files) lines.push(`      ${displayPath(f, home)}`);
      }
    }
    for (const note of plan.notes) lines.push(`    ${note}`);
  }
  lines.push("", "  Then meme's copy of these sessions.", "", "This cannot be undone. The sessions also disappear from the agents' own lists (/resume).");

  const deletable = items.filter((i) => !i.plan.blocked);
  write(lines.join("\n") + "\n\n");

  if (!deletable.length) {
    write("Nothing to delete here.\n");
    return 1;
  }
  if (!interactive) {
    if (!values.yes) {
      process.stderr.write("meme: nothing deleted. Deleting needs the user's confirmation: run it in a terminal, or add --yes only if the user has explicitly asked to delete these sessions.\n");
      return 1;
    }
  } else if (!agreed(deletable.length === 1 ? "Delete this session?" : `Delete these ${deletable.length} sessions?`)) {
    write("Nothing deleted.\n");
    return 1;
  }

  // The original first; only once it is gone, the mirror.
  let failed = 0;
  const touched = new Set<string>();
  for (const { session: s, plan, files } of deletable) {
    const sid = s.short;
    try {
      for (const step of plan.steps) {
        if (step.kind === "remove") (step.dir ? removeDir : removeFile)(step.path);
        else {
          const line = commandLine(step.cmd[0]!, step.cmd.slice(1));
          const p = Bun.spawnSync(line, { cwd: step.cwd, stdin: "ignore", stdout: "pipe", stderr: "pipe", windowsVerbatimArguments: line[0] === "cmd.exe" });
          if (p.exitCode !== 0) throw new Error(`\`${step.shown ?? step.cmd.slice(1).join(" ")}\` failed: ${(p.stderr.toString() || p.stdout.toString()).trim().split("\n")[0]}`);
        }
      }
      const left = plan.gone.filter((f) => existsSync(f));
      if (left.length) throw new Error(`still there: ${left.map((f) => displayPath(f, home)).join(", ")}`);
    } catch (err) {
      failed++;
      ctx.log.error(`forget ${s.id}`, err);
      write(`${st.red("✗")} ${sid}: ${(err as Error).message}. meme's copy is kept.\n`);
      continue;
    }
    for (const f of files) for (const t of deleteFile(ctx.store.db, f)) touched.add(t);
    write(`${st.green("✓")} ${sid} deleted\n`);
  }
  if (touched.size) recomputeCopied(ctx.store.db, touched);
  const blocked = items.length - deletable.length;
  return failed || blocked ? 1 : 0;
}
