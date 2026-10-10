import type { Database } from "bun:sqlite";
import type { SessionRow } from "./queries";

export interface SearchOptions {
  pattern: string;
  /** `-F`: the pattern is plain text, not a regex. */
  fixed: boolean;
  ignoreCase: boolean;
  /** `-C N`: lines of context around each matching line. */
  context: number;
  /** Sessions to search; null for all. */
  sessions: string[] | null;
}

export interface Hit {
  session: string;
  seq: number;
  uid: string | null;
  turn: number;
  role: string;
  /** A tool call (the AI acting) as opposed to the AI's prose. */
  call: boolean;
  /** Output of a tool: counted, listed only with `--all`. */
  toolOutput: boolean;
  line: string;
  /** Match position inside `line`. */
  start: number;
  end: number;
  before: string[];
  after: string[];
}

export class PatternError extends Error {}

export function compile(o: Pick<SearchOptions, "pattern" | "fixed" | "ignoreCase">): RegExp {
  const source = o.fixed ? o.pattern.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&") : o.pattern;
  try {
    return new RegExp(source, o.ignoreCase ? "i" : "");
  } catch (err) {
    throw new PatternError(`invalid regex: ${(err as Error).message}`);
  }
}

interface Candidate {
  session: string;
  seq: number;
  uid: string | null;
  turn: number;
  role: string;
  text: string;
}

/**
 * Scan every searchable record (plan §4.6.5): no index, like rg. Injected and
 * copied records are skipped, so each piece of text counts once.
 */
export function search(db: Database, o: SearchOptions): Hit[] {
  const re = compile(o);
  const where = ["injected = 0", "copied = 0", "text IS NOT NULL"];
  const params: (string | number)[] = [];
  // `instr` narrows plain-text searches in SQL; `LIKE` would treat `_` as a wildcard.
  if (o.fixed && (!o.ignoreCase || /^[\x00-\x7f]*$/.test(o.pattern))) {
    where.push(o.ignoreCase ? "instr(lower(text), lower(?)) > 0" : "instr(text, ?) > 0");
    params.push(o.pattern);
  }
  if (o.sessions) {
    if (o.sessions.length === 0) return [];
    where.push(`session IN (${o.sessions.map(() => "?").join(",")})`);
    params.push(...o.sessions);
  }
  const rows = db
    .query<Candidate, (string | number)[]>(
      `SELECT session, seq, uid, turn, role, text FROM records WHERE ${where.join(" AND ")} ORDER BY session, seq`,
    )
    .all(...params);
  const isCall = db.prepare<{ t: string | null }, [string, number]>(
    "SELECT json_type(body, '$.tool_calls') AS t FROM records WHERE session = ? AND seq = ?",
  );

  const hits: Hit[] = [];
  for (const row of rows) {
    if (!re.test(row.text)) continue;
    const call = row.role === "assistant" && isCall.get(row.session, row.seq)?.t === "array";
    const lines = row.text.replace(/\r\n?/g, "\n").split("\n");
    for (let i = 0; i < lines.length; i++) {
      const m = re.exec(lines[i]!);
      if (!m) continue;
      hits.push({
        session: row.session,
        seq: row.seq,
        uid: row.uid,
        turn: row.turn,
        role: row.role,
        call,
        toolOutput: row.role === "tool",
        line: lines[i]!,
        start: m.index,
        end: m.index + m[0].length,
        before: o.context ? lines.slice(Math.max(0, i - o.context), i) : [],
        after: o.context ? lines.slice(i + 1, i + 1 + o.context) : [],
      });
    }
  }
  return hits;
}

export interface HitGroup {
  /** The newest session of the chain; hits from older sessions are shown under it. */
  head: SessionRow;
  hits: Hit[];
  /** Turn to open with `meme show <head> <turn>`, per hit. */
  turnInHead: Map<Hit, number | null>;
  /** Short ids of the sessions the hits are in. */
  shorts: Map<string, string>;
}

/**
 * Group hits by continuation chain, newest first. A hit in an older session is
 * mapped to the same record's turn in the newest one, which holds a copy of it.
 */
export function groupByChain(db: Database, hits: Hit[], sessions: Map<string, SessionRow>): HitGroup[] {
  const headOf = (id: string): string => {
    const seen = new Set<string>();
    let cur = id;
    for (;;) {
      const next = sessions.get(cur)?.continued_in;
      if (!next || !sessions.has(next) || seen.has(next)) return cur;
      seen.add(cur);
      cur = next;
    }
  };
  const groups = new Map<string, HitGroup>();
  const turnByUid = db.prepare<{ turn: number }, [string, string]>("SELECT turn FROM records WHERE session = ? AND uid = ? LIMIT 1");
  for (const hit of hits) {
    const head = headOf(hit.session);
    let g = groups.get(head);
    if (!g) {
      g = { head: sessions.get(head)!, hits: [], turnInHead: new Map(), shorts: new Map() };
      groups.set(head, g);
    }
    g.hits.push(hit);
    g.shorts.set(hit.session, sessions.get(hit.session)?.short ?? hit.session);
    if (hit.session === head) g.turnInHead.set(hit, hit.turn);
    else g.turnInHead.set(hit, hit.uid ? (turnByUid.get(head, hit.uid)?.turn ?? null) : null);
  }
  return [...groups.values()].sort((a, b) => (b.head.ended_at ?? "").localeCompare(a.head.ended_at ?? ""));
}
