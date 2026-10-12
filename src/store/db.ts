import { Database } from "bun:sqlite";
import { accessSync, chmodSync, constants, existsSync, mkdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { errorCode, removeFile } from "../platform/fs";

/**
 * Bump whenever the tables, the outer fields or the redaction rules change. A
 * mismatch deletes the database and rebuilds it from the original sessions
 * (plan §4.4); there are no migrations.
 */
export const SCHEMA_VERSION = 5;

const SCHEMA = `
CREATE TABLE meta    (key TEXT PRIMARY KEY, value TEXT);
CREATE TABLE sources (id TEXT PRIMARY KEY, agent TEXT, env TEXT, root TEXT, reachable INTEGER, last_scan TEXT);
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
  fork_point   INTEGER
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
    return { db: openReadWrite(file), file, readonly: false, memory: false };
  } catch (err) {
    if (!isReadOnlyError(err)) throw err;
  }
  // Read-only (a sandbox): copy the database into memory and import into the copy,
  // so commands see current sessions without writing anything.
  if (existsSync(file)) {
    try {
      const db = Database.deserialize(readFileSync(file));
      if (schemaVersion(db) === SCHEMA_VERSION) {
        configure(db);
        return { db, file, readonly: true, memory: true };
      }
      db.close();
    } catch {}
  }
  return { db: openMemory(), file, readonly: true, memory: true };
}

function openMemory(): Database {
  const db = new Database(":memory:");
  configure(db);
  init(db);
  return db;
}

function openReadWrite(file: string): Database {
  let db: Database;
  try {
    db = new Database(file, { create: true, readwrite: true });
    configure(db);
    const version = schemaVersion(db);
    if (version === SCHEMA_VERSION) return db;
    if (version === null && !hasTables(db)) {
      init(db);
      restrict(file);
      return db;
    }
    db.close();
  } catch (err) {
    if (!isCorruptError(err)) throw err;
  }
  // Old schema or a broken file: rebuild from the original sessions.
  removeFile(file);
  removeFile(file + "-journal");
  db = new Database(file, { create: true, readwrite: true });
  configure(db);
  init(db);
  restrict(file);
  return db;
}

function configure(db: Database): void {
  db.run("PRAGMA busy_timeout = 10000");
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
