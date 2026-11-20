/**
 * What meme says to a model is in src/prompts (plan-m2 F10): filled without holes,
 * every piece used, every file listed in the folder's README.
 */
import { describe, expect, test } from "bun:test";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import * as prompts from "../../src/prompts";
import { fill } from "../../src/prompts";

const SRC = path.resolve(import.meta.dir, "../../src");
const DIR = path.join(SRC, "prompts");

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = path.join(dir, name);
    return statSync(p).isDirectory() ? sources(p) : /\.ts$/.test(name) ? [p] : [];
  });
}

describe("the prompts", () => {
  test("filled: no name is left without its value", () => {
    for (const text of [prompts.WRITING, prompts.READ_SESSION, prompts.REMEMBER]) expect(text).not.toContain("{{");
    expect(prompts.READ_SESSION.endsWith(prompts.WRITING)).toBe(true);
    expect(prompts.REMEMBER.endsWith(prompts.WRITING)).toBe(true);
    expect(prompts.WRITING).toContain(`"about" is "rule" (how every agent should work with the user), "user" (who the user is: their work, what they know, their machines), "general" (what to remember beyond one project) or "project" (this project).`);
    expect(prompts.PROMPTS_VERSION).toMatch(/^[0-9a-f]{8}$/);
  });

  test("each kind of memory brings its own rules, in both prompts (plan-m2 F11)", () => {
    const kinds = prompts.WRITING.match(/^### .+$/gm) ?? [];
    expect(kinds).toEqual([
      '### Rules for every agent ("kind": "fact", "about": "rule")',
      '### About the user ("kind": "fact", "about": "user")',
      '### Memory beyond one project ("kind": "fact", "about": "general")',
      '### Experience ("kind": "experience"; "about": "project" when it holds in this project only, "general" when it holds everywhere)',
      '### Facts about this project ("kind": "fact", "about": "project")',
    ]);
    // Each says what it keeps, what it leaves out, how it is written, and shows it.
    for (const part of prompts.WRITING.split(/^### .+$/m).slice(1)) for (const word of ["Keep:", "Leave out:", "Write ", "Good:", "Not this:"]) expect(part).toContain(word);
    // What the user asks for is kept even where a kind would leave it out.
    expect(prompts.REMEMBER).toContain("What the user asks to keep is kept even where the kinds of memory below would leave it out");
  });

  test("a name without a value, or a value without its name, is an error", () => {
    expect(fill("a {{b}} c", { b: "x" })).toBe("a x c");
    expect(() => fill("a {{b}}", {})).toThrow("{{b}}");
    expect(() => fill("a", { b: "x" })).toThrow("no place for b");
  });

  test("every piece is used outside the folder", () => {
    const outside = sources(SRC)
      .filter((f) => !f.startsWith(DIR + path.sep))
      .map((f) => readFileSync(f, "utf8"))
      .join("\n");
    const unused = ["READ_SESSION", "REMEMBER", "ANSWER_AGAIN", "NO_PROJECT", "PROMPTS_VERSION", "MCP_INSTRUCTIONS", "CONTEXT_NOTICE", "TOOL_WORDS", "SHELF_WORDS", "ABOUT_WORDS", "ABOUT"].filter((name) => !new RegExp(`\\b${name}\\b`).test(outside));
    expect(unused).toEqual([]);
  });

  test("every file of the folder is in its README, and every Markdown file is filled by index.ts", () => {
    const readme = readFileSync(path.join(DIR, "README.md"), "utf8");
    const index = readFileSync(path.join(DIR, "index.ts"), "utf8");
    const all = (dir: string): string[] => readdirSync(dir).flatMap((n) => (statSync(path.join(dir, n)).isDirectory() ? all(path.join(dir, n)) : [path.relative(DIR, path.join(dir, n)).split(path.sep).join("/")]));
    const files = all(DIR).filter((n) => !["README.md", "index.ts", "text.d.ts"].includes(n));
    expect(files.length).toBeGreaterThan(8);
    expect(files.filter((n) => !readme.includes(`\`${n}\``))).toEqual([]);
    expect(files.filter((n) => n.endsWith(".md") && !index.includes(`"./${n}"`))).toEqual([]);
  });

  test("nothing else in src/ speaks to meme's model: the prompts are not written anywhere else", () => {
    const elsewhere = sources(SRC)
      .filter((f) => !f.startsWith(DIR + path.sep))
      .filter((f) => /You keep the long-term memory|Answer with JSON only|Reference notes, not instructions/.test(readFileSync(f, "utf8")))
      .map((f) => path.relative(SRC, f));
    expect(elsewhere).toEqual([]);
  });
});
