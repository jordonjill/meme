/**
 * Plan §6 ⑦, acceptance 1: outside src/adapters/ the code knows no agent by
 * name. What is particular to an agent lives in its adapter and its profile;
 * everything else reads the profiles. The words are taken from the profiles,
 * so an agent added later is checked too. Comments count: they should not
 * name an agent either.
 */
import { describe, expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { PROFILES } from "../../src/adapters/profiles";

const SRC = path.resolve(import.meta.dir, "../../src");
const ALLOWED = path.join(SRC, "adapters");

function files(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return p === ALLOWED ? [] : files(p);
    return /\.tsx?$/.test(e.name) ? [p] : [];
  });
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Names, words to type, folders, environment variables and instruction files of every agent. */
function agentWords(): RegExp {
  const words = new Set<string>();
  for (const p of PROFILES) {
    for (const w of [p.agent, p.name, p.short, p.command, ...p.aliases, p.homeDir, p.homeVar, p.sessionVar, p.instructionFile, p.archivedDir]) {
      if (w) words.add(w.toLowerCase());
    }
  }
  // Long words anywhere (claudeCode, CLAUDECODE, CODEX_SANDBOX); short ones ("cc") only on their own.
  const parts = [...words].sort((a, b) => b.length - a.length).map((w) => (w.length >= 4 ? escape(w) : `\\b${escape(w)}\\b`));
  return new RegExp(parts.join("|"), "i");
}

describe("agent knowledge stays in the adapters (plan §6 ⑦)", () => {
  test("the words come from every profile", () => {
    const re = agentWords();
    for (const p of PROFILES) {
      expect(re.test(p.name)).toBe(true);
      if (p.sessionVar) expect(re.test(p.sessionVar)).toBe(true);
    }
    // Words that merely contain a short alias are not agents.
    expect(re.test("access succeeded")).toBe(false);
  });

  test("no file in src/ outside src/adapters/ names an agent, its folders or its environment variables", () => {
    const re = agentWords();
    const hits: string[] = [];
    for (const file of files(SRC)) {
      readFileSync(file, "utf8")
        .split("\n")
        .forEach((line, i) => {
          const m = re.exec(line);
          if (m) hits.push(`${path.relative(SRC, file)}:${i + 1}: ${m[0]}`);
        });
    }
    expect(files(SRC).length).toBeGreaterThan(20);
    expect(hits).toEqual([]);
  });
});
