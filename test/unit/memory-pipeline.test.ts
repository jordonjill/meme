import { describe, expect, test } from "bun:test";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { apply } from "../../src/memory/apply";
import { ConfigError, configFile, loadConfig } from "../../src/memory/config";
import { asker, ModelError, parseAnswer, type Ask, type Proposed } from "../../src/memory/model";
import { pick, run } from "../../src/memory/pipeline";
import { NO_PROJECT, READ_SESSION as SYSTEM } from "../../src/prompts";
import { entriesIn, memoryPaths } from "../../src/memory/store";
import { pieces, shown, transcript } from "../../src/memory/transcript";
import { sessionRecords } from "../../src/store/queries";
import { ClaudeSession, resetIds } from "../fixtures/gen-claude";
import { importInto, projectsDir, tempDir, testPlatform } from "../helpers";

const HOUR = 60 * 60 * 1000;
const NOW = Date.parse("2026-11-17T12:00:00.000Z");
const ago = (ms: number) => new Date(NOW - ms).toISOString();
const ID = "cccccccc-0000-4000-8000-000000000001";

/** A home with a project that has a remote, and one session in it that ended three hours ago. */
function setup(build: (s: ClaudeSession) => void = talk, start = ago(3 * HOUR)) {
  resetIds();
  const home = tempDir();
  const p = testPlatform(home);
  const tool = path.join(home, "work", "tool");
  mkdirSync(path.join(tool, ".git"), { recursive: true });
  writeFileSync(path.join(tool, ".git", "config"), '[remote "origin"]\n\turl = git@github.com:me/tool.git\n');
  const session = new ClaudeSession({ id: ID, cwd: tool, start });
  build(session);
  session.write(projectsDir(home));
  const { store } = importInto(p);
  return { home, p, tool, session, store, db: store.db, paths: memoryPaths(p.dataDir) };
}

/** The user states a rule; a test fails for want of a database; the agent says what it did. */
function talk(s: ClaudeSession): void {
  s.user("帮我跑一下测试。对了，以后装依赖一律用 pnpm，别再用 npm 了");
  s.thinking("the user wants tests run");
  s.tool("Bash", { command: "pnpm test" }, "Error: connect ECONNREFUSED 127.0.0.1:5432\n1 failed", true);
  s.assistant("数据库没启动。我先启动数据库再跑一次，测试通过了。");
}

const answering = (memories: Partial<Proposed>[], seen: string[] = []): Ask => async (_system, user) => {
  seen.push(user);
  return JSON.stringify({ memories });
};

const runAll = async (t: ReturnType<typeof setup>, ask: Ask, over: Partial<Parameters<typeof pick>[2]> = {}) => {
  const picked = pick(t.db, t.paths, { now: NOW, exclude: [], ...over });
  return { picked, results: await run(picked.due, picked.older, ask, { dataDir: t.p.dataDir, model: "fake-1", now: NOW }) };
};

describe("a session as text for the model (plan-m2 F5)", () => {
  test("one block per record with its number; calls in a line, results by their start and end; reasoning is not shown", () => {
    const t = setup();
    const items = shown(sessionRecords(t.db, ID));
    expect(items.map((s) => s.speaker)).toEqual(["user", "agent", "tool", "agent"]);
    const text = transcript(items);
    expect(text).toContain(`[#${items[0]!.seq} user]\n帮我跑一下测试。对了，以后装依赖一律用 pnpm，别再用 npm 了\n\n[#${items[1]!.seq} assistant]\nBash: pnpm test\n\n[#${items[2]!.seq} tool result]\nfailed\nError: connect ECONNREFUSED 127.0.0.1:5432\n1 failed\n\n`);
    expect(text).not.toContain("the user wants tests run");
  });

  test("only what was not read before is shown; a long failure keeps its start and its end", () => {
    const t = setup((s) => {
      s.user("run it");
      s.tool("Bash", { command: "make" }, `first line\n${"x".repeat(5000)}\nlast line`, true);
    });
    const all = shown(sessionRecords(t.db, ID));
    expect(shown(sessionRecords(t.db, ID), all[1]!.seq).map((s) => s.seq)).toEqual(all.slice(1).map((s) => s.seq));
    const result = all.at(-1)!.text;
    expect(result.length).toBeLessThan(400);
    expect(result).toStartWith("failed\nfirst line\n");
    expect(result).toEndWith("\nlast line");
    expect(result).toMatch(/\[… [\d,]+ characters left out …\]/);
  });

  test("of the work, a short line per call and the output of what failed; the agent's bookkeeping is not shown", () => {
    const t = setup((s) => {
      s.user("build it");
      s.tool("TodoWrite", { todos: [{ content: "build", status: "in_progress" }] }, "Todos updated");
      s.tool("mcp__ccd_turn__update_plan", { items: [{ content: "build", status: "in_progress" }] }, "Plan shown");
      s.tool("Bash", { command: `cat > build.sh <<'EOF'\n${"echo step\n".repeat(100)}EOF` }, "done, 3 files written");
      s.tool("Bash", { command: "./build.sh" }, "Error: missing step", true);
      s.assistant("构建脚本缺一步，我补上了。");
    });
    const items = shown(sessionRecords(t.db, ID));
    expect(items.map((s) => s.speaker)).toEqual(["user", "agent", "agent", "tool", "agent"]);
    const [, script, run, failure] = items;
    expect(script!.text).toStartWith("Bash: cat > build.sh <<'EOF' echo step");
    expect(script!.text.length).toBe(200);
    expect(script!.text).toEndWith("…");
    expect(run!.text).toBe("Bash: ./build.sh");
    expect(failure!.text).toBe("failed\nError: missing step");
    const text = transcript(items);
    expect(text).not.toContain("done, 3 files written");
    expect(text).not.toMatch(/TodoWrite|update_plan|Todos updated|Plan shown/);
  });

  test("a long session is cut between records, never inside one", () => {
    const items = Array.from({ length: 10 }, (_, i) => ({ seq: i, speaker: "user" as const, text: "y".repeat(100), ts: null }));
    const cut = pieces(items, 400);
    expect(cut.map((c) => c.length)).toEqual([3, 3, 3, 1]);
    expect(pieces([{ seq: 0, speaker: "user", text: "z".repeat(1000), ts: null }], 400).length).toBe(1);
  });
});

describe("the model's answer (plan-m2 F5)", () => {
  test("JSON is found inside fences and words; what an item lacks makes it be left out", () => {
    const answer = 'Here you go:\n```json\n{"memories": [{"text": "Use pnpm.", "kind": "fact", "about": "project", "quote": "always pnpm", "at": "#12", "replaces": "m-0000000a"}, {"text": "no quote", "at": 3}, {"text": "x", "quote": "y", "at": 4, "kind": "story", "about": "team", "supports": "the first one"}]}\n```';
    expect(parseAnswer(answer)).toEqual([
      { text: "Use pnpm.", kind: "fact", about: "project", quote: "always pnpm", at: 12, replaces: "m-0000000a" },
      { text: "x", kind: "fact", about: "rule", quote: "y", at: 4 },
    ]);
    expect(parseAnswer('{"memories": []}')).toEqual([]);
  });

  test("an answer that is not JSON, or has no list, is the model's failure", () => {
    expect(() => parseAnswer("I could not find anything.")).toThrow(ModelError);
    expect(() => parseAnswer('{"notes": []}')).toThrow(ModelError);
  });

  test("the question goes out in the OpenAI chat form, with nothing only some services take", async () => {
    const sent: { url: string; init: RequestInit }[] = [];
    const fetcher = (async (url: string, init: RequestInit) => {
      sent.push({ url, init });
      return Response.json({ choices: [{ message: { role: "assistant", content: "the answer" } }] });
    }) as unknown as typeof fetch;
    expect(await asker({ url: "http://host/v1", key: "sk-secret", name: "some-model" }, fetcher)("be brief", "what is kept?")).toBe("the answer");
    expect(sent[0]!.url).toBe("http://host/v1/chat/completions");
    expect((sent[0]!.init.headers as Record<string, string>).Authorization).toBe("Bearer sk-secret");
    expect(JSON.parse(sent[0]!.init.body as string)).toEqual({ model: "some-model", messages: [{ role: "system", content: "be brief" }, { role: "user", content: "what is kept?" }] });
  });

  test("a service that refuses, or answers in another form, or cannot be reached, is the model's failure", async () => {
    const model = { url: "http://host/v1", key: "", name: "m" };
    const fails = async (fetcher: unknown) => asker(model, fetcher as typeof fetch)("s", "u");
    await expect(fails(async () => new Response("rate limited", { status: 429 }))).rejects.toThrow("the model at http://host/v1 answered 429: rate limited");
    await expect(fails(async () => Response.json({ output: "hi" }))).rejects.toThrow(ModelError);
    await expect(
      fails(async () => {
        throw new Error("connection refused");
      }),
    ).rejects.toThrow("could not reach the model at http://host/v1: connection refused");
  });
});

describe("the model's setup (plan-m2 F5)", () => {
  test("from config.json, with the environment on top; without an address and a name there is no model", () => {
    const dataDir = path.join(tempDir(), ".meme");
    expect(loadConfig(dataDir, {})).toEqual({ model: null, exclude: [], auto: true });
    mkdirSync(dataDir);
    writeFileSync(configFile(dataDir), JSON.stringify({ model: { url: "https://host/v1/", keyEnv: "MY_KEY", name: "small" }, exclude: ["/work/secret", "github.com/me/private"] }));
    expect(loadConfig(dataDir, { MY_KEY: "k-1" })).toEqual({ model: { url: "https://host/v1", key: "k-1", name: "small" }, exclude: ["/work/secret", "github.com/me/private"], auto: true });
    expect(loadConfig(dataDir, { MEME_NO_AUTO_UPDATE: "1" }).auto).toBe(false);
    expect(loadConfig(dataDir, { MEME_MODEL_URL: "http://localhost:11434/v1", MEME_MODEL_NAME: "local", MEME_MODEL_KEY: "k-2" }).model).toEqual({ url: "http://localhost:11434/v1", key: "k-2", name: "local" });
    writeFileSync(configFile(dataDir), JSON.stringify({ model: { url: "https://host/v1" }, auto: false }));
    expect(loadConfig(dataDir, {}).model).toBeNull();
    expect(loadConfig(dataDir, {}).auto).toBe(false);
    writeFileSync(configFile(dataDir), "{ not json");
    expect(() => loadConfig(dataDir, {})).toThrow(ConfigError);
  });
});

describe("the pipeline (plan-m2 F5)", () => {
  test("what the model wants kept is kept when its quote is in the session; who said the words decides how it counts", async () => {
    const t = setup();
    const seen: string[] = [];
    const [user, , tool, agent] = shown(sessionRecords(t.db, ID));
    const { results } = await runAll(
      t,
      answering(
        [
          { text: "装依赖一律用 pnpm，不要用 npm", kind: "fact", about: "project", quote: "以后装依赖一律用 pnpm，别再用 npm 了", at: user!.seq },
          { text: "跑测试前要先启动数据库", kind: "experience", about: "project", quote: "connect ECONNREFUSED 127.0.0.1:5432", at: tool!.seq, when: "跑测试时" },
          { text: "测试都通过了就可以提交", kind: "experience", about: "rule", quote: "测试通过了", at: agent!.seq },
          { text: "用户喜欢用 tab 缩进", kind: "fact", about: "user", quote: "我一直用 tab", at: user!.seq },
        ],
        seen,
      ),
    );
    expect(results).toMatchObject([{ kept: 3, active: 2, dropped: ["its quote is not in the session"] }]);
    const byText = new Map(entriesIn(t.paths.memory).map((e) => [e.entry.text, e]));
    expect(byText.get("装依赖一律用 pnpm，不要用 npm")).toMatchObject({ shelf: { level: "project", file: "MEMORY" }, entry: { kind: "fact", basis: "stated", status: "active" } });
    expect(byText.get("跑测试前要先启动数据库")).toMatchObject({ shelf: { level: "project", file: "EXPERIENCE" }, entry: { kind: "experience", basis: "observed", status: "active", when: "跑测试时" } });
    // What only the agent said is the model's reading of it: a candidate.
    expect(byText.get("测试都通过了就可以提交")).toMatchObject({ shelf: { level: "user", file: "EXPERIENCE" }, entry: { basis: "inferred", status: "candidate" } });
    expect(byText.has("用户喜欢用 tab 缩进")).toBe(false);
    const evidence = readFileSync(path.join(t.paths.evidence, "2026-11-17.md"), "utf8");
    expect(evidence).toContain(`· fact · stated · user · project:${byText.get("装依赖一律用 pnpm，不要用 npm")!.shelf.level === "project" ? (byText.get("装依赖一律用 pnpm，不要用 npm")!.shelf as { project: string }).project : ""} · session:${ID}#${user!.seq}\n  装依赖一律用 pnpm，不要用 npm\n  > 以后装依赖一律用 pnpm，别再用 npm 了\n`);
    expect(evidence).toContain("· Claude Code · tool\n");
    // The model was given the project, the agent, what memory holds, and the session with record numbers.
    expect(seen[0]).toStartWith("Project: github.com/me/tool\nAgent: Claude Code\n\nWhat the memory already holds for here:\n(nothing yet)\n\nThe session, records #");
    expect(SYSTEM).toContain("An empty list is a good answer.");
  });

  test("a session in no git repository is in no project: what it says about a project, or beyond one, is kept with the user's files (plan-m2 F12)", async () => {
    resetIds();
    const home = tempDir();
    const p = testPlatform(home);
    const notes = path.join(home, "notes");
    mkdirSync(notes, { recursive: true });
    const session = new ClaudeSession({ id: ID, cwd: notes, start: ago(3 * HOUR) });
    session.user("公司的模型网关在 https://llm.example.com/v1，用 OpenAI 那种 key。网关超时就换 qwen-plus 重试");
    session.assistant("好的。");
    session.write(projectsDir(home));
    const { store } = importInto(p);
    const t = { p, db: store.db, paths: memoryPaths(p.dataDir) } as ReturnType<typeof setup>;
    const [user] = shown(sessionRecords(t.db, ID));
    const seen: string[] = [];
    const { results } = await runAll(
      t,
      answering(
        [
          { text: "公司的模型网关在 https://llm.example.com/v1，用 OpenAI 那种 key", kind: "fact", about: "general", quote: "公司的模型网关在 https://llm.example.com/v1", at: user!.seq },
          { text: "网关超时就换 qwen-plus 重试", kind: "fact", about: "project", quote: "网关超时就换 qwen-plus 重试", at: user!.seq },
          { text: "网关超时时换 qwen-plus", kind: "experience", about: "project", quote: "网关超时就换 qwen-plus 重试", at: user!.seq },
        ],
        seen,
      ),
    );
    expect(results).toMatchObject([{ kept: 3, dropped: [] }]);
    expect(entriesIn(t.paths.memory).map((e) => [e.shelf, e.entry.text])).toEqual([
      [{ level: "user", file: "MEMORY" }, "公司的模型网关在 https://llm.example.com/v1，用 OpenAI 那种 key"],
      [{ level: "user", file: "MEMORY" }, "网关超时就换 qwen-plus 重试"],
      [{ level: "user", file: "EXPERIENCE" }, "网关超时时换 qwen-plus"],
    ]);
    // The model is told there is no project here.
    expect(seen[0]).toStartWith(`Project: (none)\nAgent: Claude Code\n\n${NO_PROJECT}\n\nWhat the memory already holds for here:`);
  });

  test("a wrong record number does not lose a memory whose words are in the session; who said them goes by where they are", async () => {
    const t = setup();
    const [user] = shown(sessionRecords(t.db, ID));
    const { results } = await runAll(t, answering([{ text: "跑测试前要先启动数据库", kind: "experience", about: "project", quote: "ECONNREFUSED 127.0.0.1:5432", at: user!.seq }]));
    expect(results).toMatchObject([{ kept: 1, active: 1, dropped: [] }]);
    expect(entriesIn(t.paths.memory)[0]!.entry.basis).toBe("observed");
  });

  test("a session is read once; when it goes on later, only what is new is read", async () => {
    const t = setup();
    const first = await runAll(t, answering([]));
    expect(first.picked.due.length).toBe(1);
    expect(pick(t.db, t.paths, { now: NOW, exclude: [] }).due).toEqual([]);
    // The user comes back to the session and says one more thing.
    t.session.user("另外，提交信息用英文写");
    t.session.assistant("好的。");
    t.session.write(projectsDir(t.home));
    importInto(t.p, t.store);
    const seen: string[] = [];
    const picked = pick(t.db, t.paths, { now: NOW + 4 * HOUR, exclude: [] });
    await run(picked.due, picked.older, answering([], seen), { dataDir: t.p.dataDir, model: "fake-1", now: NOW + 4 * HOUR });
    expect(seen.length).toBe(1);
    expect(seen[0]).toContain("另外，提交信息用英文写");
    expect(seen[0]).not.toContain("以后装依赖一律用 pnpm");
  });

  test("the model sees what memory holds, and can replace an entry or add to one", async () => {
    const t = setup();
    const said = (content: string) => ({ kind: "fact" as const, tier: "observed" as const, speaker: "tool" as const, scope: "user", source: "cli", content, at: new Date(NOW), label: "meme remember" });
    const before = await apply(t.p.dataDir, { origin: "user", evidence: [said("装依赖用 npm"), said("这个项目的测试要连数据库")], ops: ["装依赖用 npm", "这个项目的测试要连数据库"].map((text, i) => ({ op: "add" as const, shelf: { level: "user" as const, file: "RULES" as const }, text, kind: "fact" as const, evidence: [i] })) });
    const [old, same] = before.outcomes as { id: string }[];
    const seen: string[] = [];
    const [user, , tool] = shown(sessionRecords(t.db, ID));
    const { results } = await runAll(
      t,
      answering(
        [
          { text: "装依赖一律用 pnpm，不要用 npm", about: "rule", quote: "以后装依赖一律用 pnpm", at: user!.seq, replaces: old!.id },
          { text: "这个项目的测试要连数据库", about: "rule", quote: "ECONNREFUSED 127.0.0.1:5432", at: tool!.seq, supports: same!.id },
        ],
        seen,
      ),
    );
    expect(seen[0]).toContain(`[${old!.id}] 装依赖用 npm\n[${same!.id}] 这个项目的测试要连数据库\n`);
    expect(results).toMatchObject([{ kept: 2, dropped: [] }]);
    const byId = new Map(entriesIn(t.paths.memory).map((e) => [e.entry.id, e.entry]));
    expect(byId.get(old!.id)!.status).toBe("replaced");
    expect([...byId.values()].find((e) => e.replaces === old!.id)).toMatchObject({ text: "装依赖一律用 pnpm，不要用 npm", status: "active" });
    expect(byId.get(same!.id)!.evidence.length).toBe(2);
  });

  test("a session still going on is not read, unless it is named", async () => {
    const t = setup(talk, ago(0.5 * HOUR));
    expect(pick(t.db, t.paths, { now: NOW, exclude: [] }).due).toEqual([]);
    expect(pick(t.db, t.paths, { now: NOW, exclude: [], only: ID }).due.length).toBe(1);
  });

  test("a session never read that ended over 14 days ago is set aside until --all", async () => {
    const t = setup(talk, ago(30 * 24 * HOUR));
    const first = await runAll(t, answering([]));
    expect([first.picked.due.length, first.picked.older.length]).toEqual([0, 1]);
    // Set aside for good: a later run does not pick it up by itself.
    expect(pick(t.db, t.paths, { now: NOW, exclude: [] })).toEqual({ due: [], older: [] });
    expect(pick(t.db, t.paths, { now: NOW, exclude: [], all: true }).due.length).toBe(1);
  });

  test("an excluded project's sessions are not read: by its path, or by what the project is known by", () => {
    const t = setup();
    for (const exclude of [[t.tool], [path.dirname(t.tool)], ["github.com/me/tool"]]) expect(pick(t.db, t.paths, { now: NOW, exclude }).due).toEqual([]);
    expect(pick(t.db, t.paths, { now: NOW, exclude: ["github.com/me/other", "/elsewhere"] }).due.length).toBe(1);
  });

  test("when the model fails the run stops, and the session stays unread", async () => {
    const t = setup();
    const failing: Ask = async () => {
      throw new ModelError("the model at http://host/v1 answered 500: oops");
    };
    await expect(runAll(t, failing)).rejects.toThrow("answered 500");
    expect(pick(t.db, t.paths, { now: NOW, exclude: [] }).due.length).toBe(1);
  });

  test("an answer that cannot be read is asked for once more", async () => {
    const t = setup();
    let asked = 0;
    const ask: Ask = async (_s, user) => (++asked === 1 ? "Sorry, nothing." : user.includes("Answer with JSON only") ? '{"memories": []}' : "still not JSON");
    const { results } = await runAll(t, ask);
    expect([asked, results.length]).toEqual([2, 1]);
  });

  test("the model's own key is not in what it is sent", async () => {
    const t = setup((s) => {
      s.user("the key for the memory model is zz-very-secret-key-123, keep it in the config");
      s.assistant("ok");
    });
    const seen: string[] = [];
    const picked = pick(t.db, t.paths, { now: NOW, exclude: [] });
    await run(picked.due, picked.older, answering([], seen), { dataDir: t.p.dataDir, model: "fake-1", now: NOW, secret: "zz-very-secret-key-123" });
    expect(seen[0]).toContain("the key for the memory model is [REDACTED], keep it");
  });
});
