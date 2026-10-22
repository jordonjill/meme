/** Conversion fixes of step 9 (plan §6 ⑨): what a session's records say, end to end through the mirror. */
import { describe, expect, test } from "bun:test";
import { utimesSync } from "node:fs";
import path from "node:path";
import { claudeCode } from "../../src/adapters/claude-code";
import { codex } from "../../src/adapters/codex";
import { messagesOf } from "../../src/handoff/chain";
import { projectResolver } from "../../src/model/project";
import { endingOf, groupTurns } from "../../src/model/turns";
import { nullLogger } from "../../src/platform/log";
import { openStore } from "../../src/store/db";
import { importAll } from "../../src/store/import";
import { getSession, sessionRecords, unknownTypes } from "../../src/store/queries";
import { ClaudeSession, resetIds } from "../fixtures/gen-claude";
import { CodexSession, writeIndex } from "../fixtures/gen-codex";
import { projectsDir, tempDir, testPlatform } from "../helpers";

const A = "a1a1a1a1-0000-4000-8000-000000000001";
const X = "c0dec0de-0000-7000-8000-00000000000a";

/** A home with these sessions, mirrored. `again` imports once more. */
function mirror(write: (home: string) => void) {
  resetIds();
  const home = tempDir();
  write(home);
  const p = testPlatform(home);
  const store = openStore(p.dataDir);
  const again = () => importAll(store, p, [claudeCode, codex], nullLogger);
  again();
  const records = (id: string) => sessionRecords(store.db, id);
  const unread = () => unknownTypes(store.db, "unread").map((u) => u.type);
  return { db: store.db, home, again, records, unread, messages: (id: string) => messagesOf(records(id)).map((m) => m.text) };
}

describe("Claude Code", () => {
  test("F25 (plan §6 ⑪): 2.1.304's logs of what it sent to the model are known, and skipped", () => {
    const m = mirror((home) => {
      const s = new ClaudeSession({ id: A });
      s.user("Hello");
      s.lines.push({ type: "api-request-shape", sessionId: A, shapeHash: "h1", timestamp: "2026-10-22T08:00:00.000Z", version: "2.1.304", shape: { system: "…" } });
      s.lines.push({ type: "api-request-blob", sessionId: A, hash: "b1", message: { role: "user", content: "Hello" } });
      s.lines.push({ type: "api-request", sessionId: A, id: "r1", timestamp: "2026-10-22T08:00:01.000Z", version: "2.1.304", shapeHash: "h1", base: [] });
      s.assistant("Hi.");
      s.write(projectsDir(home));
    });
    expect(m.messages(A)).toEqual(["Hello"]);
    expect(unknownTypes(m.db, "unknown")).toEqual([]);
    expect(m.unread()).toEqual([]);
  });

  test("R1: a message the user sent while Claude Code worked is one of the user's messages, in its place", () => {
    const m = mirror((home) => {
      const s = new ClaudeSession({ id: A });
      s.user("Refactor the importer");
      s.tool("Bash", { command: "bun test" }, "ok");
      s.queued("Also keep the old --dry-run flag working");
      s.assistant("Done; --dry-run still works.");
      s.queued("<task-notification>a background task finished</task-notification>", "task-notification");
      s.queued("a message from another session", "peer");
      s.write(projectsDir(home));
    });
    expect(m.messages(A)).toEqual(["Refactor the importer", "Also keep the old --dry-run flag working"]);
    expect(groupTurns(m.records(A)).turns.map((t) => t.n)).toEqual([1, 2]);
    expect(m.unread()).toEqual([]);
  });

  test("R1: a queued message from an origin meme does not know is reported by the alarm", () => {
    const m = mirror((home) => {
      const s = new ClaudeSession({ id: A });
      s.user("Start");
      s.queued("who sent this?", "robot");
      s.assistant("Started.");
      s.write(projectsDir(home));
    });
    expect(m.unread()).toEqual(["attachment"]);
  });

  test("R1: before 2.1.296 there was no origin: a notice is not a message, what the user typed is", () => {
    const m = mirror((home) => {
      const s = new ClaudeSession({ id: A, version: "2.1.278" });
      s.user("Start");
      s.queued("<task-notification>\n<task-id>t1</task-id>\n<summary>done</summary>\n</task-notification>", null);
      s.queued("and use tabs, not spaces", null);
      s.assistant("Started.");
      s.write(projectsDir(home));
    });
    expect(m.messages(A)).toEqual(["Start", "and use tabs, not spaces"]);
    expect(m.unread()).toEqual([]);
  });

  test("R12: a prompt the user rewound and everything under it are neither turns nor edited files", () => {
    const m = mirror((home) => {
      const s = new ClaudeSession({ id: A });
      s.user("Set up the project");
      const before = s.assistant("Set up.");
      s.user("Rename everything to camelCase");
      s.tool("Edit", { file_path: "/work/demo/src/x.ts", old_string: "a_b", new_string: "aB" }, "ok");
      s.assistant("Renamed everything.");
      s.user("Rename only the public API", { parentUuid: before });
      s.assistant("Renamed the public API.");
      s.write(projectsDir(home));
    });
    expect(m.messages(A)).toEqual(["Set up the project", "Rename only the public API"]);
    const turns = groupTurns(m.records(A)).turns;
    expect(turns.length).toBe(2);
    expect(turns.flatMap((t) => t.edited)).toEqual([]);
    expect(m.unread()).toEqual([]);
  });

  test("R12: a draft rewritten before the AI answered (46083e3d) is left out too", () => {
    const m = mirror((home) => {
      const s = new ClaudeSession({ id: A });
      s.user("First point");
      const before = s.assistant("Done with the first point.");
      s.user("Second point: < 70% switch");
      s.user("Second point: list what people like about Cindy", { parentUuid: before });
      s.assistant("Looking into it.");
      s.write(projectsDir(home));
    });
    expect(m.messages(A)).toEqual(["First point", "Second point: list what people like about Cindy"]);
  });

  test("R13: a session with only `!` commands keeps them", () => {
    const m = mirror((home) => {
      const s = new ClaudeSession({ id: A });
      s.bash("git status", "nothing to commit");
      s.write(projectsDir(home));
    });
    expect(m.records(A).length).toBeGreaterThan(0);
    expect(groupTurns(m.records(A)).turns.length).toBe(1);
    expect(m.unread()).toEqual([]);
  });
});

describe("Codex", () => {
  test("R11: <turn_aborted> marks the turn interrupted; it is not a message and starts no turn", () => {
    const m = mirror((home) => {
      const s = new CodexSession({ id: X });
      s.environment();
      s.user("Port the tests to vitest");
      s.command("ls test", "a.test.js");
      s.aborted();
      s.user("Just the parser tests");
      s.assistant("Ported the parser tests.");
      s.write(path.join(home, ".codex"));
    });
    expect(m.messages(X)).toEqual(["Port the tests to vitest", "Just the parser tests"]);
    const turns = groupTurns(m.records(X)).turns;
    expect(turns.map((t) => [t.n, t.interrupted])).toEqual([
      [1, true],
      [2, false],
    ]);
  });

  test("R13: a session where the user only ran `! meme continue` has its records and no false alarm", () => {
    const m = mirror((home) => {
      const s = new CodexSession({ id: X });
      s.environment();
      s.shell("meme continue 1", "# Handoff: earlier work\nSource: Claude·Linux · session aaaa1111");
      s.write(path.join(home, ".codex"));
    });
    expect(m.records(X).some((r) => r.body.role === "user")).toBe(true);
    expect(m.unread()).toEqual([]);
  });

  test("R26: a session ending with a `!` command finished", () => {
    const m = mirror((home) => {
      const s = new CodexSession({ id: X });
      s.environment();
      s.user("Fix the parser");
      s.assistant("Fixed.");
      s.shell("meme continue 2", "# Handoff: other work");
      s.write(path.join(home, ".codex"));
    });
    expect(endingOf(m.records(X))).toBe("finished");
  });

  test("R18: renaming a session in Codex shows at once, without a new message", () => {
    const m = mirror((home) => {
      const s = new CodexSession({ id: X });
      s.environment();
      s.user("Fix the parser");
      s.assistant("Fixed.");
      s.write(path.join(home, ".codex"));
      writeIndex(path.join(home, ".codex"), [[X, "old name"]]);
    });
    expect(getSession(m.db, X)!.title).toBe("old name");
    const index = path.join(m.home, ".codex", "session_index.jsonl");
    writeIndex(path.join(m.home, ".codex"), [[X, "new name"]]);
    utimesSync(index, new Date(), new Date(Date.now() + 5000));
    m.again();
    expect(getSession(m.db, X)!.title).toBe("new name");
  });
});

describe("projects", () => {
  test("R28: a start directory that is not absolute here is kept as written, not resolved against meme's own directory", () => {
    const resolve = projectResolver(testPlatform("/nohome", "linux"));
    expect(resolve("\\\\wsl.localhost\\Ubuntu\\home\\u\\app")).toBe("\\\\wsl.localhost\\Ubuntu\\home\\u\\app");
    expect(resolve("relative/dir")).toBe("relative/dir");
  });
});
