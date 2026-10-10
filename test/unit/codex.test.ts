import { describe, expect, test } from "bun:test";
import path from "node:path";
import { codex } from "../../src/adapters/codex";
import { currentSessions } from "../../src/cli/context";
import { CODEX_BYTES, LIMITS, weight } from "../../src/handoff/budget";
import { contentOf } from "../../src/model/record";
import { codeModeCommands, commandOf, describeCall, editedFiles, patchFiles, resultFailed, resultText } from "../../src/model/tools";
import { makeStyle } from "../../src/render/labels";
import { buildShow, showText } from "../../src/render/show";
import { nullLogger } from "../../src/platform/log";
import { openStore } from "../../src/store/db";
import { importAll } from "../../src/store/import";
import { allSessions, getSession, sessionRecords } from "../../src/store/queries";
import { resetIds } from "../fixtures/gen-claude";
import { CodexSession, sampleCodex, writeIndex } from "../fixtures/gen-codex";
import { tempDir, testPlatform } from "../helpers";

const NOW = Date.parse("2026-10-11T12:00:00.000Z");
const plain = makeStyle(false);
const showOpts = { st: plain, width: 120, home: "/home/u", now: NOW, full: false, all: false, wrap: false };

function codexWorld() {
  resetIds();
  const home = tempDir();
  const p = testPlatform(home);
  const codexHome = path.join(home, ".codex");
  const store = openStore(p.dataDir);
  const sync = () => importAll(store, p, [codex], nullLogger);
  return { home, p, codexHome, store, sync };
}

describe("codex adapter", () => {
  test("a session: title from the first prompt, injected context left out, steps read as commands and patches", () => {
    const w = codexWorld();
    const s = sampleCodex({ id: "c0dec0de-0000-4000-8000-000000000001" });
    s.write(w.codexHome);
    w.sync();
    const row = getSession(w.store.db, s.id)!;
    expect([row.agent, row.env, row.title, row.branch, row.turns]).toEqual(["codex", "linux", "Make add() take any number of arguments and run the tests.", "master", 2]);
    const users = sessionRecords(w.store.db, s.id).filter((r) => r.role === "user").map((r) => contentOf(r.body));
    expect(users).toEqual(["Make add() take any number of arguments and run the tests.", "Now add subtract(a, b) in subtract.js with a test."]);
    const out = showText(buildShow(w.store.db, row), showOpts, 1);
    expect(out).toContain("⏺ exec_command  sed -n '1,40p' add.js\n");
    expect(out).toContain("⏺ apply_patch  /work/codex-demo/add.js, /work/codex-demo/test.js\n");
    // Codex's "Script completed / Wall time / Output:" header is not shown.
    expect(out).toContain("⎿ function add(a, b) {\n");
    expect(out).not.toContain("Script completed");
    expect(showText(buildShow(w.store.db, row), showOpts, "none")).toContain("▸ 3 steps · 2 commands · edited 2 files");
  });

  test("a renamed session takes its name from session_index.jsonl", () => {
    const w = codexWorld();
    const s = sampleCodex({ id: "c0dec0de-0000-4000-8000-000000000002" });
    s.write(w.codexHome);
    writeIndex(w.codexHome, [[s.id, "old name"], [s.id, "lab session"]]);
    w.sync();
    expect(getSession(w.store.db, s.id)!.title).toBe("lab session");
  });

  test("a rollback: the session is the first file up to the edit, then the new file", () => {
    const w = codexWorld();
    const first = new CodexSession({ id: "c0dec0de-0000-4000-8000-000000000003" });
    first.user("turn one");
    first.assistant("answer one");
    const turnTwo = first.user("turn two, later edited");
    first.assistant("answer two");
    const second = new CodexSession({ rollbackOf: { file: first, cutLine: turnTwo }, start: "2026-10-10T07:04:18.000Z" });
    second.user("turn two, as edited");
    second.assistant("answer to the edit");
    first.write(w.codexHome);
    second.write(w.codexHome);
    w.sync();
    const row = getSession(w.store.db, first.id)!;
    const users = sessionRecords(w.store.db, row.id).filter((r) => r.role === "user").map((r) => contentOf(r.body));
    expect(users).toEqual(["turn one", "turn two, as edited"]);
    expect(row.turns).toBe(2);
    // Both files belong to the session; uids of the two files do not collide.
    expect(w.store.db.query("SELECT COUNT(*) AS n FROM files WHERE session = ?").get(row.id)).toEqual({ n: 2 });
    const uids = sessionRecords(w.store.db, row.id).map((r) => r.uid).filter(Boolean);
    expect(new Set(uids).size).toBe(uids.length);
  });

  test("a fork: the parent's records up to the fork point, then its own; named after its own first message", () => {
    const w = codexWorld();
    const parent = new CodexSession({ id: "019dc1a2-5b2c-7e01-9a3f-1c2d3e4f5a6b" });
    parent.user("parent turn one");
    parent.assistant("parent answer one");
    const cut = parent.lines.length;
    parent.user("parent turn two, after the fork");
    parent.assistant("parent answer two");
    const fork = new CodexSession({ id: "019dc1a2-7d10-7c44-8b1e-2f3a4b5c6d7e", forkOf: { parent, cutLine: cut }, start: "2026-10-10T06:55:48.000Z" });
    fork.user("fork turn");
    fork.assistant("fork answer");
    parent.write(w.codexHome);
    fork.write(w.codexHome);
    w.sync();
    const row = getSession(w.store.db, fork.id)!;
    expect([row.title, row.forked_from, row.turns]).toEqual(["fork turn", parent.id, 2]);
    const recs = sessionRecords(w.store.db, fork.id).filter((r) => r.role !== "meta");
    expect(recs.map((r) => [contentOf(r.body), r.copied])).toEqual([
      ["parent turn one", true],
      ["parent answer one", true],
      ["fork turn", false],
      ["fork answer", false],
    ]);
    const out = showText(buildShow(w.store.db, row), showOpts, "none");
    // Made within a minute of each other, the two ids share their first 8 characters.
    expect(out).toContain("parent answer one\n  ── forked from 019dc1a2-5 ──\n  2 ❯ fork turn\n");
    expect(out).toContain("Run `meme show 019dc1a2-7 <turn>` to expand a turn");
    // Both are listed: a fork is a branch, not a continuation.
    expect(allSessions(w.store.db).filter((r) => r.superseded === 0).length).toBe(2);
  });

  test("archived sessions are listed and marked; moving a file to archived_sessions is not a delete", () => {
    const w = codexWorld();
    const s = sampleCodex({ id: "c0dec0de-0000-4000-8000-000000000006" });
    const live = s.write(w.codexHome);
    w.sync();
    require("node:fs").rmSync(live);
    s.write(w.codexHome, { archived: true });
    const r = w.sync();
    expect(r.deleted).toBe(0);
    expect(getSession(w.store.db, s.id)!.archived).toBe(1);
    expect(showText(buildShow(w.store.db, getSession(w.store.db, s.id)!), showOpts, "none").split("\n")[1]).toEndWith(" · archived");
  });

  test(".zst files are read; a plain copy beside one wins", () => {
    const w = codexWorld();
    const s = sampleCodex({ id: "c0dec0de-0000-4000-8000-000000000007" });
    s.write(w.codexHome, { zst: true });
    w.sync();
    expect(getSession(w.store.db, s.id)!.turns).toBe(2);
    s.write(w.codexHome);
    expect(codex.listFiles({ id: "x", agent: "codex", env: "linux", path: w.codexHome }).map((f) => path.basename(f))).toEqual([s.fileName()]);
  });

  test("a `!` command is a prompt shown as `! cmd`, with its output", () => {
    const w = codexWorld();
    const s = new CodexSession({ id: "c0dec0de-0000-4000-8000-000000000008" });
    s.shell("git status --short", " M add.js");
    s.user("what changed?");
    s.assistant("add.js changed.");
    s.write(w.codexHome);
    w.sync();
    const row = getSession(w.store.db, s.id)!;
    expect(row.title).toBe("what changed?");
    const out = showText(buildShow(w.store.db, row), showOpts, 1);
    expect(out).toContain("  1 ❯ ! git status --short\n      ⎿  M add.js\n");
  });

  test("Codex's housekeeping lines do not count as activity", () => {
    const w = codexWorld();
    const s = sampleCodex({ id: "c0dec0de-0000-4000-8000-000000000009" });
    s.settingsApplied("2026-10-11T11:59:00.000Z");
    s.write(w.codexHome);
    w.sync();
    expect(getSession(w.store.db, s.id)!.ended_at!.startsWith("2026-10-10")).toBe(true);
  });
});

describe("codex tool calls", () => {
  const script = `const r = await tools.exec_command({cmd:"npm test -- --run","shell":"bash","max_output_tokens":2000}); text(r.output);\nconst q = await tools.exec_command({cmd:'git status'});`;
  test("commands and patched files come out of code-mode scripts", () => {
    expect(codeModeCommands(script)).toEqual(["npm test -- --run", "git status"]);
    expect(commandOf({ id: "1", name: "exec", args: { input: script } })).toBe("npm test -- --run ; git status");
    const patch = `const p = "*** Begin Patch\\n*** Add File: /w/a.js\\n+x\\n*** Update File: /w/b.js\\n@@\\n*** End Patch\\n";`;
    expect(editedFiles({ id: "1", name: "exec", args: { input: patch } })).toEqual(["/w/a.js", "/w/b.js"]);
    expect(describeCall({ id: "1", name: "exec", args: { input: patch } })).toEqual({ name: "apply_patch", summary: "/w/a.js, /w/b.js" });
    expect(patchFiles("*** Begin Patch\n*** Delete File: c.txt\n*** End Patch")).toEqual(["c.txt"]);
  });
  test("older Codex tools: shell arrays, exec_command, apply_patch", () => {
    expect(commandOf({ id: "1", name: "shell", args: { command: ["bash", "-lc", "cargo test"] } })).toBe("cargo test");
    expect(commandOf({ id: "1", name: "exec_command", args: { cmd: "go test ./..." } })).toBe("go test ./...");
    expect(editedFiles({ id: "1", name: "apply_patch", args: { input: "*** Begin Patch\n*** Update File: x.go\n" } })).toEqual(["x.go"]);
  });
  test("result headers and failures", () => {
    expect(resultText("Script completed\nWall time 0.1 seconds\nOutput:\n\nok\n")).toBe("ok\n");
    expect(resultText("Chunk ID: 1\nWall time: 0.2 seconds\nProcess exited with code 1\nOutput:\nboom")).toBe("boom");
    expect(resultFailed(undefined, "Process exited with code 1\nOutput:\nboom")).toBe(true);
    expect(resultFailed(undefined, "Exit code 2\nerror")).toBe(true);
    expect(resultFailed(undefined, "Script completed\nOutput:\nok")).toBe(false);
  });
});

describe("running inside Codex", () => {
  test("both agents' session ids are left out when both are set", () => {
    expect([...currentSessions({ CODEX_THREAD_ID: "C0DE", CLAUDE_CODE_SESSION_ID: "abcd" })].sort()).toEqual(["abcd", "c0de"]);
    expect(currentSessions({}).size).toBe(0);
  });
  test("the byte cap weighs Chinese text by its UTF-8 size", () => {
    const zh = "接".repeat(1000); // 3,000 bytes
    expect(weight(zh, LIMITS)).toBe(Math.ceil((1000 * 25_000) / 15_000));
    expect(weight(zh, { ...LIMITS, bytes: CODEX_BYTES })).toBe(Math.ceil((3000 * 25_000) / CODEX_BYTES));
  });
});
