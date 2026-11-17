/**
 * `meme remember` and `meme memory` (plan-m2 F2): the user's own words go into memory,
 * can be traced to where they were said, and can be forgotten for good.
 */
import { describe, expect, test } from "bun:test";
import { chmodSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { run, runInTerminal, SCRIPT, world, type World } from "./world";

const isRoot = process.getuid?.() === 0;
const data = (w: World, ...rest: string[]) => path.join(w.home, ".meme", ...rest);
const idIn = (out: string) => /m-[0-9a-f]{8}/.exec(out)![0];

/** All of meme's files that hold what was remembered, as one text. */
function everything(w: World): string {
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const e of existsSync(dir) ? readdirSync(dir, { withFileTypes: true }) : []) {
      const f = path.join(dir, e.name);
      if (e.isDirectory()) walk(f);
      else out.push(readFileSync(f, "utf8"));
    }
  };
  walk(data(w));
  return out.join("\n");
}

describe("meme remember", () => {
  test("a rule goes into RULES.md with the evidence it rests on; nothing else is touched", () => {
    const w = world();
    const before = readdirSync(w.home).sort();
    const r = run(w, ["remember", "回复用中文；仓库里的东西全部用英文"]);
    expect(r.code).toBe(0);
    expect(r.out).toMatch(/^Remembered m-[0-9a-f]{8} in ~\/\.meme\/memory\/RULES\.md\.\n$/);
    const rules = readFileSync(data(w, "memory", "RULES.md"), "utf8");
    expect(rules).toStartWith("# Rules\n");
    expect(rules).toContain(`## ${idIn(r.out)} 回复用中文；仓库里的东西全部用英文\n- kind: fact · agents: all · basis: stated · status: active\n- evidence: e-`);
    const [day] = readdirSync(data(w, "evidence"));
    expect(readFileSync(data(w, "evidence", day!), "utf8")).toMatch(/\n## \d\d:\d\d · meme remember\n- e-[0-9a-f]{8} · fact · stated · user · user · cli\n {2}回复用中文；仓库里的东西全部用英文\n$/);
    // No session was read for it, and nothing outside ~/.meme was written.
    expect(existsSync(data(w, "raw"))).toBe(false);
    expect(readdirSync(w.home).sort()).toEqual([...before, ".meme"].sort());
  });

  test("said again, it is one entry with one more piece of evidence", () => {
    const w = world();
    const first = run(w, ["remember", "Do not push unless asked."]);
    const again = run(w, ["remember", "do", "not", "push,", "unless", "asked"]);
    expect(again.out).toBe(`Already remembered as ${idIn(first.out)} in ~/.meme/memory/RULES.md; noted that you said it again.\n`);
    expect(readFileSync(data(w, "memory", "RULES.md"), "utf8").match(/^## /gm)!.length).toBe(1);
    expect(everything(w).match(/· cli\n/g)!.length).toBe(2);
  });

  test("--project keeps a fact with the project, known by its remote; --about-me with the user", () => {
    const w = world();
    const repo = path.join(w.home, "work", "tool");
    mkdirSync(path.join(repo, ".git"), { recursive: true });
    mkdirSync(path.join(repo, "src"));
    writeFileSync(path.join(repo, ".git", "config"), '[remote "origin"]\n\turl = git@github.com:me/tool.git\n');
    const r = run(w, ["remember", "--project", "Tests need the database running."], { cwd: path.join(repo, "src") });
    expect(r.out).toMatch(/^Remembered m-[0-9a-f]{8} in ~\/\.meme\/memory\/projects\/tool-[0-9a-f]{8}\/MEMORY\.md\.\n$/);
    const [folder] = readdirSync(data(w, "memory", "projects"));
    expect(readFileSync(data(w, "memory", "projects", folder!, "MEMORY.md"), "utf8")).toStartWith("# Project memory\n\nProject: github.com/me/tool\n");
    expect(everything(w)).toContain(`· user · project:${folder} · cli\n`);
    const me = run(w, ["remember", "--about-me", "I work in WSL and on Windows."]);
    expect(me.out).toMatch(/in ~\/\.meme\/memory\/USER\.md\.\n$/);
  });

  test("a secret is masked before it is stored, and the user is told", () => {
    const w = world();
    const r = run(w, ["remember", "the deploy token is ghp_abcdefghijklmnopqrstuvwxyz0123456789"]);
    expect(r.code).toBe(0);
    expect(r.out).toEndWith("A secret in it was masked before it was stored.\n");
    expect(everything(w)).not.toContain("ghp_abcdefghijklmnopqrstuvwxyz0123456789");
    expect(everything(w)).toContain("the deploy token is [REDACTED:");
  });

  test("what cannot be remembered says why, and writes nothing", () => {
    const w = world();
    const none = run(w, ["remember"]);
    expect([none.code, none.err]).toEqual([2, 'meme remember: remember needs the words to remember, e.g. meme remember "reply in Chinese"\nRun `meme remember --help` for usage.\n']);
    const both = run(w, ["remember", "--project", "--about-me", "x"]);
    expect([both.code, both.err.split("\n")[0]]).toEqual([2, "meme remember: --project and --about-me do not go together"]);
    const long = run(w, ["remember", "x".repeat(301)]);
    expect([long.code, long.err]).toEqual([1, "meme: not remembered: the entry is 301 characters long; the most is 300\n"]);
    expect(existsSync(data(w, "memory"))).toBe(false);
    expect(existsSync(data(w, "evidence"))).toBe(false);
  });

  test.skipIf(isRoot || process.platform === "win32")("where nothing can be written, it says so and remembers nothing", () => {
    const w = world();
    mkdirSync(data(w));
    chmodSync(data(w), 0o555);
    try {
      const r = run(w, ["remember", "Do not push unless asked."]);
      expect([r.code, r.err]).toEqual([1, "meme: meme cannot write its memory here (~/.meme cannot be written); nothing was remembered\n"]);
      expect(readdirSync(data(w))).toEqual([]);
    } finally {
      chmodSync(data(w), 0o755);
    }
  });
});

describe("meme memory", () => {
  function remembered() {
    const w = world();
    const rule = idIn(run(w, ["remember", "Do not push unless asked."]).out);
    run(w, ["remember", "do not push unless asked"]);
    const me = idIn(run(w, ["remember", "--about-me", "I work in WSL and on Windows."]).out);
    return { w, rule, me };
  }

  test("with nothing remembered it says how to start", () => {
    const r = run(world(), ["memory"]);
    expect([r.code, r.out]).toEqual([0, 'Nothing remembered yet. `meme remember "…"` keeps a rule or a fact.\n']);
  });

  test("lists every entry, file by file", () => {
    const { w, rule, me } = remembered();
    const r = run(w, ["memory"]);
    expect(r.out).toBe(`Rules  ~/.meme/memory/RULES.md\n  ${rule}  Do not push unless asked.\n\nAbout you  ~/.meme/memory/USER.md\n  ${me}  I work in WSL and on Windows.\n`);
  });

  test("show traces an entry to each time it was said; the id can be shortened", () => {
    const { w, rule } = remembered();
    const r = run(w, ["memory", "show", rule.slice(2, 7)]);
    expect(r.code).toBe(0);
    const lines = r.out.split("\n");
    expect(lines.slice(0, 5)).toEqual([`${rule}  Do not push unless asked.`, "  fact, for all agents; stated; active", "  in ~/.meme/memory/RULES.md", "", "Evidence"]);
    expect(lines[5]).toMatch(/^ {2}e-[0-9a-f]{8} {2}\d{4}-\d\d-\d\d \d\d:\d\d {2}meme remember$/);
    expect([lines[6], lines[8]]).toEqual(["    Do not push unless asked.", "    do not push unless asked"]);
    const none = run(w, ["memory", "show", "ffff"]);
    expect([none.code, none.err]).toEqual([1, "meme: no entry ffff in memory; `meme memory` lists them\n"]);
  });

  test("forget asks first: outside a terminal nothing is forgotten without --yes", () => {
    const { w, rule } = remembered();
    const r = run(w, ["memory", "forget", rule]);
    expect(r.code).toBe(1);
    expect(r.out).toBe(`This removes for good:\n  ${rule}  Do not push unless asked.\n  and 2 pieces of evidence that only it rests on.\n`);
    expect(r.err).toStartWith("meme: nothing forgotten. Forgetting needs the user's confirmation");
    expect(run(w, ["memory"]).out).toContain(rule);
  });

  test.skipIf(!SCRIPT)("forget in a terminal: anything but y keeps it", () => {
    const { w, rule } = remembered();
    const r = runInTerminal(w, ["memory", "forget", rule], "\n");
    expect(r.out).toContain("Forget it? [y/N]");
    expect(r.out).toContain("Nothing forgotten.");
    expect(run(w, ["memory"]).out).toContain(rule);
  });

  test("forget --yes: the words are in none of meme's files afterwards; saying them again brings the entry back", () => {
    const { w, rule, me } = remembered();
    const r = run(w, ["memory", "forget", rule, "--yes"]);
    expect(r.code).toBe(0);
    expect(r.out).toEndWith(`Forgotten ${rule}. It will not be learned again from your sessions; \`meme remember\` brings it back.\n`);
    expect(everything(w).toLowerCase()).not.toContain("do not push");
    expect(run(w, ["memory"]).out).toBe(`About you  ~/.meme/memory/USER.md\n  ${me}  I work in WSL and on Windows.\n`);
    expect(run(w, ["remember", "Do not push unless asked."]).out).toBe(`Remembered ${rule} in ~/.meme/memory/RULES.md.\n`);
  });

  test("usage errors name what is wrong", () => {
    const w = world();
    expect(run(w, ["memory", "list"]).err.split("\n")[0]).toBe("meme memory: memory does not know list; it takes show <id>, forget <id> or update");
    expect(run(w, ["memory", "--dry-run"]).err.split("\n")[0]).toBe("meme memory: --dry-run, --all and --session go with update");
    expect(run(w, ["memory", "show"]).err.split("\n")[0]).toBe("meme memory: memory show needs an entry's id; `meme memory` lists them");
    expect(run(w, ["memory", "--yes"]).err.split("\n")[0]).toBe("meme memory: --yes goes with forget");
  });

  test("meme --help lists both commands", () => {
    const out = run(world(), ["--help"]).out;
    expect(out).toContain("\n  remember    keep a rule or a fact in memory, in your own words\n");
    expect(out).toContain("\n  memory      what meme remembers: list it, trace an entry, forget one\n");
  });
});
