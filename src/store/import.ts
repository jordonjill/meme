import type { Database } from "bun:sqlite";
import { existsSync, realpathSync, statSync } from "node:fs";
import pkg from "../../package.json";
import type { Adapter, ConvertContext, Converted, SourceRoot } from "../adapters/types";
import { projectResolver } from "../model/project";
import { searchText } from "../model/record";
import type { Logger } from "../platform/log";
import type { Platform } from "../platform/paths";
import { mayHoldSecret, redactDeep, redactText } from "../redact/rules";
import { isReadOnlyError, moveToMemory, setMeta, type Store } from "./db";
import { deleteFile, recomputeCopied } from "./sync";

export interface ImportResult {
  scanned: number;
  changed: number;
  deleted: number;
  failed: number;
  unreachable: string[];
  ms: number;
}

interface StoredFile {
  path: string;
  session: string;
  size: number;
  mtime: number;
}

/**
 * Incremental import (plan §4.6.1). Runs before every command. A source that
 * cannot be read is skipped and nothing from it is deleted; a file that cannot be
 * read keeps its old mirror. `only` limits it to some sources (on Windows the WSL
 * ones come second, once `wsl.exe` has said which distributions are running).
 */
export function importAll(store: Store, platform: Platform, adapters: readonly Adapter[], log: Logger, only?: (root: SourceRoot) => boolean): ImportResult {
  const started = performance.now();
  const result: ImportResult = { scanned: 0, changed: 0, deleted: 0, failed: 0, unreachable: [], ms: 0 };
  if (store.readonly && !store.memory) return result;
  const { db } = store;
  const local = projectResolver(platform);
  const inWsl = new Map<string, (cwd: string | null) => string | null>();
  const projectFor = (root: SourceRoot) => {
    if (!root.wsl) return local;
    let r = inWsl.get(root.wsl.root);
    if (!r) inWsl.set(root.wsl.root, (r = projectResolver(platform, root.wsl)));
    return r;
  };
  const touched = new Set<string>();
  // The same folder by two paths (an agent's home in WSL linked to the Windows one) is read once, by the first (R16).
  const read = new Set<string>();
  try {
    for (const adapter of adapters) {
      for (const root of adapter.roots(platform)) {
        if (only && !only(root)) continue;
        const key = realPath(root.path);
        if (read.has(key)) {
          dropSource(db, root);
          continue;
        }
        read.add(key);
        importRoot(db, adapter, root, projectFor(root), log, result, touched);
      }
    }
    if (result.changed + result.deleted > 0) {
      recomputeCopied(db, touched);
      setMeta(db, "last_import", new Date().toISOString());
      log.info(`import: ${result.changed} changed, ${result.deleted} deleted, ${result.failed} failed, ${Math.round(performance.now() - started)}ms`);
    }
  } catch (err) {
    if (!isReadOnlyError(err) || store.memory) throw err;
    // Opening worked but writing does not: a sandbox access() does not show (Landlock).
    // On a copy in memory, the command still sees the sessions as they are now (R3).
    moveToMemory(store);
    log.info("import: the database cannot be written here, working on a copy in memory");
    return importAll(store, platform, adapters, log, only);
  }
  result.ms = performance.now() - started;
  return result;
}

function realPath(p: string): string {
  try {
    return realpathSync(p);
  } catch {
    return p;
  }
}

/** A source read under another path: its rows go, so `status` does not list it twice. */
function dropSource(db: Database, root: SourceRoot): void {
  if (!db.query("SELECT 1 FROM sources WHERE id = ?").get(root.id)) return;
  db.transaction(() => {
    db.run("DELETE FROM files WHERE source = ?", [root.id]);
    db.run("DELETE FROM sources WHERE id = ?", [root.id]);
  }).immediate();
}

function importRoot(
  db: Database,
  adapter: Adapter,
  root: SourceRoot,
  project: (cwd: string | null) => string | null,
  log: Logger,
  result: ImportResult,
  touched: Set<string>,
): void {
  const prev = db.query<SourceState, [string]>("SELECT reachable, state, last_scan FROM sources WHERE id = ?").get(root.id);
  let listed: string[];
  try {
    listed = adapter.listFiles(root);
  } catch (err) {
    markSource(db, root, false, prev?.state ?? null, prev);
    result.unreachable.push(root.path);
    // Not installed, or no sessions yet: not a line on every run (plan §6 ⑧.3, ⑨ R9).
    const mirrored = db.query("SELECT 1 FROM files WHERE source = ? LIMIT 1").get(root.id) !== null;
    if (mirrored && existsSync(adapter.homeOf(root))) log.info(`source unreachable, nothing deleted: ${root.path} (${(err as Error).message})`);
    return;
  }
  // A change in what feeds every session of the source (an index of names) converts them all again (R18).
  const state = adapter.rootState?.(root) ?? null;
  const reconvert = prev !== null && (prev.state ?? null) !== state;
  markSource(db, root, true, state, prev);

  const stored = new Map<string, StoredFile>();
  for (const row of db.query<StoredFile, [string]>("SELECT path, session, size, mtime FROM files WHERE source = ?").all(root.id)) {
    stored.set(row.path, row);
  }

  // A session can have several files (an agent may start a new one on a rollback): convert them together.
  const groups = new Map<string, string[]>();
  for (const file of listed) {
    const id = adapter.sessionId(file);
    if (!id) continue;
    (groups.get(id) ?? groups.set(id, []).get(id)!).push(file);
  }
  const filesOf = (id: string) => groups.get(id) ?? [];

  const seen = new Set<string>();
  for (const [sessionId, files] of groups) {
    for (const f of files) seen.add(f);
    result.scanned += files.length;
    const states: FileState[] = [];
    let unreadable = false;
    for (const file of files) {
      try {
        const st = statSync(file);
        states.push({ path: file, source: root.id, size: st.size, mtime: st.mtimeMs });
      } catch (err) {
        unreadable = true;
        log.error(`stat failed, keeping the old mirror: ${file}`, err);
      }
    }
    if (unreadable) {
      result.failed++;
      continue;
    }
    // Both size and mtime: an agent on Windows may append without updating mtime (sessions.md §7.1).
    const same = (s: FileState) => {
      const prev = stored.get(s.path);
      return prev !== undefined && prev.session === sessionId && prev.size === s.size && prev.mtime === s.mtime;
    };
    const storedOfSession = [...stored.values()].filter((f) => f.session === sessionId).length;
    // A file that could not be read is tried again only when it or meme changed.
    const failed = db.query<{ path: string; size: number; mtime: number; meme: string }, [string]>("SELECT path, size, mtime, meme FROM failures WHERE session = ?").all(sessionId);
    const stillFailing =
      failed.length === states.length &&
      failed.every((f) => f.meme === pkg.version) &&
      states.every((s) => failed.some((f) => f.path === s.path && f.size === s.size && f.mtime === s.mtime));
    if (failed.length && stillFailing) {
      result.failed++;
      continue;
    }
    if (!reconvert && !failed.length && states.every(same) && storedOfSession === states.length) continue;
    const ctx: ConvertContext = { sessionId, root, project, filesOf };
    let converted: Converted;
    try {
      converted = adapter.convert(files, ctx);
    } catch (err) {
      result.failed++;
      log.error(`read failed, keeping the old mirror: ${files.join(", ")}`, err);
      recordFailure(db, adapter, ctx, files, states, err);
      touched.add(sessionId);
      continue;
    }
    writeSession(db, converted, states);
    touched.add(converted.session.id);
    if (converted.session.continuedIn) touched.add(converted.session.continuedIn);
    result.changed++;
  }

  for (const prev of stored.values()) {
    if (seen.has(prev.path)) continue;
    // writeSession may already have dropped it while rewriting its session.
    if (!db.query("SELECT 1 FROM files WHERE path = ?").get(prev.path)) continue;
    for (const id of deleteFile(db, prev.path)) touched.add(id);
    result.deleted++;
  }
}

interface SourceState {
  reachable: number;
  state: string | null;
  last_scan: string | null;
}

/** How long a WSL source's time of last scan may lag: "its sessions are as of …" when it stops. */
const SCAN_LAG_MS = 10 * 60_000;

/** Written only when something changed, so a run with nothing new writes nothing to the file (R30). */
function markSource(db: Database, root: SourceRoot, reachable: boolean, state: string | null, prev: SourceState | null): void {
  const stale = Boolean(root.wsl) && Date.now() - Date.parse(prev?.last_scan ?? "") > SCAN_LAG_MS;
  if (prev && prev.reachable === (reachable ? 1 : 0) && (prev.state ?? null) === state && !stale) return;
  db.run(
    `INSERT INTO sources (id, agent, env, root, reachable, last_scan, state) VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET reachable = excluded.reachable, last_scan = excluded.last_scan, state = excluded.state`,
    [root.id, root.agent, root.env, root.path, reachable ? 1 : 0, new Date().toISOString(), state],
  );
}

interface FileState {
  path: string;
  source: string;
  size: number;
  mtime: number;
}

/**
 * What went wrong, for `meme status`: the kind of error and the first line of its
 * message, with anything quoted (which may come from the file) left out.
 */
export function describeError(err: unknown): string {
  const e = (err ?? {}) as { code?: unknown; name?: unknown; message?: unknown };
  const kind = typeof e.code === "string" ? e.code : typeof e.name === "string" ? e.name : "Error";
  const first = String(e.message ?? err).split("\n")[0]!.replace(/"[^"]*"|'[^']*'|`[^`]*`/g, "…").trim();
  const line = first.length > 160 ? first.slice(0, 159) + "…" : first;
  return redactText(!line ? kind : line.startsWith(kind) ? line : `${kind}: ${line}`);
}

/**
 * A session whose files cannot be converted (arch.md §6.1, point 2). With a
 * mirror from before, that stays, marked as of its last activity; without one,
 * the session is listed from what can be told without converting it.
 */
function recordFailure(db: Database, adapter: Adapter, ctx: ConvertContext, files: string[], states: FileState[], err: unknown): void {
  const mirror = db
    .query<{ ended_at: string | null; has: number }, [string]>("SELECT ended_at, EXISTS (SELECT 1 FROM records r WHERE r.session = s.id) AS has FROM sessions s WHERE id = ?")
    .get(ctx.sessionId);
  const peeked = adapter.peek(files, ctx);
  const at = new Date().toISOString();
  db.transaction(() => {
    if (!mirror?.has) {
      db.run(
        `INSERT INTO sessions (id, agent, env, project, title, branch, started_at, ended_at, continued_in, forked_from, fork_point)
         VALUES (?, ?, ?, ?, ?, NULL, ?, ?, NULL, NULL, NULL)
         ON CONFLICT(id) DO UPDATE SET project = excluded.project, title = excluded.title, started_at = excluded.started_at, ended_at = excluded.ended_at`,
        [ctx.sessionId, adapter.agent, ctx.root.env, ctx.project(peeked.cwd), peeked.title === null ? null : redactText(peeked.title), peeked.startedAt, peeked.endedAt],
      );
      for (const f of states) {
        db.run(
          `INSERT INTO files (path, session, source, size, mtime) VALUES (?, ?, ?, ?, ?)
           ON CONFLICT(path) DO UPDATE SET session = excluded.session, source = excluded.source, size = excluded.size, mtime = excluded.mtime`,
          [f.path, ctx.sessionId, f.source, f.size, f.mtime],
        );
      }
    }
    db.run("DELETE FROM failures WHERE session = ?", [ctx.sessionId]);
    for (const f of states) {
      db.run("INSERT INTO failures (path, session, size, mtime, error, version, as_of, meme, at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)", [
        f.path, ctx.sessionId, f.size, f.mtime, describeError(err), peeked.version, mirror?.has ? mirror.ended_at : null, pkg.version, at,
      ]);
    }
  }).immediate();
}


/**
 * Write one converted session in a single transaction, touching only records
 * whose hash changed (plan §4.6.1 step 5).
 */
export function writeSession(db: Database, converted: Converted, files: FileState[]): void {
  const s = converted.session;
  const rows = converted.records.map((rec, seq) => {
    const raw = JSON.stringify(rec.body);
    const redacted = mayHoldSecret(raw) ? redactDeep(rec.body) : rec.body;
    const body = redacted === rec.body ? raw : JSON.stringify(redacted);
    const text = searchText(redacted);
    const hash = Bun.hash(JSON.stringify([rec.uid, rec.part, rec.turn, rec.injected, rec.role, rec.ts, body])).toString(36);
    return { seq, rec, body, text, hash };
  });

  const upsertSession = db.prepare(
    `INSERT INTO sessions (id, agent, env, project, title, branch, started_at, ended_at, continued_in, forked_from, fork_point)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET agent = excluded.agent, env = excluded.env, project = excluded.project,
       title = excluded.title, branch = excluded.branch, started_at = excluded.started_at,
       ended_at = excluded.ended_at, continued_in = excluded.continued_in, forked_from = excluded.forked_from,
       fork_point = excluded.fork_point`,
  );
  const upsertFile = db.prepare(
    `INSERT INTO files (path, session, source, size, mtime) VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(path) DO UPDATE SET session = excluded.session, source = excluded.source,
       size = excluded.size, mtime = excluded.mtime`,
  );
  const upsertRecord = db.prepare(
    `INSERT INTO records (session, seq, uid, part, turn, injected, copied, role, ts, body, text, hash)
     VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?)
     ON CONFLICT(session, seq) DO UPDATE SET uid = excluded.uid, part = excluded.part, turn = excluded.turn,
       injected = excluded.injected, copied = 0, role = excluded.role, ts = excluded.ts,
       body = excluded.body, text = excluded.text, hash = excluded.hash`,
  );

  db.transaction(() => {
    upsertSession.run(
      s.id, s.agent, s.env, s.project, s.title === null ? null : redactText(s.title),
      s.branch, s.startedAt, s.endedAt, s.continuedIn, s.forkedFrom, s.forkPoint,
    );
    for (const f of files) upsertFile.run(f.path, s.id, f.source, f.size, f.mtime);
    // Files of this session that are gone (an archived file moved, an old rollback file removed).
    const keep = new Set(files.map((f) => f.path));
    for (const { path } of db.query<{ path: string }, [string]>("SELECT path FROM files WHERE session = ?").all(s.id)) {
      if (!keep.has(path)) db.run("DELETE FROM files WHERE path = ?", [path]);
    }
    const existing = new Map<number, string>();
    for (const r of db.query<{ seq: number; hash: string }, [string]>("SELECT seq, hash FROM records WHERE session = ?").all(s.id)) {
      existing.set(r.seq, r.hash);
    }
    for (const row of rows) {
      if (existing.get(row.seq) === row.hash) continue;
      const r = row.rec;
      upsertRecord.run(s.id, row.seq, r.uid, r.part, r.turn, r.injected, r.role, r.ts, row.body, row.text, row.hash);
    }
    db.run("DELETE FROM records WHERE session = ? AND seq >= ?", [s.id, rows.length]);
    // Read again: no longer unreadable; and the record types it does not know, as of now.
    db.run("DELETE FROM failures WHERE session = ?", [s.id]);
    db.run("DELETE FROM unknown_types WHERE session = ?", [s.id]);
    for (const [kind, list] of [["unknown", converted.unknown], ["unread", converted.unread]] as const) {
      for (const u of list) {
        db.run("INSERT INTO unknown_types (session, kind, type, version, count) VALUES (?, ?, ?, ?, ?) ON CONFLICT DO UPDATE SET count = count + excluded.count", [s.id, kind, u.type, u.version ?? "", u.count]);
      }
    }
  }).immediate();
}
