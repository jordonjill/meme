/** What the store does with files it cannot convert (arch.md §6.1, point 2). */
import { describe, expect, test } from "bun:test";
import { writeFileSync } from "node:fs";
import path from "node:path";
import { codex } from "../../src/adapters/codex";
import type { Adapter } from "../../src/adapters/types";
import { nullLogger } from "../../src/platform/log";
import { openStore } from "../../src/store/db";
import { describeError, importAll } from "../../src/store/import";
import { failures, getSession } from "../../src/store/queries";
import { resetIds } from "../fixtures/gen-claude";
import { sampleCodex } from "../fixtures/gen-codex";
import { tempDir, testPlatform } from "../helpers";

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
