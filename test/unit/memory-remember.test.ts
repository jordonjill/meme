import { describe, expect, test } from "bun:test";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { exclusionFor } from "../../src/cli/commands/memory-exclude";
import { configFile } from "../../src/memory/config";
import { ModelError, type Ask } from "../../src/memory/model";
import { isExcluded } from "../../src/memory/pipeline";
import { READ_SESSION as SYSTEM, REMEMBER as KEEP_SYSTEM } from "../../src/prompts";
import { projectRef } from "../../src/memory/projects";
import { modelFor, rememberWords, type RememberRequest } from "../../src/memory/remember";
import { entriesIn, memoryPaths } from "../../src/memory/store";
import { readAll } from "../../src/memory/evidence";
import { digest } from "../../src/memory/digest";
import { tempDir, testPlatform } from "../helpers";

const AT = new Date(2026, 10, 17, 14, 32);
const PROJECT = { key: "tool-1a2b3c4d", identity: "github.com/me/tool" };

/** A request as `meme remember` makes one: the words typed are the one record. */
function typed(words: string, over: Partial<RememberRequest> = {}): RememberRequest {
  return {
    dataDir: path.join(tempDir(), ".meme"),
    origin: "user",
    records: [{ seq: 0, speaker: "user", text: words, ts: null }],
    focus: 0,
    words,
    project: PROJECT,
    source: () => "cli",
    label: "meme remember",
    at: AT,
    model: null,
    ...over,
  };
}

const answering = (memories: unknown[], seen: { system: string; user: string }[] = []): Ask => async (system, user) => {
  seen.push({ system, user });
  return JSON.stringify({ memories });
};

describe("remembering what the user asked to keep (plan-m2 F8)", () => {
  test("with a model: the model words it and places it; the user's words are the evidence", async () => {
    const seen: { system: string; user: string }[] = [];
    const words = "对了，以后装依赖一律用 pnpm，别再用 npm 了";
    const r = typed(words, { model: { ask: answering([{ text: "装依赖用 pnpm，不要用 npm", kind: "fact", about: "project", quote: "以后装依赖一律用 pnpm", at: 0 }], seen) } });
    const done = await rememberWords(r);
    expect(done).toMatchObject({ by: "model", dropped: [], kept: [{ change: "added", active: true, text: "装依赖用 pnpm，不要用 npm" }] });
    const [placed] = entriesIn(memoryPaths(r.dataDir).memory);
    expect(placed).toMatchObject({ shelf: { level: "project", project: PROJECT.key, file: "MEMORY" }, entry: { basis: "stated", status: "active" } });
    expect(readAll(memoryPaths(r.dataDir).evidence)).toMatchObject([{ source: "cli", tier: "stated", speaker: "user", content: "装依赖用 pnpm，不要用 npm", quote: "以后装依赖一律用 pnpm" }]);
    // Asked with the rules for remembering, which share how to write with the pipeline's.
    expect(seen[0]!.system).toBe(KEEP_SYSTEM);
    expect(KEEP_SYSTEM).toContain("Keep what the user asked for, and nothing else from the records.");
    expect(SYSTEM.slice(SYSTEM.indexOf("Every memory must rest"))).toBe(KEEP_SYSTEM.slice(KEEP_SYSTEM.indexOf("Every memory must rest")));
    expect(seen[0]!.user).toContain("The user asked to remember what they said in record #0.\n");
    expect(seen[0]!.user).toContain(`[#0 user]\n${words}`);
  });

  test("the hint and the agent's note are passed to the model, never written", async () => {
    const seen: { system: string; user: string }[] = [];
    const r = typed("用 pnpm", { about: "project", note: "they said it twice today", model: { ask: answering([], seen) } });
    await rememberWords(r);
    expect(seen[0]!.user).toContain("It is said to be about: this project.\nThe agent that asked adds: they said it twice today\n");
    expect(JSON.stringify(readAll(memoryPaths(r.dataDir).evidence))).not.toContain("twice");
  });

  test("when the model keeps nothing, nothing is kept: it judged the words meant for that time only (plan-m2 F9)", async () => {
    const r = typed("这次先别跑测试", { model: { ask: answering([]) } });
    expect(await rememberWords(r)).toEqual({ kept: [], dropped: [], by: "declined" });
    expect(entriesIn(memoryPaths(r.dataDir).memory)).toEqual([]);
    expect(digest(memoryPaths(r.dataDir)).declined).toMatchObject([{ words: "这次先别跑测试", from: "meme remember" }]);
  });

  test("when what the model wrote cannot be checked against the words, the words go in as they are", async () => {
    const r = typed("Use pnpm.", { model: { ask: answering([{ text: "Use tabs.", quote: "the user likes tabs", at: 0 }]) } });
    const done = await rememberWords(r);
    expect(done).toMatchObject({ by: "words", kept: [{ change: "added", text: "Use pnpm." }] });
    expect(entriesIn(memoryPaths(r.dataDir).memory)[0]).toMatchObject({ shelf: { level: "user", file: "RULES" } });
  });

  test("when the model cannot be asked, the words go in as they are, and that is said", async () => {
    const failing: Ask = async () => {
      throw new ModelError("could not reach the model at http://host/v1: refused");
    };
    const done = await rememberWords(typed("Use pnpm.", { about: "user", model: { ask: failing } }));
    expect(done).toMatchObject({ by: "words", modelError: "could not reach the model at http://host/v1: refused", kept: [{ text: "Use pnpm." }] });
  });

  test("without a model: the words as they are, where the hint says", async () => {
    const r = typed("Tests need the database.", { about: "project" });
    const done = await rememberWords(r);
    expect(done).toMatchObject({ by: "words", kept: [{ change: "added" }] });
    expect(entriesIn(memoryPaths(r.dataDir).memory)[0]!.shelf).toEqual({ level: "project", project: PROJECT.key, file: "MEMORY" });
  });

  test("what the model takes from the agent's words around the user's is only a candidate", async () => {
    const r = typed("记住这个", {
      origin: "agent",
      records: [
        { seq: 7, speaker: "agent", text: "测试要先启动数据库，否则会连不上", ts: null },
        { seq: 8, speaker: "user", text: "记住这个", ts: null },
      ],
      focus: 8,
      source: (s) => `session:x#${s.seq}`,
      model: { ask: answering([{ text: "测试前先启动数据库", kind: "experience", about: "project", quote: "测试要先启动数据库", at: 7 }]) },
    });
    const done = await rememberWords(r);
    expect(done).toMatchObject({ by: "model", kept: [{ active: false }] });
    expect(readAll(memoryPaths(r.dataDir).evidence)[0]).toMatchObject({ source: "session:x#7", tier: "inferred", speaker: "agent" });
  });
});

describe("which model words a memory (plan-m2 F8)", () => {
  function store(config: unknown) {
    const dir = path.join(tempDir(), ".meme");
    mkdirSync(dir);
    writeFileSync(configFile(dir), typeof config === "string" ? config : JSON.stringify(config));
    return dir;
  }
  const MODEL = { model: { url: "http://host/v1", name: "m", key: "k" } };

  test("none set up, an excluded project, or a file that cannot be read: no model, and why", () => {
    expect(modelFor(path.join(tempDir(), ".meme"), {}, "/work/tool", PROJECT)).toEqual({ model: null, why: "no model is set up to word it" });
    expect(modelFor(store({ ...MODEL, exclude: ["github.com/me/tool"] }), {}, "/work/tool", PROJECT)).toEqual({ model: null, why: "this project is never sent to the model" });
    expect(modelFor(store("{ not json"), {}, "/work/tool", PROJECT).why).toMatch(/is not valid JSON/);
    expect(modelFor(store(MODEL), {}, "/work/tool", PROJECT).model).not.toBeNull();
  });

  test("a project is excluded by what it is known by, its path, or a folder above it", () => {
    expect(isExcluded("/work/tool", PROJECT, ["github.com/me/tool"])).toBe(true);
    expect(isExcluded("/work/tool", PROJECT, ["/work/tool"])).toBe(true);
    expect(isExcluded("/work/tool", PROJECT, ["/work/"])).toBe(true);
    expect(isExcluded("/work/toolbox", projectRef("/work/toolbox"), ["/work/tool"])).toBe(false);
    expect(isExcluded(null, null, ["/work"])).toBe(false);
  });

  test("an exclusion is kept as what the project is known by", () => {
    const home = tempDir();
    const platform = testPlatform(home);
    const repo = path.join(home, "work", "tool");
    mkdirSync(path.join(repo, ".git"), { recursive: true });
    mkdirSync(path.join(repo, "src"));
    writeFileSync(path.join(repo, ".git", "config"), '[remote "origin"]\n\turl = git@github.com:me/tool.git\n');
    expect(exclusionFor(platform, repo)).toBe("github.com/me/tool");
    expect(exclusionFor(platform, path.join(repo, "src"))).toBe("github.com/me/tool");
    expect(exclusionFor(platform, "~/work")).toBe(path.join(home, "work"));
    expect(exclusionFor(platform, "https://user@GitHub.com/me/Other.git")).toBe("github.com/me/Other");
  });
});
