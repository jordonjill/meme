import type { Database } from "bun:sqlite";
import type { Agent } from "../adapters/types";
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
  /** Sum of the original files' sizes. */
  size: number;
  /** Latest mtime of the original files, in ms. */
  mtime: number | null;
  turns: number;
  /** The session has at least one AI record; empty ones are not listed. */
  talked: number;
  /** `continued_in` points to a session that is still there: hidden behind it in `ls`. */
  superseded: number;
}

const SESSION_SELECT = `
SELECT s.*,
  COALESCE((SELECT SUM(size) FROM files f WHERE f.session = s.id), 0) AS size,
  (SELECT MAX(mtime) FROM files f WHERE f.session = s.id) AS mtime,
  COALESCE((SELECT turn FROM records r WHERE r.session = s.id ORDER BY seq DESC LIMIT 1), 0) AS turns,
  EXISTS (SELECT 1 FROM records r WHERE r.session = s.id AND r.role = 'assistant') AS talked,
  EXISTS (SELECT 1 FROM sessions n WHERE n.id = s.continued_in) AS superseded
FROM sessions s`;

/** All sessions, newest first. */
export function allSessions(db: Database): SessionRow[] {
  return db.query<SessionRow, []>(`${SESSION_SELECT} ORDER BY s.ended_at DESC, s.id`).all();
}

export function getSession(db: Database, id: string): SessionRow | null {
  return db.query<SessionRow, [string]>(`${SESSION_SELECT} WHERE s.id = ?`).get(id);
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
    throw new LookupError(`${ref} matches ${ids.length > 5 ? "more than 5" : ids.length} sessions: ${ids.slice(0, 5).map((id) => id.slice(0, 12)).join(", ")}`);
  }
  return getSession(db, ids[0]!)!;
}

interface RecordRow {
  seq: number;
  uid: string | null;
  part: number;
  turn: number;
  injected: number;
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
      injected: r.injected === 1,
      copied: r.copied === 1,
      role: r.role,
      ts: r.ts,
      body: JSON.parse(r.body) as Body,
    }));
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
