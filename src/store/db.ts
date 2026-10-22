import { Database } from "bun:sqlite";
import { accessSync, chmodSync, constants, existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { errorCode, removeFile } from "../platform/fs";

/**
 * Bump whenever the tables, the outer fields, the redaction rules or what a
 * session's records are change. An older database is emptied and rebuilt from the
 * original sessions (plan §4.4); there are no migrations. A newer one, written by
 * a later meme, is left alone: this one works on a copy in memory.
 */
export const SCHEMA_VERSION = 9;

const SCHEMA = `
CREATE TABLE meta    (key TEXT PRIMARY KEY, value TEXT);
-- state: what the adapter says about files that feed every session of the source (an
-- index of thread names); when it changes, the source's sessions are converted again.
CREATE TABLE sources (id TEXT PRIMARY KEY, agent TEXT, env TEXT, root TEXT, reachable INTEGER, last_scan TEXT, state TEXT);
CREATE TABLE sessions (
  id           TEXT PRIMARY KEY,
  agent        TEXT NOT NULL,
  env          TEXT NOT NULL,
  project      TEXT,
  title        TEXT,
  branch       TEXT,
  started_at   TEXT,
  ended_at     TEXT,
  continued_in TEXT,
  forked_from  TEXT,
  fork_point   INTEGER,
  -- The source whose copy the mirror holds, when the session is in more than one (the
  -- copy written last; plan §6 ⑪, F10). Every copy's files are in the files table.
  source       TEXT
);
CREATE TABLE files (
  path    TEXT PRIMARY KEY,
  session TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  source  TEXT NOT NULL,
  size    INTEGER,
  mtime   REAL
);
CREATE TABLE records (
  session  TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  seq      INTEGER NOT NULL,
  uid      TEXT,
  part     INTEGER NOT NULL,
  turn     INTEGER,
  injected TEXT,
  copied   INTEGER NOT NULL,
  role     TEXT,
  ts       TEXT,
  body     TEXT NOT NULL,
  text     TEXT,
  hash     TEXT NOT NULL,
  -- 1: a local command the agent ran itself (/model), which gets no reply.
  command  INTEGER,
  PRIMARY KEY (session, seq)
);
-- Files meme could not convert (arch.md §6.1, point 2); tried again when the file or meme changes.
CREATE TABLE failures (
  path    TEXT PRIMARY KEY,
  session TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  size    INTEGER,
  mtime   REAL,
  error   TEXT NOT NULL,
  version TEXT,
  as_of   TEXT,
  meme    TEXT NOT NULL,
  at      TEXT NOT NULL
);
-- Lines meme could not read (arch.md §6.1, point 4): kind 'unknown', of record types an
-- agent's profile does not list; kind 'unread', of known types, that became no record.
CREATE TABLE unknown_types (
  session TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  kind    TEXT NOT NULL,
  type    TEXT NOT NULL,
  version TEXT NOT NULL,
  count   INTEGER NOT NULL,
  PRIMARY KEY (session, kind, type, version)
);
CREATE INDEX records_uid ON records(uid);
CREATE INDEX failures_session ON failures(session);
CREATE INDEX sessions_project ON sessions(project, ended_at);
CREATE INDEX files_session ON files(session);
CREATE INDEX sessions_continued ON sessions(continued_in);
CREATE INDEX sessions_forked ON sessions(forked_from);
`;

export interface Store {
  db: Database;
  file: string;
  /** Read-only mode (plan §4.6.8): nothing is written to disk. */
  readonly: boolean;
  /**
   * Working in memory: a copy of the database file, or a fresh database when
   * there is none. The import still runs, into memory only.
   */
  memory: boolean;
}

/** Errors that mean "this place cannot be written", e.g. inside an agent's sandbox. */
export function isReadOnlyError(err: unknown): boolean {
  const code = errorCode(err) ?? "";
  if (["EACCES", "EROFS", "EPERM"].includes(code)) return true;
  if (/^SQLITE_(READONLY|CANTOPEN|PERM|AUTH|IOERR)/.test(code)) return true;
  const msg = err instanceof Error ? err.message : "";
  return /readonly database|unable to open database|disk I\/O error/i.test(msg);
}

function isCorruptError(err: unknown): boolean {
  const code = errorCode(err) ?? "";
  const msg = err instanceof Error ? err.message : "";
  return /^SQLITE_(NOTADB|CORRUPT)/.test(code) || /not a database|malformed/i.test(msg);
}

export function openStore(dataDir: string): Store {
  const file = path.join(dataDir, "meme.sqlite");
  try {
    mkdirSync(dataDir, { recursive: true, mode: 0o700 });
    // SQLite would quietly open a write-protected file read-only; check first.
    // The journal is created next to the file, so the directory must be writable too.
    accessSync(dataDir, constants.W_OK);
    if (existsSync(file)) accessSync(file, constants.W_OK);
    const db = openReadWrite(file);
    if (db) return { db, file, readonly: false, memory: false };
  } catch (err) {
    if (!isReadOnlyError(err)) throw err;
  }
  return inMemory(file);
}

/**
 * Read-only mode (a sandbox), or a database a newer meme wrote: a copy in memory
 * that the import brings up to date, so commands see the sessions as they are now
 * without writing anything. The copy is taken through SQLite, under its lock, never
 * from the file's bytes: another meme may be in the middle of writing (plan §6 ⑨,
 * R8). A copy that cannot be had (a crash's journal it may not undo): a fresh one.
 */
function inMemory(file: string): Store {
  if (existsSync(file)) {
    try {
      const ro = new Database(file, { readonly: true });
      try {
        ro.run(`PRAGMA busy_timeout = ${BUSY_MS}`);
        if (schemaVersion(ro) === SCHEMA_VERSION) {
          const db = Database.deserialize(ro.serialize());
          configure(db);
          return { db, file, readonly: true, memory: true };
        }
      } finally {
        ro.close();
      }
    } catch {}
  }
  return { db: openMemory(), file, readonly: true, memory: true };
}

/**
 * Opening worked but writing does not: a sandbox that access() does not show
 * (Landlock, plan §6 ⑨, R3). Carry on in memory, on a copy of what is there.
 */
export function moveToMemory(store: Store): void {
  const db = Database.deserialize(store.db.serialize());
  configure(db);
  try {
    store.db.close();
  } catch {}
  store.db = db;
  store.readonly = true;
  store.memory = true;
}

function openMemory(): Database {
  const db = new Database(":memory:");
  configure(db);
  init(db);
  return db;
}

/**
 * The database, with this meme's tables; null when a newer meme wrote it. Deciding
 * and building happen in one IMMEDIATE transaction, so meme processes starting
 * together on a new or old file wait for each other instead of colliding (R7). An
 * old database is emptied in place, not deleted: another meme may have it open.
 */
function openReadWrite(file: string): Database | null {
  let db = new Database(file, { create: true, readwrite: true });
  try {
    configure(db);
    db.run("PRAGMA foreign_keys = OFF");
    const state = db
      .transaction((): "ok" | "newer" | "built" | "rebuilt" => {
        const version = schemaVersion(db);
        if (version === SCHEMA_VERSION) return "ok";
        if (version !== null && version > SCHEMA_VERSION) return "newer";
        const old = version !== null || hasTables(db);
        if (old) dropAll(db);
        db.run(SCHEMA);
        db.run("INSERT INTO meta (key, value) VALUES ('schema_version', ?)", [String(SCHEMA_VERSION)]);
        return old ? "rebuilt" : "built";
      })
      .immediate();
    db.run("PRAGMA foreign_keys = ON");
    if (state === "newer") {
      db.close();
      return null;
    }
    // The old tables' pages are zeroed (secure_delete); give the space back.
    if (state === "rebuilt") db.run("VACUUM");
    if (state !== "ok") restrict(file);
    return db;
  } catch (err) {
    db.close();
    if (!isCorruptError(err)) throw err;
  }
  // A broken file: nothing in it can be kept.
  removeFile(file);
  removeFile(file + "-journal");
  db = new Database(file, { create: true, readwrite: true });
  configure(db);
  init(db);
  restrict(file);
  return db;
}

function dropAll(db: Database): void {
  for (const { name } of db.query<{ name: string }, []>("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'").all()) {
    db.run(`DROP TABLE IF EXISTS "${name.replace(/"/g, '""')}"`);
  }
}

/** How long meme waits for another meme's write to finish. */
const BUSY_MS = 10_000;

function configure(db: Database): void {
  db.run(`PRAGMA busy_timeout = ${BUSY_MS}`);
  try {
    db.run("PRAGMA journal_mode = DELETE");
  } catch {}
  db.run("PRAGMA secure_delete = ON");
  db.run("PRAGMA foreign_keys = ON");
}

function init(db: Database): void {
  db.transaction(() => {
    db.run(SCHEMA);
    db.run("INSERT INTO meta (key, value) VALUES ('schema_version', ?)", [String(SCHEMA_VERSION)]);
  }).immediate();
}

function restrict(file: string): void {
  if (process.platform === "win32") return;
  try {
    chmodSync(file, 0o600);
  } catch {}
}

function hasTables(db: Database): boolean {
  return db.query("SELECT 1 FROM sqlite_master WHERE type = 'table' LIMIT 1").get() !== null;
}

function schemaVersion(db: Database): number | null {
  try {
    const row = db.query<{ value: string }, []>("SELECT value FROM meta WHERE key = 'schema_version'").get();
    return row ? Number(row.value) : null;
  } catch (err) {
    if (/no such table/i.test(err instanceof Error ? err.message : "")) return null;
    throw err;
  }
}

export function getMeta(db: Database, key: string): string | null {
  return db.query<{ value: string }, [string]>("SELECT value FROM meta WHERE key = ?").get(key)?.value ?? null;
}

export function setMeta(db: Database, key: string, value: string): void {
  db.run("INSERT INTO meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value", [key, value]);
}
