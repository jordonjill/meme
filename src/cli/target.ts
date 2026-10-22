import path from "node:path";
import { agentNamed } from "../adapters/profiles";
import type { Agent } from "../adapters/types";
import { ENV_WORDS, type Env } from "../platform/env";
import { listed, listing, type ListFilter, type Listing } from "../render/ls";
import { idPrefix, type SessionRow } from "../store/queries";

/**
 * What `meme continue <target>` points at (plan §3.4). A target is one or more
 * words, each narrowing the choice: `last` (the newest), an agent (any of its
 * profile's aliases), an environment (`win`, `wsl`, `mac`, `linux`), the start of a session
 * id, or a word from the title or the project's folder name. Numbers from a
 * printed list are handled by the caller.
 */
export type Resolution =
  | { kind: "one"; session: SessionRow }
  | { kind: "many"; listing: Listing }
  | { kind: "none"; message: string };


export function isListNumber(token: string): boolean {
  return /^\d{1,3}$/.test(token);
}

export function resolveTarget(tokens: string[], rows: SessionRow[], filter: ListFilter): Resolution {
  let last = false;
  let agent: Agent | undefined;
  let env: Env | undefined;
  const ids: string[] = [];
  const words: string[] = [];
  for (const raw of tokens) {
    const t = raw.toLowerCase();
    if (t === "last") last = true;
    else if (agentNamed(t)) agent = agentNamed(t);
    else if (ENV_WORDS[t]) env = ENV_WORDS[t];
    else if (idPrefix(t, 4) && rows.some((r) => r.id.startsWith(t))) ids.push(t);
    else words.push(t);
  }
  const matches = (r: SessionRow) =>
    ids.every((p) => r.id.startsWith(p)) &&
    words.every((w) => (r.title ?? "").toLowerCase().includes(w) || path.basename(r.project ?? "").toLowerCase().includes(w));
  const narrowed: ListFilter = { ...filter, agent: agent ?? filter.agent, env: env ?? filter.env };

  let found: SessionRow[];
  let scope: Listing;
  if (ids.length) {
    // An id names the session wherever it is, even one continued later or the current one.
    found = rows.filter((r) => matches(r) && (!narrowed.agent || r.agent === narrowed.agent) && (!narrowed.env || r.env === narrowed.env));
    scope = { rows: found, filter: { ...narrowed, all: true }, fellBack: false, others: 0 };
  } else {
    scope = listing(rows, narrowed);
    found = scope.rows.filter(matches);
    if (!found.length && !scope.filter.all) {
      // Nothing here: look in the other projects before giving up.
      found = listed(rows, { ...narrowed, all: true }).filter(matches);
      scope = { rows: found, filter: { ...narrowed, all: true }, fellBack: false, others: 0 };
    }
  }
  if (last && found.length) found = found.slice(0, 1);
  if (found.length === 1) return { kind: "one", session: found[0]! };
  if (found.length > 1) return { kind: "many", listing: { ...scope, rows: found, others: 0 } };
  return { kind: "none", message: `no session matches "${tokens.join(" ")}"` };
}
