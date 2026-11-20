import { putInbox, type Finding, type Found } from "../memory/inbox";
import { storeDir } from "../memory/place";
import { memoryProject } from "../memory/projects";
import { modelFor, rememberWords, type About, type RememberRequest } from "../memory/remember";
import { memoryPaths } from "../memory/store";
import { shown, type Shown } from "../memory/transcript";
import { normalize, oneLine } from "../memory/types";
import type { Platform } from "../platform/paths";
import { redactText } from "../redact/rules";
import { resolveSession, sessionRecords, type SessionRow } from "../store/queries";
import { createContext } from "./context";

/**
 * Remembering what an agent passes on (plan-m2 F8, F10), over MCP or by `meme
 * remember` run inside an agent. The words count as the user's only when they are
 * found among the user's messages: that is what makes an agent's `remember` the
 * user's own statement and not the agent's report (memory-v0.3-draft §5, the source
 * check). Inside an agent meme cannot tell the user typing `! meme remember` from
 * the agent running it, so both are held to this.
 */

export interface Said {
  session: SessionRow;
  /** The user's message with the words. */
  focus: number;
  /** It and the records around it, as the model is shown them. */
  records: Shown[];
  at: Date | null;
}

/** Where the user said some words: the newest message of theirs, in any agent's sessions, that has them. */
export async function whereSaid(quote: string): Promise<Said | null> {
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

/** How an inbox item that waits to be found is looked for, and worded once found. */
export function finding(platform: Platform): Finding {
  const store = storeDir(platform);
  return {
    async find(words): Promise<Found | null> {
      const said = await whereSaid(words);
      return said ? { session: said.session.id, root: said.session.project, focus: said.focus, records: said.records, at: said.at } : null;
    },
    modelFor: (root) => modelFor(store, platform.vars, root, memoryProject(root)).model,
    project: memoryProject,
  };
}

/** The answer to an agent whose words are worded in the background. */
export const NOTED = "Noted. meme words it and keeps it if it holds beyond this task.";

export interface FromAgent {
  /** The user's words, as the agent passed them. */
  quote: string;
  about?: About;
  /** For the model to read, never written. */
  note?: string;
  /** Keep the words as they are, without the model. */
  asIs?: boolean;
  /** Who passed them on, for the evidence: "<client> over MCP", "meme remember in <agent>". */
  label: string;
  /** The project folder to use when the words are found in a session that has none. */
  root: string;
  /** Words not found may still show: a `!` command is written to the session once it has run. */
  mayWait: boolean;
}

export type FromAgentResult =
  /** In the inbox, to be worded by the model; `file` is the item, `model` the one to word it. */
  | { done: "noted"; file: string; model: NonNullable<RememberRequest["model"]> }
  /** Kept as said, there being no model to word it. */
  | { done: "kept"; lines: string[] }
  /** Not among the user's messages yet: in the inbox, kept once found. */
  | { done: "waiting"; file: string }
  /** Not among the user's messages, and not to wait for. */
  | { done: "not found" }
  | { done: "refused"; why: string };

export async function rememberFromAgent(platform: Platform, r: FromAgent): Promise<FromAgentResult> {
  const store = storeDir(platform);
  const p = memoryPaths(store);
  const words = redactText(oneLine(r.quote));
  const note = r.note ? redactText(oneLine(r.note)) : undefined;
  const extra = { ...(note ? { note } : {}), ...(r.about ? { about: r.about } : {}), ...(r.asIs ? { asIs: true as const } : {}) };
  const said = await whereSaid(r.quote);
  if (!said) {
    if (!r.mayWait) return { done: "not found" };
    return { done: "waiting", file: putInbox(p, { words, ...extra, project: memoryProject(r.root), label: r.label, at: new Date().toISOString() }) };
  }
  const root = said.session.project ?? r.root;
  const ref = memoryProject(root);
  const { model } = r.asIs ? { model: null } : modelFor(store, platform.vars, root, ref);
  const at = said.at ?? new Date();
  if (model) {
    // The agent does not wait for the model: the request is kept, answered, and worded in the background.
    return { done: "noted", model, file: putInbox(p, { words, ...extra, session: said.session.id, focus: said.focus, records: said.records, project: ref, label: r.label, at: at.toISOString() }) };
  }
  const done = await rememberWords({
    dataDir: store,
    origin: "agent",
    records: said.records,
    focus: said.focus,
    words,
    about: r.about,
    project: ref,
    source: (record) => `session:${said.session.id}#${record.seq}`,
    label: r.label,
    at,
    model: null,
  });
  if (!done.kept.length) return { done: "refused", why: done.dropped.at(-1) ?? "nothing was kept" };
  return { done: "kept", lines: done.kept.map((k) => `${k.change === "more evidence" ? "Already in memory" : "Remembered"}: [${k.id}] ${k.text}`) };
}
