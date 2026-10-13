import type { Database } from "bun:sqlite";
import { PROFILES } from "../adapters/profiles";
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
  /** The agent moved its file to its archive folder (its profile's `archivedDir`): listed, marked "archived". */
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
  /** meme could not convert its file (arch.md §6.1, point 2): listed, marked "can't read". */
  unreadable: number;
  /** Unreadable, with an older mirror: when that mirror's content ends. Null when it was never read. */
  readable_until: string | null;
  /** The start of the id that names this session alone, as meme shows it (see `shortest`). */
  short: string;
}

/**
 * The shortest start of an id that no other id shares: 8 characters, more when
 * another session's id starts the same way. Ids that are uuid v7 (one agent's) start with
 * the time, so sessions made within a minute of each other (a
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

/** A file in an agent's archive folder. */
const ARCHIVED = PROFILES.flatMap((p) => (p.archivedDir ? [`instr(f.path, '${p.archivedDir.replace(/'/g, "''")}') > 0`] : [])).join(" OR ") || "0";

const SESSION_SELECT = `
SELECT s.*,
  COALESCE((SELECT SUM(size) FROM files f WHERE f.session = s.id), 0) AS size,
  (SELECT MAX(mtime) FROM files f WHERE f.session = s.id) AS mtime,
  COALESCE((SELECT turn FROM records r WHERE r.session = s.id ORDER BY seq DESC LIMIT 1), 0) AS turns,
  EXISTS (SELECT 1 FROM records r WHERE r.session = s.id AND r.role = 'assistant') AS talked,
  EXISTS (SELECT 1 FROM failures x WHERE x.session = s.id) AS unreadable,
  (SELECT MIN(as_of) FROM failures x WHERE x.session = s.id) AS readable_until,
  EXISTS (SELECT 1 FROM sessions n WHERE n.id = s.continued_in) AS superseded,
  EXISTS (SELECT 1 FROM files f WHERE f.session = s.id AND (${ARCHIVED})) AS archived,
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
  /** How the part after it came from it: a continuation (the agent copied it into a new session) or a fork. */
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

export interface FailureRow {
  path: string;
  session: string;
  short: string;
  agent: Agent;
  env: Env;
  error: string;
  version: string | null;
  as_of: string | null;
  at: string;
}

/** Files meme could not convert (arch.md §6.1, point 2), for `meme status`. */
export function failures(db: Database): FailureRow[] {
  return db
    .query<Omit<FailureRow, "short">, []>(
      "SELECT x.path, x.session, s.agent, s.env, x.error, x.version, x.as_of, x.at FROM failures x JOIN sessions s ON s.id = x.session ORDER BY s.agent, x.path",
    )
    .all()
    .map((r) => ({ ...r, short: shortId(db, r.session) }));
}

/** What meme could not read (arch.md §6.1, point 4): types it does not know, or known types whose lines became no record. */
export type Unread = "unknown" | "unread";

/** Per agent and version: how many lines and sessions, by type. */
export function unknownTypes(db: Database, kind: Unread = "unknown"): { agent: Agent; version: string; type: string; lines: number; sessions: number }[] {
  return db
    .query<{ agent: Agent; version: string; type: string; lines: number; sessions: number }, [string]>(
      `SELECT s.agent, u.version, u.type, SUM(u.count) AS lines, COUNT(DISTINCT u.session) AS sessions
       FROM unknown_types u JOIN sessions s ON s.id = u.session WHERE u.kind = ?
       GROUP BY s.agent, u.version, u.type ORDER BY s.agent, u.version, u.type`,
    )
    .all(kind);
}

/** Per agent and version, all types together: lines and sessions. */
export function unreadByVersion(db: Database, kind: Unread): { agent: Agent; version: string; lines: number; sessions: number; types: string }[] {
  return db
    .query<{ agent: Agent; version: string; lines: number; sessions: number; types: string }, [string]>(
      `SELECT s.agent, u.version, SUM(u.count) AS lines, COUNT(DISTINCT u.session) AS sessions, GROUP_CONCAT(DISTINCT u.type) AS types
       FROM unknown_types u JOIN sessions s ON s.id = u.session WHERE u.kind = ?
       GROUP BY s.agent, u.version ORDER BY s.agent, u.version`,
    )
    .all(kind);
}

/** One session's lines meme could not read, of this kind, by type. */
export function unknownIn(db: Database, session: string, kind: Unread = "unknown"): { type: string; count: number }[] {
  return db
    .query<{ type: string; count: number }, [string, string]>("SELECT type, SUM(count) AS count FROM unknown_types WHERE session = ? AND kind = ? GROUP BY type ORDER BY type")
    .all(session, kind);
}

/** Why a session's files cannot be read: the first file's error. */
export function failureOf(db: Database, session: string): string | null {
  return db.query<{ error: string }, [string]>("SELECT error FROM failures WHERE session = ? ORDER BY path LIMIT 1").get(session)?.error ?? null;
}

/** The directory the session started in, as it wrote it (its meta record); the project when there is none. */
export function startDirOf(db: Database, session: SessionRow): string | null {
  const row = db.query<{ body: string }, [string]>("SELECT body FROM records WHERE session = ? AND role = 'meta' ORDER BY seq LIMIT 1").get(session.id);
  if (row) {
    try {
      const cwd = (JSON.parse(row.body) as { cwd?: unknown }).cwd;
      if (typeof cwd === "string" && cwd) return cwd;
    } catch {}
  }
  return session.project;
}
