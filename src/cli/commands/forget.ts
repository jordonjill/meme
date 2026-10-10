import { existsSync } from "node:fs";
import path from "node:path";
import { adapterFor } from "../../adapters";
import type { ForgetPlan } from "../../adapters/types";
import { lastActive, mayBeRunning } from "../../model/turns";
import { removeDir, removeFile } from "../../platform/fs";
import { displayPath } from "../../platform/paths";
import { commandLine } from "../../platform/spawn";
import { coloredLabel } from "../../render/labels";
import { ago, padEnd } from "../../render/text";
import { ancestors, getSession, resolveSession, type SessionRow } from "../../store/queries";
import { pickSession } from "../../tui/picker";
import { deleteFile, recomputeCopied } from "../../store/sync";
import { CommandError, parse, UsageError } from "../args";
import { createContext, insideAgent, output, write, type Context } from "../context";

export const forgetHelp = `Usage: meme forget [<session>...] [--yes] [--chain]

Delete sessions for good: from the agent that made them, then from meme's
mirror. Name each session by its id (any unique start of it), or, in a
terminal, leave the ids out and pick the session from the list. meme lists
everything it will delete and asks you to type yes.

  --yes     do not ask; needed inside an agent, and only when the user has
            explicitly asked to delete these sessions
  --chain   also delete the earlier sessions a continued session came from

Claude Code: meme deletes the session file and its folders (subagents and large
tool output, file-history backups, session-env). Codex: meme runs
\`codex delete --force <id>\`, and only for sessions of this environment.
The session that runs meme cannot be deleted.
`;

interface Item {
  session: SessionRow;
  plan: ForgetPlan;
  files: string[];
}

function filesOf(ctx: Context, id: string): string[] {
  return ctx.store.db.query<{ path: string }, [string]>("SELECT path FROM files WHERE session = ? ORDER BY path").all(id).map((r) => r.path);
}

/** The sessions a continued session came from, nearest first (Claude Code's continued-in chain). */
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

function ask(question: string): string {
  return (prompt(question) ?? "").trim().toLowerCase();
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

  const ctx = createContext();
  if (ctx.store.readonly) throw new CommandError("nothing can be deleted here: meme is in read-only mode (inside a sandbox?)");
  const out = output(false);
  const st = out.st;
  const home = ctx.platform.home;

  // What was named, or picked from the list: never the session that runs meme.
  const chosen: SessionRow[] = [];
  if (!positionals.length) {
    const picked = await pickSession(ctx, out, { all: false, project: ctx.project, exclude: ctx.current }, "Delete which session?", "choose");
    if (!picked) return 0;
    chosen.push(picked);
  }
  for (const ref of positionals) {
    const s = resolveSession(ctx.store.db, ref);
    if (ctx.current.has(s.id)) throw new CommandError(`${s.short} is the session that is running meme; it cannot delete itself`);
    if (!chosen.some((c) => c.id === s.id)) chosen.push(s);
  }

  // A continued session: its earlier part stays in the older session unless that goes too.
  for (const s of [...chosen]) {
    const earlier = earlierParts(ctx, s.id).filter((e) => !chosen.some((c) => c.id === e.id));
    if (!earlier.length) continue;
    const names = earlier.map((e) => e.short).join(", ");
    write(`${s.short} was continued from ${names}. ${names} still ${earlier.length === 1 ? "holds" : "hold"} the first part of this conversation; if only ${s.short} is deleted, ${names} ${earlier.length === 1 ? "shows" : "show"} up in the list again.\n`);
    let include = Boolean(values.chain);
    if (!include && interactive) include = ["y", "yes"].includes(ask(`Also delete ${names}? [y/N] `));
    if (include) for (const e of earlier) if (!ctx.current.has(e.id)) chosen.push(e);
    write("\n");
  }

  const items: Item[] = chosen.map((session) => {
    const files = filesOf(ctx, session.id);
    const adapter = adapterFor(session.agent);
    let plan: ForgetPlan = adapter
      ? adapter.forgetPlan({ id: session.id, env: session.env, files }, ctx.platform)
      : { steps: [], gone: [], notes: [], blocked: "meme does not know how to delete this agent's sessions" };
    // Codex refuses to delete a session while a fork still reads its history from
    // it ("failed to delete session", plan §3.5): name the forks too, or delete them first.
    const forks = forksOf(ctx, session.id).filter((f) => !chosen.some((c) => c.id === f.id));
    if (!plan.blocked && forks.length) {
      const list = forks.map((f) => `${f.short} "${f.title ?? "untitled"}"`).join(", ");
      plan = {
        ...plan,
        steps: [],
        blocked: `Codex does not delete a session while ${forks.length === 1 ? "a fork reads" : "forks read"} its history from it: ${list}. Name ${forks.length === 1 ? "the fork" : "the forks"} too (\`meme forget ${[session, ...forks].map((s) => s.short).join(" ")}\`; ${forks.length === 1 ? "it is" : "they are"} deleted first), or delete ${forks.length === 1 ? "it" : "them"} first.`,
      };
    }
    return { session, plan, files };
  });
  // Forks before the sessions they were forked from, so Codex lets the parent go.
  const order = (i: Item): number => {
    let depth = 0;
    for (let s: SessionRow | null = i.session; s?.forked_from && depth < 16; s = chosen.find((c) => c.id === s!.forked_from) ?? null) depth++;
    return -depth;
  };
  items.sort((a, b) => order(a) - order(b));

  // Everything that will happen, before anything does.
  const lines = ["meme forget deletes these sessions for good:"];
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
        lines.push(`    runs: ${[program, ...step.cmd.slice(1)].join(" ")}`, `    ${st.dim(step.what + ":")}`);
        for (const f of files) lines.push(`      ${displayPath(f, home)}`);
      }
    }
    for (const note of plan.notes) lines.push(`    ${note}`);
  }
  lines.push("", "  Then meme's copy of these sessions.", "", "This cannot be undone. The sessions also disappear from the agents' own lists (/resume).");

  const warnings: string[] = [];
  const deletable = items.filter((i) => !i.plan.blocked);
  const running = deletable.filter((i) => mayBeRunning(lastActive(i.session.ended_at), ctx.now));
  for (const { session: s } of running) {
    warnings.push(`${s.short} was active ${ago(s.ended_at, ctx.now, true)} and may still be running in another window.`);
  }
  for (const w of warnings) lines.push(st.yellow(`Warning: ${w}`));
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
    if (running.length) {
      process.stderr.write(`meme: nothing deleted: ${running.map((r) => r.session.short).join(", ")} may still be running, which needs a second confirmation; run meme forget in a terminal.\n`);
      return 1;
    }
  } else {
    if (ask("Type yes to delete them: ") !== "yes") {
      write("Nothing deleted.\n");
      return 1;
    }
    if (warnings.length && ask("There are warnings above. Type yes again to delete anyway: ") !== "yes") {
      write("Nothing deleted.\n");
      return 1;
    }
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
          const p = Bun.spawnSync(line, { stdout: "pipe", stderr: "pipe", windowsVerbatimArguments: line[0] === "cmd.exe" });
          if (p.exitCode !== 0) throw new Error(`\`${step.cmd.slice(1).join(" ")}\` failed: ${(p.stderr.toString() || p.stdout.toString()).trim().split("\n")[0]}`);
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
