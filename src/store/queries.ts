import type { Database } from "bun:sqlite";
import type { Agent } from "../adapters/types";
import type { Injected } from "../model/injected";
import type { Body, Rec } from "../model/record";
import type { Env } from "../platform/env";

export interface SessionRow {
  id: string;
  agent: Agent;
  env: Env;
  project: string | null;
  title: string | null;
  branch: string | null;
  started_at: string | null;
  ended_at: string | null;
  continued_in: string | null;
  forked_from: string | null;
  fork_point: number | null;
  /** Codex moved its file to archived_sessions/: listed, marked "archived". */
  archived: number;
  /** Sum of the original files' sizes. */
  size: number;
  /** Latest mtime of the original files, in ms. */
  mtime: number | null;
  turns: number;
  /** The session has at least one AI record; empty ones are not listed. */
  talked: number;
  /** `continued_in` points to a session that is still there: hidden behind it in `ls`. */
  superseded: number;
  /** The start of the id that names this session alone, as meme shows it (see `shortest`). */
  short: string;
}

/**
 * The shortest start of an id that no other id shares: 8 characters, more when
 * another session's id starts the same way. Codex ids are uuid v7, whose first
 * characters are the time, so sessions made within a minute of each other (a
 * fork and its parent, say) share their first 8. `near` are the ids next to it
 * in sorted order, which share the longest start with it.
 */
export function shortest(id: string, near: (string | null)[]): string {
  let n = 8;
  for (const other of near) {
    if (!other) continue;
    let k = 0;
    while (k < id.length && id[k] === other[k]) k++;
    n = Math.max(n, k + 1);
  }
  return id.slice(0, n);
}

/** `shortest` for an id that is not at hand as a SessionRow. */
export function shortId(db: Database, id: string): string {
  const near = db.query<{ id: string | null }, [string]>("SELECT MAX(id) AS id FROM sessions WHERE id < ?1 UNION ALL SELECT MIN(id) FROM sessions WHERE id > ?1").all(id);
  return shortest(id, near.map((r) => r.id));
}

type Loaded = Omit<SessionRow, "short"> & { prev_id: string | null; next_id: string | null };

function withShort({ prev_id, next_id, ...row }: Loaded): SessionRow {
  return { ...row, short: shortest(row.id, [prev_id, next_id]) };
}

const SESSION_SELECT = `
SELECT s.*,
  COALESCE((SELECT SUM(size) FROM files f WHERE f.session = s.id), 0) AS size,
  (SELECT MAX(mtime) FROM files f WHERE f.session = s.id) AS mtime,
  COALESCE((SELECT turn FROM records r WHERE r.session = s.id ORDER BY seq DESC LIMIT 1), 0) AS turns,
  EXISTS (SELECT 1 FROM records r WHERE r.session = s.id AND r.role = 'assistant') AS talked,
  EXISTS (SELECT 1 FROM sessions n WHERE n.id = s.continued_in) AS superseded,
  EXISTS (SELECT 1 FROM files f WHERE f.session = s.id AND instr(f.path, 'archived_sessions') > 0) AS archived,
  (SELECT MAX(p.id) FROM sessions p WHERE p.id < s.id) AS prev_id,
  (SELECT MIN(n.id) FROM sessions n WHERE n.id > s.id) AS next_id
FROM sessions s`;

/** The original files of a session, as meme last read them. */
export function sessionFiles(db: Database, id: string): string[] {
  return db.query<{ path: string }, [string]>("SELECT path FROM files WHERE session = ? ORDER BY path").all(id).map((r) => r.path);
}

/** All sessions, newest first. */
export function allSessions(db: Database): SessionRow[] {
  return db.query<Loaded, []>(`${SESSION_SELECT} ORDER BY s.ended_at DESC, s.id`).all().map(withShort);
}

export function getSession(db: Database, id: string): SessionRow | null {
  const row = db.query<Loaded, [string]>(`${SESSION_SELECT} WHERE s.id = ?`).get(id);
  return row ? withShort(row) : null;
}

export class LookupError extends Error {}

/** A session from its id or any unique prefix of it. */
export function resolveSession(db: Database, ref: string): SessionRow {
  const prefix = ref.trim().toLowerCase();
  if (!/^[0-9a-f-]+$/.test(prefix)) throw new LookupError(`not a session id: ${ref}`);
  const ids = db
    .query<{ id: string }, [string, number]>("SELECT id FROM sessions WHERE substr(id, 1, ?2) = ?1 ORDER BY ended_at DESC LIMIT 6")
    .all(prefix, prefix.length)
    .map((r) => r.id);
  if (ids.length === 0) throw new LookupError(`no session matches ${ref}`);
  if (ids.length > 1) {
    throw new LookupError(`${ref} matches ${ids.length > 5 ? "more than 5" : ids.length} sessions: ${ids.slice(0, 5).map((id) => shortId(db, id)).join(", ")}`);
  }
  return getSession(db, ids[0]!)!;
}

interface RecordRow {
  seq: number;
  uid: string | null;
  part: number;
  turn: number;
  injected: Injected | null;
  copied: number;
  role: string;
  ts: string | null;
  body: string;
}

export function sessionRecords(db: Database, session: string): Rec[] {
  return db
    .query<RecordRow, [string]>("SELECT seq, uid, part, turn, injected, copied, role, ts, body FROM records WHERE session = ? ORDER BY seq")
    .all(session)
    .map((r) => ({
      seq: r.seq,
      uid: r.uid,
      part: r.part,
      turn: r.turn,
      injected: r.injected,
      copied: r.copied === 1,
      role: r.role,
      ts: r.ts,
      body: JSON.parse(r.body) as Body,
    }));
}

export interface Ancestor {
  id: string;
  short: string;
  /** How the part after it came from it: a continuation (Claude Code) or a fork (Codex). */
  link: "continued" | "forked";
}

/**
 * Where this session's earlier records came from, oldest first: sessions it
 * continued, and the session it was forked from (and where that one came from).
 */
export function ancestors(db: Database, session: string): Ancestor[] {
  const out: Ancestor[] = [];
  const seen = new Set([session]);
  let current = session;
  for (;;) {
    const prev = db.query<{ id: string }, [string]>("SELECT id FROM sessions WHERE continued_in = ? ORDER BY ended_at DESC LIMIT 1").get(current);
    let next: Ancestor | null = prev ? { id: prev.id, short: shortId(db, prev.id), link: "continued" } : null;
    if (!next) {
      const fork = db.query<{ forked_from: string | null }, [string]>("SELECT forked_from FROM sessions WHERE id = ?").get(current);
      if (fork?.forked_from && db.query("SELECT 1 FROM sessions WHERE id = ?").get(fork.forked_from)) next = { id: fork.forked_from, short: shortId(db, fork.forked_from), link: "forked" };
    }
    if (!next || seen.has(next.id)) break;
    seen.add(next.id);
    out.unshift(next);
    current = next.id;
  }
  return out;
}

/** Sessions continued into this one, oldest first: A → B → this. */
export function predecessors(db: Database, session: string): string[] {
  const chain: string[] = [];
  const seen = new Set([session]);
  let current = session;
  for (;;) {
    const prev = db.query<{ id: string }, [string]>("SELECT id FROM sessions WHERE continued_in = ? ORDER BY ended_at DESC LIMIT 1").get(current);
    if (!prev || seen.has(prev.id)) break;
    seen.add(prev.id);
    chain.unshift(prev.id);
    current = prev.id;
  }
  return chain;
}

export function uidsOf(db: Database, session: string): Set<string> {
  const out = new Set<string>();
  for (const r of db.query<{ uid: string }, [string]>("SELECT uid FROM records WHERE session = ? AND uid IS NOT NULL").all(session)) out.add(r.uid);
  return out;
}

export interface Counts {
  sessions: number;
  records: number;
}

export function counts(db: Database): Counts {
  const s = db.query<{ n: number }, []>("SELECT COUNT(*) AS n FROM sessions").get()!.n;
  const r = db.query<{ n: number }, []>("SELECT COUNT(*) AS n FROM records").get()!.n;
  return { sessions: s, records: r };
}

export interface SourceRow {
  id: string;
  agent: Agent;
  env: Env;
  root: string;
  reachable: number;
  last_scan: string | null;
  sessions: number;
}

export function sources(db: Database): SourceRow[] {
  return db
    .query<SourceRow, []>(
      `SELECT s.*, (SELECT COUNT(DISTINCT session) FROM files f WHERE f.source = s.id) AS sessions
       FROM sources s ORDER BY s.agent, s.env, s.root`,
    )
    .all();
}

/**
 * A session named in a handoff, by the start of its id (handoff.md §7.3, A1),
 * with its records. Several sessions sharing that start: the newest one started
 * before the handoff was made.
 */
export function handedOver(db: Database, ref: string, before: string | null): { session: SessionRow; records: Rec[] } | null {
  const rows = db.query<{ id: string; started_at: string | null }, [string, number]>("SELECT id, started_at FROM sessions WHERE substr(id, 1, ?2) = ?1").all(ref.toLowerCase(), ref.length);
  if (!rows.length) return null;
  const cut = before ? Date.parse(before) : NaN;
  const earlier = rows.filter((r) => !Number.isNaN(cut) && r.started_at && Date.parse(r.started_at) <= cut).sort((a, b) => b.started_at!.localeCompare(a.started_at!));
  const id = (earlier[0] ?? rows[0]!).id;
  const session = getSession(db, id);
  return session ? { session, records: sessionRecords(db, id) } : null;
}
