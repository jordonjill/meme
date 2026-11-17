import { describe, expect, test } from "bun:test";
import { appendFileSync, chmodSync, existsSync, readFileSync, renameSync, rmSync, statSync, utimesSync, writeFileSync } from "node:fs";
import path from "node:path";
import { layout } from "../../src/platform/layout";
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
    writeFileSync(layout(p.dataDir).mirror, "this is not a database, just text that is long enough to have a header");
    const again = importInto(p);
    expect(counts(again.store.db).sessions).toBe(1);
  });

  test.skipIf(isRoot || process.platform === "win32")("read-only data directory: work on an in-memory copy, write nothing (plan §4.6.8)", () => {
    const { p, projects } = setup();
    sampleSession().write(projects);
    importInto(p).store.db.close();
    sampleSession({ id: "99999999-0000-4000-8000-000000000001" }).write(projects);
    chmodSync(layout(p.dataDir).mirror, 0o444);
    // The mirror's own folder and the data folder: neither can be written.
    for (const d of [path.dirname(layout(p.dataDir).mirror), p.dataDir]) chmodSync(d, 0o555);
    try {
      const file = layout(p.dataDir).mirror;
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
      for (const d of [p.dataDir, path.dirname(layout(p.dataDir).mirror)]) chmodSync(d, 0o755);
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

describe("store fixes of step 9 (plan §6 ⑨)", () => {
  const ROOT_DIR = path.resolve(import.meta.dir, "../..");

  test.skipIf(isRoot || process.platform === "win32")("R3: opened read-write but writes refused (a Landlock sandbox): an in-memory copy, imported afresh", () => {
    const { p, projects } = setup();
    sampleSession().write(projects);
    importInto(p).store.db.close();
    sampleSession({ id: "99999999-0000-4000-8000-000000000001" }).write(projects);
    const file = layout(p.dataDir).mirror;
    const store = openStore(p.dataDir);
    // The open went through; only now does writing fail (no journal can be made).
    chmodSync(path.dirname(file), 0o555);
    try {
      const before = statSync(file);
      const { result } = importInto(p, store);
      expect([store.readonly, store.memory]).toEqual([true, true]);
      expect(result.changed).toBe(1);
      expect(counts(store.db).sessions).toBe(2);
      const after = statSync(file);
      expect([after.size, after.mtimeMs]).toEqual([before.size, before.mtimeMs]);
    } finally {
      chmodSync(path.dirname(file), 0o700);
    }
  });

  test.skipIf(isRoot || process.platform === "win32")("R8: the in-memory copy is taken through SQLite, so another meme's unfinished write never shows in it", async () => {
    const { p, projects } = setup();
    for (let i = 0; i < 40; i++) sampleSession({ id: `${String(i).padStart(8, "0")}-0000-4000-8000-000000000001` }).write(projects);
    importInto(p).store.db.close();
    const file = layout(p.dataDir).mirror;
    const script = path.join(tempDir(), "writer.ts");
    writeFileSync(
      script,
      [
        `import { Database } from "bun:sqlite";`,
        `const db = new Database(${JSON.stringify(file)});`,
        `db.run("PRAGMA cache_size = 2"); db.run("BEGIN IMMEDIATE");`,
        `db.run("UPDATE records SET body = body || ?", ["x".repeat(3000)]); db.run("DELETE FROM sessions WHERE rowid % 2 = 0");`,
        `console.log("ready"); await Bun.sleep(1500); db.run("ROLLBACK");`,
      ].join("\n"),
    );
    const writer = Bun.spawn([process.execPath, script], { stdout: "pipe", cwd: ROOT_DIR });
    const reader = writer.stdout.getReader();
    let said = "";
    while (!said.includes("ready")) said += new TextDecoder().decode((await reader.read()).value);
    // This meme may not write the file; the other one, which opened it before, still can.
    chmodSync(file, 0o444);
    try {
      const store = openStore(p.dataDir);
      expect(store.memory).toBe(true);
      expect(store.db.query("PRAGMA integrity_check").all()).toEqual([{ integrity_check: "ok" }]);
      expect(counts(store.db).sessions).toBe(40);
    } finally {
      chmodSync(file, 0o600);
      await writer.exited;
    }
  });

  test("R7: several meme processes starting at once on a new data folder all get it", async () => {
    const home = tempDir();
    const dir = path.join(home, ".meme");
    const script = path.join(tempDir(), "open.ts");
    writeFileSync(
      script,
      [
        `import { openStore } from ${JSON.stringify(path.join(ROOT_DIR, "src/store/db.ts"))};`,
        `const at = Number(process.argv[2]); while (Date.now() < at) {}`,
        `try { const s = openStore(${JSON.stringify(dir)}); console.log("ok", s.memory); } catch (e) { console.log("FAIL", (e as Error).message); }`,
      ].join("\n"),
    );
    for (let round = 0; round < 3; round++) {
      const at = String(Date.now() + 400);
      const runs = [0, 1, 2, 3].map(() => Bun.spawn([process.execPath, script, at], { stdout: "pipe" }));
      const outs = await Promise.all(runs.map((r) => new Response(r.stdout).text()));
      expect(outs.map((o) => o.trim())).toEqual(["ok false", "ok false", "ok false", "ok false"]);
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("R7: a database from a newer meme is left alone; this one works in memory", () => {
    const { p, projects } = setup();
    sampleSession().write(projects);
    importInto(p).store.db.close();
    const file = layout(p.dataDir).mirror;
    const { Database } = require("bun:sqlite") as typeof import("bun:sqlite");
    const raw = new Database(file);
    raw.run("UPDATE meta SET value = ? WHERE key = 'schema_version'", [String(SCHEMA_VERSION + 1)]);
    raw.close();
    const before = readFileSync(file);
    const store = openStore(p.dataDir);
    expect([store.readonly, store.memory]).toEqual([true, true]);
    importInto(p, store);
    expect(counts(store.db).sessions).toBe(1);
    expect(readFileSync(file).equals(before)).toBe(true);
  });

  test("R16: the same folder reached by two paths (a symlinked ~/.claude) is read once", () => {
    const { p, projects } = setup();
    sampleSession().write(projects);
    const users = path.join(p.home, "users");
    const { symlinkSync, mkdirSync } = require("node:fs") as typeof import("node:fs");
    mkdirSync(path.join(users, "me"), { recursive: true });
    symlinkSync(path.join(p.home, ".claude"), path.join(users, "me", ".claude"));
    const wsl = { ...p, env: "wsl" as const, windowsUsersDir: users };
    expect(importInto(wsl).result.changed).toBe(1);
    expect(importInto(wsl).result.changed).toBe(0);
    expect(importInto(wsl).result.changed).toBe(0);
  });

  test("R30: a run with nothing new writes nothing to the database file", () => {
    const { p, projects } = setup();
    sampleSession().write(projects);
    importInto(p).store.db.close();
    const file = layout(p.dataDir).mirror;
    utimesSync(file, new Date(0), new Date(0));
    const { store } = importInto(p);
    store.db.close();
    expect(statSync(file).mtimeMs).toBe(0);
  });
});

describe("F10 (plan §6 ⑪): one session in two sources", () => {
  const ID = "33333333-0000-4000-8000-000000000003";
  function twoSides() {
    const { home, projects } = setup();
    const users = path.join(home, "users");
    const p = { ...testPlatform(home, "wsl", users) };
    const windows = path.join(users, "me", ".claude", "projects");
    return { p, projects, windows };
  }
  const row = (store: ReturnType<typeof importInto>["store"]) => allSessions(store.db).find((s) => s.id === ID)!;
  const sources = (store: ReturnType<typeof importInto>["store"]) =>
    store.db.query<{ source: string }, [string]>("SELECT source FROM files WHERE session = ? ORDER BY source").all(ID).map((r) => r.source.split(":")[1]);

  test("Claude Desktop's copy of a WSL session, in Windows' projects/ssh-<id>, is not read", () => {
    const { p, projects, windows } = twoSides();
    const wslFile = sampleSession({ id: ID, cwd: "/work/demo" }).write(projects);
    const copy = path.join(windows, `ssh-${ID}`, `${ID}.jsonl`);
    require("node:fs").mkdirSync(path.dirname(copy), { recursive: true });
    writeFileSync(copy, readFileSync(wslFile));
    const { store, result } = importInto(p);
    expect(result.changed).toBe(1);
    expect(row(store).env).toBe("wsl");
    expect(sources(store)).toEqual(["wsl"]);
    expect(importInto(p, store).result.changed).toBe(0);
  });

  test("the copy with the newest last record is shown, and no run converts either again until one changes", () => {
    const { p, projects, windows } = twoSides();
    const s = new ClaudeSession({ id: ID, cwd: "/work/demo" });
    s.user("one");
    s.assistant("a");
    const wslFile = s.write(projects);
    s.user("two");
    s.assistant("b");
    const winFile = s.write(windows);
    const { store } = importInto(p);
    expect([row(store).env, row(store).turns]).toEqual(["win", 2]);
    expect(row(store).size).toBe(statSync(winFile).size);
    expect(sources(store)).toEqual(["win", "wsl"]);
    for (let i = 0; i < 3; i++) expect(importInto(p, store).result.changed).toBe(0);
    // The WSL copy goes ahead: it is shown from then on.
    s.user("three");
    s.assistant("c");
    s.write(projects);
    importInto(p, store);
    expect([row(store).env, row(store).turns]).toEqual(["wsl", 3]);
    expect(importInto(p, store).result.changed).toBe(0);
    // The copy shown is deleted: the other one is shown again.
    rmSync(wslFile);
    importInto(p, store);
    expect([row(store).env, row(store).turns]).toEqual(["win", 2]);
    expect(sources(store)).toEqual(["win"]);
  });
});

describe("where the mirror is (plan-m2 F1)", () => {
  /** A data folder as 0.1.0 left it: the mirror in the folder itself, nothing in raw/. */
  function asLeftBy010(p: ReturnType<typeof setup>["p"]): string {
    const { mirror, oldMirror } = layout(p.dataDir);
    renameSync(mirror, oldMirror);
    rmSync(path.dirname(mirror), { recursive: true });
    return oldMirror;
  }

  test("the mirror is in raw/, in a folder only the user can open", () => {
    const { p, projects } = setup();
    sampleSession().write(projects);
    const { store } = importInto(p);
    expect(store.file).toBe(path.join(p.dataDir, "raw", "sessions.sqlite"));
    if (process.platform !== "win32") expect(statSync(path.dirname(store.file)).mode & 0o777).toBe(0o700);
  });

  test("coming from 0.1.0: the sessions are there after one run and the old mirror is gone", () => {
    const { p, projects } = setup();
    sampleSession().write(projects);
    importInto(p).store.db.close();
    const old = asLeftBy010(p);
    writeFileSync(old + "-journal", "left over");
    const { store, result } = importInto(p);
    expect(result.changed).toBe(1);
    expect(counts(store.db).sessions).toBe(1);
    expect([old, old + "-journal"].map((f) => existsSync(f))).toEqual([false, false]);
    expect(existsSync(layout(p.dataDir).mirror)).toBe(true);
  });

  test.skipIf(isRoot || process.platform === "win32")("coming from 0.1.0 where nothing can be written: the old mirror is read, and stays", () => {
    const { p, projects } = setup();
    sampleSession().write(projects);
    importInto(p).store.db.close();
    const old = asLeftBy010(p);
    chmodSync(p.dataDir, 0o555);
    try {
      const before = statSync(old);
      const store = openStore(p.dataDir);
      expect([store.readonly, store.memory]).toEqual([true, true]);
      // What 0.1.0 had mirrored is there without importing again.
      expect(counts(store.db).sessions).toBe(1);
      expect(importInto(p, store).result.changed).toBe(0);
      expect([statSync(old).size, statSync(old).mtimeMs]).toEqual([before.size, before.mtimeMs]);
      expect(existsSync(path.dirname(layout(p.dataDir).mirror))).toBe(false);
    } finally {
      chmodSync(p.dataDir, 0o755);
    }
  });
});
