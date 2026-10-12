/** What the store does with files it cannot convert (arch.md §6.1, point 2). */
import { describe, expect, test } from "bun:test";
import { writeFileSync } from "node:fs";
import path from "node:path";
import { codex, convertCodex } from "../../src/adapters/codex";
import type { Adapter } from "../../src/adapters/types";
import { nullLogger } from "../../src/platform/log";
import { openStore } from "../../src/store/db";
import { describeError, importAll } from "../../src/store/import";
import { failures, getSession } from "../../src/store/queries";
import { ClaudeSession, resetIds } from "../fixtures/gen-claude";
import { CodexSession, sampleCodex } from "../fixtures/gen-codex";
import { convert, tempDir, testPlatform } from "../helpers";

describe("files meme cannot convert", () => {
  test("tried once per change of the file, not on every command", () => {
    resetIds();
    const home = tempDir();
    const p = testPlatform(home);
    const store = openStore(p.dataDir);
    let converted = 0;
    const counting: Adapter = { ...codex, convert: (files, ctx) => (converted++, codex.convert(files, ctx)) };
    const s = sampleCodex({ id: "c0deba0d-0000-4000-8000-0000000000c1" });
    const file = s.write(path.join(home, ".codex"), { zst: true });
    writeFileSync(file, "not zstd");
    importAll(store, p, [counting], nullLogger);
    importAll(store, p, [counting], nullLogger);
    expect(converted).toBe(1);
    expect(getSession(store.db, s.id)!.unreadable).toBe(1);
    expect(failures(store.db).map((f) => f.error)[0]).toMatch(/^ZSTD_error_\w+: /);
    // Changed (or another meme version): tried again.
    writeFileSync(file, "still not zstd");
    importAll(store, p, [counting], nullLogger);
    expect(converted).toBe(2);
    // Readable again: no longer marked.
    s.write(path.join(home, ".codex"), { zst: true });
    importAll(store, p, [counting], nullLogger);
    expect(getSession(store.db, s.id)!.unreadable).toBe(0);
    expect(failures(store.db)).toEqual([]);
  });

  test("the reason keeps the kind of error and its first line, not what it quotes from the file", () => {
    expect(describeError(new SyntaxError('JSON Parse error: Unexpected identifier "secret text"\nmore'))).toBe("SyntaxError: JSON Parse error: Unexpected identifier …");
    expect(describeError(Object.assign(new Error("EACCES: permission denied, open '/home/u/.claude/x.jsonl'"), { code: "EACCES" }))).toBe("EACCES: permission denied, open …");
    expect(describeError("odd")).toBe("Error: odd");
  });
});

describe("the second layer: lines of known types that became no record (plan §6 ⑦.1)", () => {
  test("Claude Code: unwritten thinking, harness text and command output are expected; a new block type is not", () => {
    resetIds();
    const s = new ClaudeSession({ version: "2.1.300" });
    s.user("hi");
    s.thinking(""); // the usual case: thinking it did not write down
    s.assistant("hello");
    s.user("<local-command-caveat>The command below was run directly.</local-command-caveat>");
    s.localCommand("model", "Kept model");
    s.user("<task-notification>\n<task-id>1</task-id>");
    expect(convert(s.text(), s.id).unread).toEqual([]);
    s.lines.push({ parentUuid: null, isSidechain: false, type: "assistant", uuid: "f00d0000-0000-4000-8000-000000000001", sessionId: s.id, version: "2.1.300", timestamp: "2026-09-30T09:10:00.000Z", message: { role: "assistant", content: [{ type: "rich_text", spans: [] }] } });
    s.lines.push({ parentUuid: null, isSidechain: false, type: "user", uuid: "f00d0000-0000-4000-8000-000000000002", sessionId: s.id, version: "2.1.300", timestamp: "2026-09-30T09:10:01.000Z", message: { role: "user", content: { text: "moved" } } });
    expect(convert(s.text(), s.id).unread).toEqual([
      { type: "assistant", version: "2.1.300", count: 1 },
      { type: "user", version: "2.1.300", count: 1 },
    ]);
  });

  test("Codex: developer instructions and injected context are expected; a message without its content is not", () => {
    resetIds();
    const home = tempDir();
    const p = testPlatform(home);
    const x = new CodexSession({ id: "c0de0400-0000-4000-8000-0000000000d1" });
    x.developer("You are Codex.");
    x.environment();
    x.user("Do it");
    x.assistant("Done.");
    const ctx = (s: CodexSession) => ({ sessionId: s.id, root: codex.roots(p)[0]!, project: () => null, filesOf: () => [] });
    expect(convertCodex([x.write(path.join(home, ".codex"))], ctx(x)).unread).toEqual([]);
    x.lines.push({ timestamp: "2026-10-10T07:00:00.000Z", type: "response_item", payload: { type: "message", role: "assistant", parts: [{ kind: "text", value: "x" }] } });
    expect(convertCodex([x.write(path.join(home, ".codex"))], ctx(x)).unread).toEqual([{ type: "response_item/message", version: "0.162.0", count: 1 }]);
  });
});
