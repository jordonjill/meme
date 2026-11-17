import { apply, type Change, type Origin } from "./apply";
import { ConfigError, loadConfig } from "./config";
import { asker, ModelError, type Ask } from "./model";
import { isExcluded, KEEP_SYSTEM, proposeAndKeep, type Kept } from "./pipeline";
import type { ProjectRef } from "./projects";
import { entriesIn, memoryPaths } from "./store";
import type { Shown } from "./transcript";
import type { Shelf } from "./types";

/**
 * Remembering what the user asked to keep (plan-m2 F8). The words are the user's:
 * typed after `meme remember`, or found in a session where an agent says the user
 * said them. Who words the memory is meme: its own model, with the same rules as the
 * pipeline, when one is set up; otherwise the user's words go in as they are. An
 * agent's own wording never does: it has not been told how memory is written.
 */

export type About = "rule" | "user" | "project";
export const ABOUT: readonly About[] = ["rule", "user", "project"];

/** Someone is waiting for the answer: a shorter wait than the pipeline's. */
const WAIT_MS = 60_000;

/** The model to word a memory with, for a project; null, and why, when the words go in as they are. */
export function modelFor(store: string, vars: Record<string, string | undefined>, project: string | null, ref: ProjectRef | null): { model: RememberRequest["model"]; why?: string } {
  let config;
  try {
    config = loadConfig(store, vars);
  } catch (err) {
    if (err instanceof ConfigError) return { model: null, why: err.message };
    throw err;
  }
  if (!config.model) return { model: null, why: "no model is set up to word it" };
  if (isExcluded(project, ref, config.exclude)) return { model: null, why: "this project is never sent to the model" };
  return { model: { ask: asker(config.model, fetch, WAIT_MS), secret: config.model.key } };
}

export interface RememberRequest {
  dataDir: string;
  origin: Origin;
  /** The records to show the model: the one with the user's words, and some around it. */
  records: Shown[];
  /** The record that has the user's words. */
  focus: number;
  /** The user's words. */
  words: string;
  /** What the user or the agent says it is about; the model decides when there is one. */
  about?: About;
  /** What the agent says about why; for the model to read, never written. */
  note?: string;
  project: ProjectRef | null;
  source: (record: Shown) => string;
  label: string;
  at: Date;
  salt?: string;
  /** The model to word it; null for the words as they are. */
  model: { ask: Ask; secret?: string } | null;
}

export interface Remembered {
  kept: (Kept & { text: string })[];
  /** Why something proposed was not kept. */
  dropped: string[];
  /** Worded by the model, or the user's words as they are. */
  by: "model" | "words";
  /** The model was asked and failed; the words were kept as they are. */
  modelError?: string;
}

function shelfOf(about: About | undefined, project: ProjectRef | null): Shelf {
  if (about === "project" && project) return { level: "project", project: project.key, file: "MEMORY" };
  return { level: "user", file: about === "user" ? "USER" : "RULES" };
}

const textOf = (dataDir: string, id: string) => entriesIn(memoryPaths(dataDir).memory).find((e) => e.entry.id === id)?.entry.text ?? "";

/**
 * The words and the agent's note must already have their secrets masked: they are sent to the model.
 */
export async function rememberWords(r: RememberRequest): Promise<Remembered> {
  let modelError: string | undefined;
  const dropped: string[] = [];
  if (r.model) {
    try {
      const focus = r.records.find((s) => s.seq === r.focus);
      const got = await proposeAndKeep(r.records, r.model.ask, {
        dataDir: r.dataDir,
        origin: r.origin,
        system: KEEP_SYSTEM,
        intro: [
          `Project: ${r.project?.identity ?? "(none)"}`,
          `The user asked to remember what they said in record #${r.focus}${focus && focus.text.trim() !== r.words.trim() ? `, in particular: ${r.words}` : ""}.`,
          ...(r.about ? [`It is said to be about: ${r.about === "rule" ? "how every agent should work with the user" : r.about === "user" ? "the user and their machines" : "this project"}.`] : []),
          ...(r.note ? [`The agent that asked adds: ${r.note}`] : []),
          "",
        ],
        heading: r.records.length > 1 ? `The records, #${r.records[0]!.seq} to #${r.records.at(-1)!.seq}:` : `The record:`,
        project: r.project,
        source: r.source,
        label: r.label,
        at: r.at.getTime(),
        secret: r.model.secret,
        salt: r.salt,
      });
      if (got.kept.length) return { kept: got.kept.map((k) => ({ ...k, text: textOf(r.dataDir, k.id) })), dropped: got.dropped, by: "model" };
      dropped.push(...got.dropped);
    } catch (err) {
      if (!(err instanceof ModelError)) throw err;
      modelError = err.message;
    }
  }
  // The user asked for it to be kept: when the model kept nothing, or could not be asked, the words go in as they are.
  const record = r.records.find((s) => s.seq === r.focus) ?? r.records[0]!;
  const shelf = shelfOf(r.about, r.project);
  // The source was checked by whoever found the words: in a session, or typed after `meme remember`.
  const done = await apply(
    r.dataDir,
    {
      origin: r.origin,
      evidence: [{ kind: "fact", tier: "stated", speaker: "user", scope: shelf.level === "project" ? `project:${shelf.project}` : "user", source: r.source(record), content: r.words, at: r.at, label: r.label, ...(r.salt ? { salt: r.salt } : {}) }],
      ops: [{ op: "add", shelf, text: r.words, kind: "fact", evidence: [0], project: r.project?.identity }],
    },
    { verify: () => true },
  );
  const outcome = done.outcomes[0]!;
  if (!outcome.ok) return { kept: [], dropped: [...dropped, outcome.reason], by: "words", ...(modelError ? { modelError } : {}) };
  const entry = entriesIn(memoryPaths(r.dataDir).memory).find((e) => e.entry.id === outcome.id)!.entry;
  return {
    kept: [{ id: outcome.id, file: outcome.file, change: outcome.change as Change, active: entry.status === "active", text: entry.text }],
    dropped,
    by: "words",
    ...(modelError ? { modelError } : {}),
  };
}
