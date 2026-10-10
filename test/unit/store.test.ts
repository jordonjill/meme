import { describe, expect, test } from "bun:test";
import { appendFileSync, chmodSync, readFileSync, renameSync, rmSync, statSync, utimesSync, writeFileSync } from "node:fs";
import path from "node:path";
import { openStore, SCHEMA_VERSION } from "../../src/store/db";
import { allSessions, counts, sessionRecords } from "../../src/store/queries";
import { ClaudeSession, resetIds, sampleSession } from "../fixtures/gen-claude";
import { importInto, projectsDir, tempDir, testPlatform } from "../helpers";

const isRoot = process.getuid?.() === 0;

function setup() {
  resetIds();
  const home = tempDir();
  const p = testPlatform(home);
  return { home, p, projects: projectsDir(home) };
}

const hashes = (store: ReturnType<typeof importInto>["store"], id: string) =>
  store.db.query<{ seq: number; hash: string }, [string]>("SELECT seq, hash FROM records WHERE session = ? ORDER BY seq").all(id);

describe("incremental import (plan §4.6.1)", () => {
  test("first import, then nothing to do", () => {
    const { p, projects } = setup();
    sampleSession().write(projects);
    new ClaudeSession({ cwd: "/work/other" }).write(projects, new ClaudeSession().text());
    const first = importInto(p);
    expect(first.result.changed).toBe(2);
    expect(counts(first.store.db).sessions).toBe(2);
    first.store.db.close();
    const again = importInto(p);
    expect(again.result).toMatchObject({ scanned: 2, changed: 0, deleted: 0, failed: 0 });
  });

  test("an appended file is re-read; unchanged records keep their rows", () => {
    const { p, projects } = setup();
    const s = sampleSession();
    const file = s.write(projects);
    const { store } = importInto(p);
    const before = hashes(store, s.id);
    s.user("one more question");
    s.assistant("one more answer");
    writeFileSync(file, s.text());
    const { result } = importInto(p, store);
    expect(result.changed).toBe(1);
    const after = hashes(store, s.id);
    expect(after.length).toBe(before.length + 2);
    expect(after.slice(0, before.length)).toEqual(before);
  });

  test("a half-written last line waits until it is complete", () => {
    const { p, projects } = setup();
    const s = sampleSession();
    const file = s.write(projects);
    const { store } = importInto(p);
    const n = counts(store.db).records;
    s.user("partial");
    const full = s.text();
    const lastLine = full.trimEnd().split("\n").pop()!;
    appendFileSync(file, lastLine.slice(0, 20));
    importInto(p, store);
    expect(counts(store.db).records).toBe(n);
    writeFileSync(file, full);
    importInto(p, store);
    expect(counts(store.db).records).toBe(n + 1);
  });

  test("a rewritten file with the same size but a new mtime is re-read", () => {
    const { p, projects } = setup();
    const s = new ClaudeSession();
    s.user("aaaa");
    s.assistant("bbbb");
    const file = s.write(projects);
    const { store } = importInto(p);
    writeFileSync(file, readFileSync(file, "utf8").replace("aaaa", "cccc"));
    const t = statSync(file).mtimeMs / 1000 + 5;
    utimesSync(file, t, t);
    expect(importInto(p, store).result.changed).toBe(1);
    expect(sessionRecords(store.db, s.id).some((r) => "content" in r.body && r.body.content === "cccc")).toBe(true);
  });
});

describe("sync delete", () => {
  test("a deleted session is removed, and its text is gone from the database file", () => {
    const { p, projects } = setup();
    const keep = sampleSession();
    keep.write(projects);
    const gone = new ClaudeSession({ cwd: "/work/gone" });
    gone.user("UNIQUE-SECRET-PHRASE-4711 please remember");
    gone.assistant("UNIQUE-SECRET-PHRASE-4711 noted");
    const file = gone.write(projects);
    const { store } = importInto(p);
    store.db.close();
    expect(readFileSync(store.file).includes("UNIQUE-SECRET-PHRASE-4711")).toBe(true);
    rmSync(file);
    const second = importInto(p);
    expect(second.result.deleted).toBe(1);
    expect(allSessions(second.store.db).map((s) => s.id)).toEqual([keep.id]);
    second.store.db.close();
    expect(readFileSync(second.store.file).includes("UNIQUE-SECRET-PHRASE-4711")).toBe(false);
  });

  test("an unreachable source deletes nothing", () => {
    const { p, projects } = setup();
    sampleSession().write(projects);
    const { store } = importInto(p);
    renameSync(projects, projects + ".away");
    const { result } = importInto(p, store);
    expect(result.unreachable).toEqual([projects]);
    expect(result.deleted).toBe(0);
    expect(counts(store.db).sessions).toBe(1);
    expect(store.db.query("SELECT reachable FROM sources").get()).toEqual({ reachable: 0 });
    // Back again: nothing to re-read.
    renameSync(projects + ".away", projects);
    expect(importInto(p, store).result.changed).toBe(0);
  });

  test.skipIf(isRoot)("a file that cannot be read keeps its old mirror", () => {
    const { p, projects } = setup();
    const s = sampleSession();
    const file = s.write(projects);
    const { store } = importInto(p);
    s.user("more");
    writeFileSync(file, s.text());
    chmodSync(file, 0o000);
    const { result } = importInto(p, store);
    chmodSync(file, 0o644);
    expect(result.failed).toBe(1);
    expect(counts(store.db).sessions).toBe(1);
  });
});

describe("continuation chains", () => {
  test("copied records are flagged, and the flags clear when the old session goes", () => {
    const { p, projects } = setup();
    const a = sampleSession();
    const b = new ClaudeSession({ start: "2026-10-01T10:00:00.000Z" });
    a.resumeInto(b);
    b.user("new in b");
    b.assistant("answer in b");
    const fileA = a.write(projects);
    b.write(projects);
    const { store } = importInto(p);
    const copied = () => store.db.query<{ n: number }, [string]>("SELECT SUM(copied) AS n FROM records WHERE session = ?").get(b.id)!.n;
    const ownOfA = store.db.query<{ n: number }, [string]>("SELECT COUNT(*) AS n FROM records WHERE session = ? AND uid IS NOT NULL").get(a.id)!.n;
    // Everything of A that is a user/assistant line was copied (A's system-form /model was not).
    expect(copied()).toBe(ownOfA - 1);
    expect(store.db.query("SELECT SUM(copied) AS n FROM records WHERE session = ?").get(a.id)).toEqual({ n: 0 });
    const rows = allSessions(store.db);
    expect(rows.find((r) => r.id === a.id)!.superseded).toBe(1);
    expect(rows.find((r) => r.id === b.id)!.superseded).toBe(0);
    rmSync(fileA);
    importInto(p, store);
    expect(copied()).toBe(0);
  });
});

describe("store files and modes", () => {
  test.skipIf(process.platform === "win32")("the database is private to the user", () => {
    const { p, projects } = setup();
    sampleSession().write(projects);
    const { store } = importInto(p);
    expect(statSync(store.file).mode & 0o777).toBe(0o600);
    expect(statSync(p.dataDir).mode & 0o777).toBe(0o700);
  });

  test("an old schema version is rebuilt from the sessions", () => {
    const { p, projects } = setup();
    sampleSession().write(projects);
    const { store } = importInto(p);
    store.db.run("UPDATE meta SET value = '0' WHERE key = 'schema_version'");
    store.db.close();
    const again = importInto(p);
    expect(again.result.changed).toBe(1);
    expect(again.store.db.query("SELECT value FROM meta WHERE key = 'schema_version'").get()).toEqual({ value: String(SCHEMA_VERSION) });
  });

  test("a broken database file is rebuilt", () => {
    const { p, projects } = setup();
    sampleSession().write(projects);
    importInto(p).store.db.close();
    writeFileSync(path.join(p.dataDir, "meme.sqlite"), "this is not a database, just text that is long enough to have a header");
    const again = importInto(p);
    expect(counts(again.store.db).sessions).toBe(1);
  });

  test.skipIf(isRoot || process.platform === "win32")("read-only data directory: work on an in-memory copy, write nothing (plan §4.6.8)", () => {
    const { p, projects } = setup();
    sampleSession().write(projects);
    importInto(p).store.db.close();
    sampleSession({ id: "99999999-0000-4000-8000-000000000001" }).write(projects);
    chmodSync(path.join(p.dataDir, "meme.sqlite"), 0o444);
    chmodSync(p.dataDir, 0o555);
    try {
      const file = path.join(p.dataDir, "meme.sqlite");
      const before = statSync(file);
      const store = openStore(p.dataDir);
      expect([store.readonly, store.memory]).toEqual([true, true]);
      // The new session is imported into the in-memory copy; the file is not touched.
      const { result } = importInto(p, store);
      expect(result.changed).toBe(1);
      expect(counts(store.db).sessions).toBe(2);
      const after = statSync(file);
      expect([after.size, after.mtimeMs]).toEqual([before.size, before.mtimeMs]);
    } finally {
      chmodSync(p.dataDir, 0o755);
    }
  });

  test.skipIf(isRoot || process.platform === "win32")("no writable place at all: import into memory", () => {
    const { home, projects } = setup();
    sampleSession().write(projects);
    const locked = path.join(home, "locked");
    require("node:fs").mkdirSync(locked, { mode: 0o555 });
    const p = { ...testPlatform(home), dataDir: path.join(locked, ".meme") };
    try {
      const store = openStore(p.dataDir);
      expect(store).toMatchObject({ readonly: true, memory: true });
      const { result } = importInto(p, store);
      expect(result.changed).toBe(1);
    } finally {
      chmodSync(locked, 0o755);
    }
  });
});
