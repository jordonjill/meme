import { profileOf } from "../../adapters/profiles";
import { ConfigError, configFile, loadConfig } from "../../memory/config";
import { LockTimeout, withLock } from "../../memory/lock";
import { asker, ModelError } from "../../memory/model";
import { storeDir } from "../../memory/place";
import { processItem, waiting } from "../../memory/inbox";
import { FIRST_RUN_DAYS, markUpdate, pick, run, type SessionResult } from "../../memory/pipeline";
import { memoryPaths, NewerFormat } from "../../memory/store";
import { displayPath } from "../../platform/paths";
import { plural } from "../../render/text";
import { resolveSession } from "../../store/queries";
import { isReadOnlyError } from "../../store/db";
import { CommandError } from "../args";
import { createContext, write } from "../context";
import path from "node:path";

/** A run reads several sessions with a model, minutes in all: a second one waits for nothing and says so. */
const RUNNING = { waitMs: 0, staleMs: 30 * 60 * 1000 };

/** The most sessions a run started by itself reads; the rest wait for the next. */
const BACKGROUND_LIMIT = 20;

export async function update(o: { dryRun: boolean; all: boolean; session?: string; background?: boolean }): Promise<number> {
  const ctx = await createContext();
  const { platform } = ctx;
  if (!o.background) return run1(ctx, o, write);
  // Started by itself, nobody reads its output: what goes wrong goes to the log.
  try {
    return await run1(ctx, o, () => {});
  } catch (err) {
    ctx.log.error("meme memory update --background", err);
    return 1;
  }
}

async function run1(ctx: Awaited<ReturnType<typeof createContext>>, o: { dryRun: boolean; all: boolean; session?: string; background?: boolean }, write: (text: string) => void): Promise<number> {
  const { platform } = ctx;
  const home = platform.home;
  const store = storeDir(platform);
  const p = memoryPaths(store);
  let config;
  try {
    config = loadConfig(store, platform.vars);
  } catch (err) {
    if (err instanceof ConfigError) throw new CommandError(err.message);
    throw err;
  }
  const only = o.session ? resolveSession(ctx.store.db, o.session).id : undefined;
  const { due, older } = pick(ctx.store.db, p, { now: ctx.now, all: o.all, only, exclude: config.exclude, ...(o.background ? { limit: BACKGROUND_LIMIT } : {}) });
  const left = waiting(p);
  const olderNote = older.length ? `Not read: ${plural(older.length, "session")} that ended more than ${FIRST_RUN_DAYS} days ago; --all reads them too.\n` : "";
  const line = (s: (typeof due)[number]["session"]) => `${s.short}  ${profileOf(s.agent).name}  ${s.project ? displayPath(s.project, home) : "(no project)"}`;

  if (!due.length && !left.length) {
    write(only ? "Nothing new in that session since it was read.\n" : `Nothing to read: every session that has been quiet for 2 hours is read already.\n${olderNote}`);
    return 0;
  }
  const tokens = due.reduce((n, d) => n + d.tokens, 0);
  const to = config.model ? `${config.model.name} at ${config.model.url}` : "a model, once one is set up";

  if (o.dryRun) {
    const lines = [`Would read ${plural(due.length, "session")}, about ${tokens.toLocaleString("en-US")} tokens, and send them to ${to}:`];
    for (const d of due) lines.push(`  ${line(d.session)}  ${d.tokens.toLocaleString("en-US")} tokens`);
    if (left.length) lines.push(`and word ${plural(left.length, "thing")} an agent passed on to remember.`);
    write(lines.join("\n") + `\n${olderNote}Nothing is sent by --dry-run.\n`);
    return 0;
  }
  if (!config.model) {
    throw new CommandError(
      [
        "no model is set up. Reading sessions sends their text to a model you choose, so meme needs to know which:",
        "  meme model set",
        "  (any service that speaks the OpenAI chat format; one on this machine keeps everything here)",
        "`meme memory update --dry-run` shows what would be sent.",
      ].join("\n"),
    );
  }

  const model = config.model;
  const say = (r: SessionResult) => {
    const dropped = r.dropped.length ? `, left out ${r.dropped.length} (${[...new Set(r.dropped)].join("; ")})` : "";
    write(`${line(r.session)}: kept ${r.kept}${dropped}\n`);
  };
  let results: SessionResult[] = [];
  let worded = 0;
  try {
    results = await withLock(
      path.join(p.state, "update.lock"),
      async () => {
        markUpdate(p, ctx.now);
        // First what agents passed on and nobody finished wording.
        const ask = { ask: asker(model), secret: model.key };
        for (const file of left) if ((await processItem(store, file, ask))?.kept.length) worded++;
        return run(due, older, ask.ask, { dataDir: store, model: model.name, now: ctx.now, secret: model.key, onSession: say });
      },
      RUNNING,
    );
  } catch (err) {
    if (err instanceof LockTimeout) throw new CommandError("another `meme memory update` is running");
    if (err instanceof ModelError) throw new CommandError(`${err.message}\nStopped there. What was read before it is kept; the rest is read by the next run.`);
    if (err instanceof NewerFormat) throw new CommandError(err.message);
    if (isReadOnlyError(err)) throw new CommandError(`meme cannot write its memory here (${displayPath(store, home)} cannot be written)`);
    throw err;
  }
  const kept = results.reduce((n, r) => n + r.kept, 0);
  const active = results.reduce((n, r) => n + r.active, 0);
  const dropped = results.reduce((n, r) => n + r.dropped.length, 0);
  if (worded) write(`Worded ${plural(worded, "thing")} an agent passed on to remember.\n`);
  write(`Read ${plural(results.length, "session")}: kept ${plural(kept, "entry", "entries")} (${active} in force, ${kept - active} waiting as candidates), left out ${dropped}. \`meme memory\` lists them.\n${olderNote}`);
  return 0;
}
