/** Release prep, group one (plan §6 ⑫). */
import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import path from "node:path";
import pkg from "../../package.json";
import { INSTALL_HINT } from "../../src/cli/usage";
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

describe("the install commands (plan §6 ⑬)", () => {
  test("install's hint for the other side, both READMEs and the scripts say the same", () => {
    const read = (f: string) => readFileSync(path.resolve(import.meta.dir, "../..", f), "utf8");
    for (const f of ["README.md", "README.zh-CN.md"]) {
      expect(read(f), f).toContain(INSTALL_HINT.linux);
      expect(read(f), f).toContain(INSTALL_HINT.windows);
    }
    expect(read("install.sh")).toContain(INSTALL_HINT.linux);
    expect(read("install.ps1")).toContain(INSTALL_HINT.windows);
  });
});
