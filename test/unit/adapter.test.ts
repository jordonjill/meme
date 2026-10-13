import { describe, expect, test } from "bun:test";
import { claudeCode } from "../../src/adapters/claude-code";
import { dropPartialLine } from "../../src/adapters/read";
import { contentOf } from "../../src/model/record";
import { ClaudeSession, resetIds, sampleSession } from "../fixtures/gen-claude";
import { convert, tempDir } from "../helpers";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

describe("claude-code adapter", () => {
  test("every record keeps the uuid of its source line (plan §4.6.2)", () => {
    resetIds();
    const s = sampleSession();
    const raw = new Set(s.lines.map((l) => l.uuid).filter(Boolean));
    const { records } = convert(s.text(), s.id);
    const nonMeta = records.filter((r) => r.role !== "meta");
    expect(nonMeta.length).toBeGreaterThan(10);
    for (const r of nonMeta) expect(raw.has(r.uid!)).toBe(true);
    // (uid, part) is unique: one source line can give several records.
    const keys = new Set(nonMeta.map((r) => `${r.uid}#${r.part}`));
    expect(keys.size).toBe(nonMeta.length);
  });

  test("turns start at real prompts; commands count, injected and interrupts do not", () => {
    resetIds();
    const s = sampleSession();
    const { records } = convert(s.text(), s.id);
    const prompts = records.filter((r) => r.role === "user" && !r.injected && r.turn > 0 && records.find((x) => x.turn === r.turn) === r);
    expect(prompts.map((r) => contentOf(r.body))).toEqual([
      "/statusline",
      "状态栏现在显示哪些内容？接力",
      "Make it colorful, use secure_delete style names",
      "好的，换成彩色",
      "/model",
    ]);
    expect(Math.max(...records.map((r) => r.turn))).toBe(5);
    // The expanded /statusline prompt and the reminder are injected.
    const injected = records.filter((r) => r.injected).map((r) => contentOf(r.body));
    expect(injected).toEqual(["Set up the status line to match the shell prompt.", "<system-reminder>\nThe date is 2026-09-30.\n</system-reminder>"]);
    // The interrupt stays in turn 3.
    const interrupt = records.find((r) => contentOf(r.body)?.startsWith("[Request interrupted"));
    expect(interrupt?.turn).toBe(3);
  });

  test("the meta record comes first and is turn 0", () => {
    resetIds();
    const s = sampleSession();
    const { records } = convert(s.text(), s.id);
    expect(records[0]!.role).toBe("meta");
    expect(records[0]!.turn).toBe(0);
    expect(records[0]!.uid).toBeNull();
  });

  test("session fields: title, branch, times, project", () => {
    resetIds();
    const s = sampleSession({ cwd: "/nowhere/proj", branch: "feature" });
    const { session } = convert(s.text(), s.id);
    expect(session.title).toBe("Status line setup");
    expect(session.branch).toBe("feature");
    expect(session.startedAt).toBe("2026-09-30T09:08:00.000Z");
    expect(session.endedAt! > session.startedAt!).toBe(true);
    expect(session.project).toBe("/nowhere/proj");
    expect(session.continuedIn).toBeNull();
  });

  test("title order: custom title, then AI title, then first real prompt", () => {
    resetIds();
    const s = new ClaudeSession();
    s.localCommand("clear", "", "user");
    s.user("  \n  fix the   login bug\nmore detail");
    s.assistant("ok");
    expect(convert(s.text(), s.id).session.title).toBe("fix the login bug");
    s.aiTitle("Login bug");
    expect(convert(s.text(), s.id).session.title).toBe("Login bug");
    s.customTitle("my title");
    s.aiTitle("Later AI title");
    expect(convert(s.text(), s.id).session.title).toBe("my title");
  });

  test("local commands are recovered in both the user and system forms", () => {
    resetIds();
    const s = new ClaudeSession();
    s.localCommand("model", "Kept model", "user");
    s.user("hello");
    s.assistant("hi");
    s.localCommand("add-dir", "Added", "system", "/tmp/x");
    const { records } = convert(s.text(), s.id);
    const users = records.filter((r) => r.role === "user").map((r) => [contentOf(r.body), r.turn]);
    expect(users).toEqual([
      ["/model", 1],
      ["hello", 2],
      ["/add-dir /tmp/x", 3],
    ]);
  });

  test("a session with only a local command has no conversation, but is not an error", () => {
    resetIds();
    const s = new ClaudeSession();
    s.localCommand("model", "Kept model");
    const { records } = convert(s.text(), s.id);
    // Read as a partial transcript (plan §6 ⑨, R13): its meta record, with the start directory, is kept.
    expect(records.filter((r) => r.role !== "meta").map((r) => contentOf(r.body))).toEqual(["/model"]);
    expect(records.some((r) => r.role === "meta")).toBe(true);
  });

  test("continued-in links to the next session", () => {
    resetIds();
    const a = sampleSession();
    const b = new ClaudeSession();
    a.resumeInto(b);
    b.user("next question");
    b.assistant("next answer");
    expect(convert(a.text(), a.id).session.continuedIn).toBe(b.id);
    const conv = convert(b.text(), b.id);
    expect(conv.session.continuedIn).toBeNull();
    // B starts with A's conversation, so the turns carry on: A's 4 turns that are
    // user/assistant lines (its system-form /model is not copied), then B's own.
    expect(Math.max(...conv.records.map((r) => r.turn))).toBe(5);
  });

  test("! shell input is a prompt, its output is not", () => {
    resetIds();
    const s = new ClaudeSession();
    s.bash("git status", "clean");
    s.user("what now");
    s.assistant("done");
    const { records } = convert(s.text(), s.id);
    expect(records.filter((r) => r.role === "user").map((r) => r.turn)).toEqual([1, 1, 2]);
  });

  test("sidechain lines are left out", () => {
    resetIds();
    const s = sampleSession();
    s.user("side question", { isSidechain: true });
    const { records } = convert(s.text(), s.id);
    expect(records.some((r) => contentOf(r.body) === "side question")).toBe(false);
  });

  test("a half-written last line is dropped until it is complete", () => {
    expect(dropPartialLine('{"a":1}\n{"b":')).toBe('{"a":1}\n');
    expect(dropPartialLine('{"a":1}\n{"b":2}')).toBe('{"a":1}\n{"b":2}');
    expect(dropPartialLine('{"a":1}\n')).toBe('{"a":1}\n');
    expect(dropPartialLine('{"a"')).toBe("");
  });

  test("lists only <project>/<uuid>.jsonl, not subagent files", () => {
    resetIds();
    const root = tempDir();
    const s = sampleSession();
    const file = s.write(root);
    const sub = path.join(path.dirname(file), s.id, "subagents");
    mkdirSync(sub, { recursive: true });
    writeFileSync(path.join(sub, "agent-1.jsonl"), "{}\n");
    writeFileSync(path.join(path.dirname(file), "journal.jsonl"), "{}\n");
    const files = claudeCode.listFiles({ id: "x", agent: "claude-code", env: "linux", path: root });
    expect(files).toEqual([file]);
    expect(claudeCode.sessionId(file)).toBe(s.id);
  });
});
