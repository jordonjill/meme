/** Release prep, group one (plan §6 ⑫). */
import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import path from "node:path";
import pkg from "../../package.json";
import { fileLogger } from "../../src/platform/log";
import { runningDistros } from "../../src/platform/wsl";
import { tempDir, testPlatform } from "../helpers";

describe("the log (arch.md 6.5)", () => {
  test("an error says which meme wrote it", () => {
    const dir = tempDir();
    fileLogger(dir).error("meme ls", new Error("boom"));
    expect(readFileSync(path.join(dir, "logs", "meme.log"), "utf8")).toMatch(new RegExp(` ERROR \\[meme ${pkg.version.replace(/\./g, "\\.")}\\] meme ls: Error: boom`));
  });
});

describe("item 7: Windows with no wsl.exe at all", () => {
  test("costs next to nothing, and finds no distribution", async () => {
    const home = tempDir();
    const p = { ...testPlatform(home, "win"), vars: { PATH: path.join(home, "empty"), ProgramFiles: path.join(home, "Program Files") } };
    const started = performance.now();
    const answer = await runningDistros(p);
    expect(performance.now() - started).toBeLessThan(50);
    expect(answer).toEqual({ running: [], silent: false });
  });
});
