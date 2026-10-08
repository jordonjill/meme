import { describe, expect, test } from "bun:test";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { findProject, projectResolver } from "../../src/model/project";
import { userKind } from "../../src/model/injected";
import type { Rec } from "../../src/model/record";
import { callSummary, editedFile, parseArgs } from "../../src/model/tools";
import { assignTurns, endingOf, groupTurns, mayBeRunning } from "../../src/model/turns";
import { tempDir, testPlatform } from "../helpers";

describe("userKind (plan §4.6.3)", () => {
  test("isMeta and isCompactSummary are injected", () => {
    expect(userKind("anything", { isMeta: true })).toBe("injected");
    expect(userKind("This session is being continued…", { isCompactSummary: true })).toBe("injected");
  });
  test("a message that is only system reminders is injected", () => {
    expect(userKind("<system-reminder>a</system-reminder>\n<system-reminder>b</system-reminder>")).toBe("injected");
    expect(userKind("question <system-reminder>a</system-reminder>")).toBe("prompt");
  });
  test("task notifications and command caveats are injected", () => {
    expect(userKind("<task-notification>\n<task-id>1</task-id>")).toBe("injected");
    expect(userKind("<local-command-caveat>Caveat</local-command-caveat>")).toBe("injected");
  });
  test("interrupt markers and command output are neither prompts nor injected", () => {
    expect(userKind("[Request interrupted by user]")).toBe("interrupt");
    expect(userKind("[Request interrupted by user for tool use]")).toBe("interrupt");
    expect(userKind("<bash-stdout>ok</bash-stdout>")).toBe("output");
    expect(userKind("<local-command-stdout>x</local-command-stdout>")).toBe("output");
  });
  test("everything else is a prompt", () => {
    expect(userKind("接力")).toBe("prompt");
    expect(userKind("/model")).toBe("prompt");
    expect(userKind("<bash-input>ls</bash-input>")).toBe("prompt");
  });
});

test("assignTurns counts prompts only", () => {
  expect(assignTurns([null, "prompt", null, "injected", "prompt", "interrupt", null, "prompt"])).toEqual([0, 1, 1, 1, 2, 2, 2, 3]);
});

const rec = (seq: number, turn: number, body: Rec["body"], injected = false): Rec => ({
  seq, uid: `u${seq}`, part: 0, turn, injected, copied: false, role: body.role, ts: null, body,
});
const ts = "2026-01-01T00:00:00.000Z";

describe("turn summaries and endings", () => {
  const records: Rec[] = [
    rec(0, 0, { role: "meta", source: "claude-code" }),
    rec(1, 1, { role: "user", content: "fix it", timestamp: ts }),
    rec(2, 1, { role: "assistant", content: null, tool_calls: [{ id: "c1", name: "Bash", args: '{"command":"npm test"}' }], timestamp: ts }),
    rec(3, 1, { role: "tool", tool_call_id: "c1", content: "fail", ok: false, timestamp: ts }),
    rec(4, 1, { role: "assistant", content: null, tool_calls: [{ id: "c2", name: "Edit", args: '{"file_path":"/a.ts"}' }], timestamp: ts }),
    rec(5, 1, { role: "tool", tool_call_id: "c2", content: "ok", timestamp: ts }),
    rec(6, 1, { role: "assistant", content: "Fixed.", timestamp: ts }),
  ];

  test("steps, commands, edited files, failures, reply", () => {
    const { turns } = groupTurns(records);
    expect(turns).toHaveLength(1);
    const t = turns[0]!;
    expect([t.steps, t.commands, t.failed, t.edited, t.reply, t.interrupted]).toEqual([2, 1, 1, ["/a.ts"], "Fixed.", false]);
  });

  test("finished, interrupted, unfinished", () => {
    expect(endingOf(records)).toBe("finished");
    expect(endingOf(records.slice(0, 4))).toBe("unfinished");
    expect(endingOf(records.slice(0, 3))).toBe("unfinished");
    expect(endingOf([...records.slice(0, 3), rec(9, 1, { role: "user", content: "[Request interrupted by user for tool use]", timestamp: ts })])).toBe("interrupted");
    expect(endingOf([...records, rec(9, 2, { role: "user", content: "/exit", timestamp: ts })])).toBe("finished");
    expect(endingOf([...records, rec(9, 2, { role: "user", content: "and then?", timestamp: ts })])).toBe("unfinished");
    // Injected records at the end do not count.
    expect(endingOf([...records, rec(9, 1, { role: "user", content: "<system-reminder>x</system-reminder>", timestamp: ts }, true)])).toBe("finished");
  });

  test("a recently written file may still be running", () => {
    expect(mayBeRunning(Date.now() - 60_000)).toBe(true);
    expect(mayBeRunning(Date.now() - 3_600_000)).toBe(false);
    expect(mayBeRunning(null)).toBe(false);
  });
});

describe("tools", () => {
  test("one-line summaries pick the argument that matters", () => {
    expect(callSummary({ id: "1", name: "Bash", args: { command: "git  status\n--short", description: "x" } })).toBe("git status --short");
    expect(callSummary({ id: "1", name: "Read", args: { file_path: "/a/b.ts", limit: 5 } })).toBe("/a/b.ts");
    expect(callSummary({ id: "1", name: "X", args: { n: 1 } })).toBe('{"n":1}');
  });
  test("edited files come from editing tools only", () => {
    expect(editedFile({ id: "1", name: "Write", args: { file_path: "/x" } })).toBe("/x");
    expect(editedFile({ id: "1", name: "Bash", args: { command: "sed -i x /y" } })).toBeNull();
    expect(parseArgs("not json")).toEqual({ value: "not json" });
  });
});

describe("project (plan §4.6.9)", () => {
  test("the git repository root above the start directory", () => {
    const root = tempDir();
    mkdirSync(path.join(root, "repo", ".git"), { recursive: true });
    mkdirSync(path.join(root, "repo", "src", "deep"), { recursive: true });
    expect(findProject(path.join(root, "repo", "src", "deep"))).toBe(path.join(root, "repo"));
  });

  test("a worktree belongs to its main repository; a submodule is its own project", () => {
    const root = tempDir();
    mkdirSync(path.join(root, "main", ".git", "worktrees", "wt"), { recursive: true });
    mkdirSync(path.join(root, "wt"));
    writeFileSync(path.join(root, "wt", ".git"), `gitdir: ${path.join(root, "main", ".git", "worktrees", "wt")}\n`);
    expect(findProject(path.join(root, "wt"))).toBe(path.join(root, "main"));
    mkdirSync(path.join(root, "main", "sub"));
    writeFileSync(path.join(root, "main", "sub", ".git"), "gitdir: ../.git/modules/sub\n");
    expect(findProject(path.join(root, "main", "sub"))).toBe(path.join(root, "main", "sub"));
  });

  test("without git, the start directory itself", () => {
    const root = tempDir();
    mkdirSync(path.join(root, "plain"));
    expect(findProject(path.join(root, "plain"))).toBe(path.join(root, "plain"));
  });

  test("in WSL, Windows paths are read through /mnt", () => {
    const resolve = projectResolver(testPlatform("/home/u", "wsl"));
    expect(resolve("C:\\Users\\me\\nowhere-meme-test")).toBe("/mnt/c/Users/me/nowhere-meme-test");
    expect(resolve(null)).toBeNull();
  });
});
