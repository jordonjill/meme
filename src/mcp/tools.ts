import path from "node:path";
import { agentOfClient, runningAgent } from "../adapters/profiles";
import { createContext, projectOf } from "../cli/context";
import { contextFor } from "../cli/context-for";
import { recall, type Scope } from "../memory/context";
import { parseShelf } from "../memory/entries";
import { storeDir } from "../memory/place";
import { entryText, resolveEntry } from "../memory/show";
import { projectRef } from "../memory/projects";
import { entriesIn, memoryPaths, readText } from "../memory/store";
import { putInbox, processItem } from "../memory/inbox";
import { modelFor, rememberWords } from "../memory/remember";
import { ABOUT, TOOL_WORDS, type About } from "../prompts";
import { shown, type Shown } from "../memory/transcript";
import { normalize, oneLine } from "../memory/types";
import { redactText } from "../redact/rules";
import { LookupError, resolveSession, sessionRecords, type SessionRow } from "../store/queries";
import type { Platform } from "../platform/paths";
import { ToolError, type Tool } from "./server";

/**
 * The tools an agent gets (memory-v0.3-draft §7.5): read what memory holds for
 * where it works, look something up, see where an entry comes from, and keep what
 * the user said. Each description sits in the agent's context all the time, so they
 * are short.
 */

const text = (v: unknown): string => (typeof v === "string" ? v.trim() : "");

/** What `remember` handed to the model and has not finished: `meme mcp` waits for it before it ends. */
export const pending = new Set<Promise<unknown>>();

export function memoryTools(platform: Platform): Tool[] {
  // Looked up at each call: the folder can be on a drive that is mounted later.
  const store = () => storeDir(platform);
  const paths = () => memoryPaths(store());
  const rootOf = (args: Record<string, unknown>) => {
    const cwd = text(args.cwd);
    return projectOf(platform, cwd && path.isAbsolute(cwd) ? cwd : process.cwd());
  };
  const scopeOf = (args: Record<string, unknown>, client: string): Scope & { root: string } => {
    const root = rootOf(args);
    return { root, memoryDir: paths().memory, project: projectRef(root), agent: agentOfClient(client) ?? runningAgent(platform.vars)?.agent ?? null };
  };

  const context: Tool = {
    name: "context",
    description: TOOL_WORDS.context.description,
    inputSchema: { type: "object", properties: { task: { type: "string", description: TOOL_WORDS.context.task }, cwd: { type: "string", description: TOOL_WORDS.context.cwd } } },
    async call(args, client) {
      const cwd = text(args.cwd);
      const given = await contextFor(platform, { cwd: cwd && path.isAbsolute(cwd) ? cwd : process.cwd(), agent: agentOfClient(client) ?? runningAgent(platform.vars)?.agent ?? null, task: text(args.task) || undefined });
      return given || "meme has nothing in memory for here yet.";
    },
  };

  const recallTool: Tool = {
    name: "recall",
    description: TOOL_WORDS.recall.description,
    inputSchema: { type: "object", properties: { words: { type: "string", description: TOOL_WORDS.recall.words }, all: { type: "boolean", description: TOOL_WORDS.recall.all }, cwd: { type: "string", description: TOOL_WORDS.recall.cwd } }, required: ["words"] },
    async call(args, client) {
      const words = text(args.words);
      if (!words) throw new ToolError("recall needs `words`: what to look for");
      const found = recall(scopeOf(args, client), words, args.all === true).slice(0, 10);
      if (!found.length) return `Nothing in memory has to do with: ${words}`;
      const place = (file: string) => /^Project: (.+)$/m.exec(parseShelf(readText(file) ?? "").preamble)?.[1];
      return found.map((f) => `[${f.entry.id}] ${f.entry.text}${place(f.file) ? ` (${place(f.file)})` : ""}`).join("\n");
    },
  };

  const explain: Tool = {
    name: "explain",
    description: TOOL_WORDS.explain.description,
    inputSchema: { type: "object", properties: { id: { type: "string", description: TOOL_WORDS.explain.id } }, required: ["id"] },
    async call(args) {
      const id = text(args.id);
      if (!id) throw new ToolError("explain needs `id`: an entry's id, like m-3f2a91c0");
      try {
        return entryText(resolveEntry(entriesIn(paths().memory), id), paths().evidence, platform.home);
      } catch (err) {
        if (err instanceof LookupError) throw new ToolError(err.message);
        throw err;
      }
    },
  };

  const remember: Tool = {
    name: "remember",
    description: TOOL_WORDS.remember.description,
    inputSchema: {
      type: "object",
      properties: {
        quote: { type: "string", description: TOOL_WORDS.remember.quote },
        about: { type: "string", enum: ABOUT, description: TOOL_WORDS.remember.about },
        note: { type: "string", description: TOOL_WORDS.remember.note },
        cwd: { type: "string", description: TOOL_WORDS.remember.cwd },
      },
      required: ["quote"],
    },
    async call(args, client) {
      const quote = text(args.quote);
      if (!quote) throw new ToolError("remember needs `quote`: the user's own words, copied exactly from their message");
      if (args.about !== undefined && !ABOUT.includes(args.about as About)) throw new ToolError("`about` is one of rule, user, project");
      const said = await whereSaid(quote);
      if (!said) throw new ToolError(`not remembered: these words are not in anything the user said in a session. Copy them exactly from the user's message, or ask the user to run: meme remember "${quote}"`);
      const root = said.session.project ?? rootOf(args);
      const ref = projectRef(root);
      const st = store();
      const { model } = modelFor(st, platform.vars, root, ref);
      const note = text(args.note);
      const label = `${client || "an agent"} over MCP`;
      const words = redactText(oneLine(quote));
      if (model) {
        // The agent does not wait for the model: the request is kept, answered, and worded in the background.
        const file = putInbox(paths(), { words, ...(note ? { note: redactText(oneLine(note)) } : {}), ...(args.about ? { about: args.about as About } : {}), session: said.session.id, focus: said.focus, records: said.records, project: ref, label, at: (said.at ?? new Date()).toISOString() });
        const work = processItem(st, file, model)
          .catch(() => null)
          .finally(() => pending.delete(work));
        pending.add(work);
        return "Noted. meme words it and keeps it if it holds beyond this task.";
      }
      const done = await rememberWords({
        dataDir: st,
        origin: "agent",
        records: said.records,
        focus: said.focus,
        words,
        about: args.about as About | undefined,
        project: ref,
        source: (record) => `session:${said.session.id}#${record.seq}`,
        label,
        at: said.at ?? new Date(),
        model: null,
      });
      if (!done.kept.length) throw new ToolError(`not remembered: ${done.dropped.at(-1) ?? "nothing was kept"}`);
      return done.kept.map((k) => `${k.change === "more evidence" ? "Already in memory" : "Remembered"}: [${k.id}] ${k.text}`).join("\n");
    },
  };

  return [context, recallTool, explain, remember];
}

interface Said {
  session: SessionRow;
  /** The user's message with the words. */
  focus: number;
  /** It and the records around it, as the model is shown them. */
  records: Shown[];
  at: Date | null;
}

/**
 * Where the user said some words: the newest message of theirs, in any agent's
 * sessions, that has them. This is what makes an agent's `remember` the user's own
 * statement and not the agent's report (memory-v0.3-draft §5, the source check).
 */
async function whereSaid(quote: string): Promise<Said | null> {
  const wanted = normalize(quote);
  // A word or two would be found in almost anything.
  if (wanted.length < 4) return null;
  let ctx;
  try {
    ctx = await createContext();
  } catch {
    return null;
  }
  try {
    const rows = ctx.store.db
      .query<{ session: string; seq: number; text: string; ts: string | null }, []>("SELECT session, seq, text, ts FROM records WHERE role = 'user' AND injected IS NULL AND copied = 0 AND text IS NOT NULL ORDER BY ts DESC")
      .iterate();
    for (const r of rows) {
      if (!normalize(r.text).includes(wanted)) continue;
      const at = r.ts ? new Date(r.ts) : null;
      // A few records before the message and after it: what the user was answering, and what came of it.
      const all = shown(sessionRecords(ctx.store.db, r.session));
      const i = all.findIndex((s) => s.seq === r.seq);
      const records = i < 0 ? [{ seq: r.seq, speaker: "user" as const, text: r.text, ts: r.ts }] : all.slice(Math.max(0, i - 4), i + 3);
      return { session: resolveSession(ctx.store.db, r.session), focus: r.seq, records, at: at && !Number.isNaN(at.getTime()) ? at : null };
    }
    return null;
  } finally {
    try {
      ctx.store.db.close();
    } catch {}
  }
}
