import { describe, expect, test } from "bun:test";
import { utimesSync } from "node:fs";
import path from "node:path";
import { contextText } from "../../src/memory/context";
import { branchOf, taskLines, unfinished } from "../../src/memory/tasks";
import { ClaudeSession, resetIds } from "../fixtures/gen-claude";
import { importInto, projectsDir, tempDir, testPlatform } from "../helpers";
import { mkdirSync, writeFileSync } from "node:fs";

const HOUR = 60 * 60 * 1000;
const NOW = Date.parse("2026-11-17T12:00:00.000Z");
const ago = (ms: number) => new Date(NOW - ms).toISOString();
const id = (n: number) => `${String(n).repeat(8)}-0000-4000-8000-000000000001`;

interface Made {
  n: number;
  cwd?: string;
  start?: string;
  branch?: string;
  build?: (s: ClaudeSession) => void;
  /** When its file was last written; by default when the session ended. */
  touched?: number;
}

/** Stopped by the user in the middle of a step. */
const interrupted = (s: ClaudeSession) => {
  s.user("给登录接口加限流");
  s.call("Bash", { command: "ls" });
  s.interrupt(true);
};
const finished = (s: ClaudeSession) => {
  s.user("改一下 README");
  s.assistant("改好了。");
};

function setup(sessions: Made[]) {
  resetIds();
  const home = tempDir();
  const p = testPlatform(home);
  const here = path.join(home, "work", "tool");
  for (const m of sessions) {
    const start = m.start ?? ago(5 * HOUR);
    const s = new ClaudeSession({ id: id(m.n), cwd: m.cwd ?? here, start, branch: m.branch });
    (m.build ?? interrupted)(s);
    const file = s.write(projectsDir(home));
    const when = (m.touched ?? Date.parse(start) + 60_000) / 1000;
    utimesSync(file, when, when);
  }
  const { store } = importInto(p);
  const tasks = (over: Partial<Parameters<typeof unfinished>[2]> = {}) => unfinished(store.db, here, { now: NOW, current: new Set(), ...over }).map((t) => [t.session.id, t.ending]);
  return { home, here, db: store.db, tasks };
}

describe("unfinished tasks (plan-m2 F6)", () => {
  test("a session of this project that was stopped, or left in the middle of a step, is a task; a finished one is not", () => {
    const t = setup([
      { n: 1 },
      { n: 2, build: finished },
      {
        n: 3,
        build: (s) => {
          s.user("跑一下测试");
          s.call("Bash", { command: "bun test" });
        },
        start: ago(6 * HOUR),
      },
    ]);
    expect(t.tasks()).toEqual([
      [id(1), "interrupted"],
      [id(3), "unfinished"],
    ]);
  });

  test("not another project's, not one older than a week, not the one that is asking", () => {
    const t = setup([{ n: 1 }, { n: 2, cwd: path.join(tempDir(), "other") }, { n: 3, start: ago(8 * 24 * HOUR) }]);
    expect(t.tasks()).toEqual([[id(1), "interrupted"]]);
    expect(t.tasks({ current: new Set([id(1)]) })).toEqual([]);
  });

  test("not one that may still be running in another window", () => {
    const t = setup([{ n: 1, touched: NOW - 60_000 }]);
    expect(t.tasks()).toEqual([]);
  });

  test("on a known branch, only that branch's sessions", () => {
    const t = setup([{ n: 1, branch: "main" }, { n: 2, branch: "feature", start: ago(6 * HOUR) }]);
    expect(t.tasks({ branch: "feature" })).toEqual([[id(2), "interrupted"]]);
    expect(t.tasks({ branch: null }).length).toBe(2);
  });

  test("at most three, the latest first", () => {
    const t = setup([1, 2, 3, 4, 5].map((n) => ({ n, start: ago((n + 3) * HOUR) })));
    expect(t.tasks().map(([s]) => s)).toEqual([id(1), id(2), id(3)]);
  });

  test("a task is a line that says what it was, how it ended, and how to take it up; it is given even when memory is empty", () => {
    const t = setup([{ n: 1 }]);
    const lines = taskLines(unfinished(t.db, t.here, { now: NOW, current: new Set() }));
    expect(lines).toEqual([`- ${ago(5 * HOUR).slice(0, 10)}, Claude Code, branch main: "给登录接口加限流", stopped by the user. To take it up: meme continue 11111111`]);
    expect(contextText({ sections: [], left: 0 }, lines)).toEndWith(`\n\nUnfinished here\n${lines[0]}\n`);
    expect(contextText({ sections: [], left: 0 })).toBe("");
  });

  test("the branch checked out is read from the repository's head", () => {
    const dir = tempDir();
    expect(branchOf(dir)).toBeNull();
    mkdirSync(path.join(dir, ".git"));
    writeFileSync(path.join(dir, ".git", "HEAD"), "ref: refs/heads/feature/x\n");
    expect(branchOf(dir)).toBe("feature/x");
    writeFileSync(path.join(dir, ".git", "HEAD"), "4478b4d0000000000000000000000000000000ab\n");
    expect(branchOf(dir)).toBeNull();
  });
});
