import { ABOUT, type About } from "../prompts";
import type { ModelConfig } from "./config";

/** The model did not answer, or not in a way that can be used; the run stops and nothing is marked as read. */
export class ModelError extends Error {}

const TIMEOUT_MS = 180_000;

export type Ask = (system: string, user: string) => Promise<string>;

/** One question, one answer, over the OpenAI chat format. Nothing is set that only some services take. */
export function asker(model: ModelConfig, fetcher: typeof fetch = fetch, timeoutMs = TIMEOUT_MS): Ask {
  return async (system, user) => {
    let res: Response;
    try {
      res = await fetcher(`${model.url}/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(model.key ? { Authorization: `Bearer ${model.key}` } : {}) },
        body: JSON.stringify({ model: model.name, messages: [{ role: "system", content: system }, { role: "user", content: user }] }),
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (err) {
      throw new ModelError(`could not reach the model at ${model.url}: ${(err as Error).message}`);
    }
    const body = await res.text();
    if (!res.ok) throw new ModelError(`the model at ${model.url} answered ${res.status}: ${body.replace(/\s+/g, " ").slice(0, 200)}`);
    try {
      const content = (JSON.parse(body) as { choices?: { message?: { content?: unknown } }[] }).choices?.[0]?.message?.content;
      if (typeof content === "string") return content;
    } catch {}
    throw new ModelError(`the model at ${model.url} answered in a form meme does not know: ${body.replace(/\s+/g, " ").slice(0, 200)}`);
  };
}

/** What the model is asked to return for one piece of a session. */
export interface Proposed {
  text: string;
  kind: "fact" | "experience";
  about: About;
  /** Words copied from the session, and the number of the record they are in. */
  quote: string;
  at: number;
  when?: string;
  why?: string;
  /** An entry this makes out of date. */
  replaces?: string;
  /** An entry that already says this: the quote is one more piece of evidence for it. */
  supports?: string;
}

const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");

/**
 * The memories in a model's answer. Models wrap JSON in fences or words, so the
 * outermost braces are taken. An item that lacks what is needed is left out; an
 * answer with no list at all is an error.
 */
export function parseAnswer(answer: string): Proposed[] {
  const from = answer.indexOf("{");
  const to = answer.lastIndexOf("}");
  let parsed: unknown;
  try {
    parsed = JSON.parse(from >= 0 && to > from ? answer.slice(from, to + 1) : answer);
  } catch {
    throw new ModelError("the model did not answer with JSON");
  }
  const list = (parsed as { memories?: unknown }).memories;
  if (!Array.isArray(list)) throw new ModelError("the model's answer has no `memories` list");
  const out: Proposed[] = [];
  for (const raw of list as Record<string, unknown>[]) {
    if (typeof raw !== "object" || raw === null) continue;
    const text = str(raw.text);
    const quote = str(raw.quote);
    const at = typeof raw.at === "number" ? raw.at : Number(str(raw.at).replace(/^#/, "") || NaN);
    if (!text || !quote || !Number.isInteger(at)) continue;
    out.push({
      text,
      kind: raw.kind === "experience" ? "experience" : "fact",
      about: ABOUT.includes(raw.about as About) ? (raw.about as About) : "rule",
      quote,
      at,
      ...(str(raw.when) ? { when: str(raw.when) } : {}),
      ...(str(raw.why) ? { why: str(raw.why) } : {}),
      ...(/^m-[0-9a-f]{8}$/.test(str(raw.replaces)) ? { replaces: str(raw.replaces) } : {}),
      ...(/^m-[0-9a-f]{8}$/.test(str(raw.supports)) ? { supports: str(raw.supports) } : {}),
    });
  }
  return out;
}
