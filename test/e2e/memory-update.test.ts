/**
 * `meme memory update` (plan-m2 F5): sessions that have gone quiet are read by a
 * model. The model here is a server the test runs, answering in the OpenAI chat form.
 */
import { afterEach, describe, expect, test } from "bun:test";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { ClaudeSession } from "../fixtures/gen-claude";
import { run, runAsync, world, type World } from "./world";

const HOUR = 60 * 60 * 1000;
const SESSION = "dddddddd-0000-4000-8000-00000000000d";

/** A project with a remote and a session in it that ended three hours ago. The world's own sessions are months old. */
function quiet() {
  const w = world();
  const tool = path.join(w.home, "work", "tool");
  mkdirSync(path.join(tool, ".git"), { recursive: true });
  writeFileSync(path.join(tool, ".git", "config"), '[remote "origin"]\n\turl = git@github.com:me/tool.git\n');
  const s = new ClaudeSession({ id: SESSION, cwd: tool, start: new Date(Date.now() - 3 * HOUR).toISOString() });
  s.user("帮我跑一下测试。对了，以后装依赖一律用 pnpm，别再用 npm 了");
  s.tool("Bash", { command: "pnpm test" }, "Error: connect ECONNREFUSED 127.0.0.1:5432\n1 failed", true);
  s.assistant("数据库没启动。我先启动数据库再跑一次，测试通过了。");
  s.write(path.join(w.home, ".claude", "projects"));
  return { w, tool };
}

const servers: { stop(): void }[] = [];
afterEach(() => {
  for (const s of servers.splice(0)) s.stop();
});

/** A model service: answers every question with `memories`, or with `status`; keeps what it was asked. */
function model(memories: unknown[], status = 200) {
  const asked: { auth: string | null; model: string; system: string; user: string }[] = [];
  const server = Bun.serve({
    port: 0,
    hostname: "127.0.0.1",
    async fetch(req) {
      const body = (await req.json()) as { model: string; messages: { content: string }[] };
      asked.push({ auth: req.headers.get("authorization"), model: body.model, system: body.messages[0]!.content, user: body.messages[1]!.content });
      if (status !== 200) return new Response("the service is down", { status });
      return Response.json({ choices: [{ message: { role: "assistant", content: JSON.stringify({ memories }) } }] });
    },
  });
  servers.push({ stop: () => server.stop(true) });
  const env = { MEME_MODEL_URL: `http://127.0.0.1:${server.port}/v1`, MEME_MODEL_NAME: "fake-1", MEME_MODEL_KEY: "sk-test-key-0123456789" };
  return { asked, env };
}

const KEPT = [
  { text: "装依赖一律用 pnpm，不要用 npm", kind: "fact", about: "project", quote: "以后装依赖一律用 pnpm，别再用 npm 了", at: 1 },
  { text: "跑测试前要先启动数据库", kind: "experience", about: "project", quote: "connect ECONNREFUSED 127.0.0.1:5432", at: 1, when: "跑测试时" },
  { text: "用户喜欢用 tab 缩进", kind: "fact", about: "user", quote: "我一直用 tab", at: 1 },
];

const update = (w: World, env: Record<string, string>, ...args: string[]) => runAsync(w, ["memory", "update", ...args], { env });

describe("meme memory update", () => {
  test("--dry-run lists what would be read and where it would go, and sends nothing", async () => {
    const { w } = quiet();
    const m = model(KEPT);
    const r = await update(w, m.env, "--dry-run");
    expect(r.code).toBe(0);
    expect(r.out).toMatch(new RegExp(`^Would read 1 session, about [\\d,]+ tokens, and send them to fake-1 at http://127\\.0\\.0\\.1:\\d+/v1:\\n  dddddddd  Claude Code  ~/work/tool  [\\d,]+ tokens\\nNot read: 2 sessions that ended more than 14 days ago; --all reads them too\\.\\nNothing is sent by --dry-run\\.\\n$`));
    expect(m.asked).toEqual([]);
    expect(run(w, ["memory"]).out).toStartWith("Nothing remembered yet.");
  });

  test("without a model it says how to set one up, and nothing is read", async () => {
    const { w } = quiet();
    const r = await update(w, {});
    expect(r.code).toBe(1);
    expect(r.err).toStartWith("meme: no model is set up. Reading sessions sends their text to a model you choose, so meme needs to know which:\n  meme model set\n");
    // Still unread: with a model, the next run reads it.
    expect((await update(w, model([]).env)).out).toStartWith("dddddddd  Claude Code  ~/work/tool: kept 0\nRead 1 session:");
  });

  test("what the model wants kept is kept when the words are in the session, and reaches an agent in that project", async () => {
    const { w, tool } = quiet();
    const m = model(KEPT);
    const r = await update(w, m.env);
    expect([r.code, r.err]).toEqual([0, ""]);
    expect(r.out).toBe(
      "dddddddd  Claude Code  ~/work/tool: kept 2, left out 1 (its quote is not in the session)\nRead 1 session: kept 2 entries (2 in force, 0 waiting as candidates), left out 1. `meme memory` lists them.\nNot read: 2 sessions that ended more than 14 days ago; --all reads them too.\n",
    );
    // One question, to the model named, with the key; the session went out with its record numbers.
    expect(m.asked.length).toBe(1);
    expect([m.asked[0]!.auth, m.asked[0]!.model]).toEqual(["Bearer sk-test-key-0123456789", "fake-1"]);
    expect(m.asked[0]!.user).toContain("Project: github.com/me/tool\nAgent: Claude Code\n");
    expect(m.asked[0]!.user).toMatch(/\[#\d+ user\]\n帮我跑一下测试。对了，以后装依赖一律用 pnpm，别再用 npm 了\n/);
    const listed = run(w, ["memory"]).out;
    expect(listed).toMatch(/^Project memory \(github\.com\/me\/tool\) {2}~\/\.meme\/memory\/projects\/tool-[0-9a-f]{8}\/MEMORY\.md\n {2}m-[0-9a-f]{8} {2}装依赖一律用 pnpm，不要用 npm\n\nExperience \(github\.com\/me\/tool\)/);
    expect(listed).not.toContain("tab");
    const id = /m-[0-9a-f]{8}/.exec(listed)![0];
    expect(run(w, ["memory", "show", id]).out).toMatch(new RegExp(`\\n {2}e-[0-9a-f]{8} {2}\\d{4}-\\d\\d-\\d\\d \\d\\d:\\d\\d {2}Claude Code · tool\\n {4}装依赖一律用 pnpm，不要用 npm\\n {4}> 以后装依赖一律用 pnpm，别再用 npm 了\\n`));
    const given = run(w, ["context", "跑测试"], { cwd: tool }).out;
    expect(given).toContain("\nThis project (tool)\n- [");
    expect(given).toMatch(/\nMay apply to this task\n- \[m-[0-9a-f]{8}\] 跑测试前要先启动数据库 \(when: 跑测试时\)\n/);
    // Read once: a second run asks the model nothing.
    expect((await update(w, m.env)).out).toBe("Nothing to read: every session that has been quiet for 2 hours is read already.\n");
    expect(m.asked.length).toBe(1);
  });

  test("an excluded project's sessions are not sent", async () => {
    const { w } = quiet();
    mkdirSync(path.join(w.home, ".meme"));
    writeFileSync(path.join(w.home, ".meme", "config.json"), JSON.stringify({ exclude: ["github.com/me/tool"] }));
    const m = model(KEPT);
    const r = await update(w, m.env);
    expect(r.out).toStartWith("Nothing to read:");
    expect(m.asked).toEqual([]);
  });

  test("when the model fails, it says so, stops, and the session is read by the next run", async () => {
    const { w } = quiet();
    const down = model([], 500);
    const r = await update(w, down.env);
    expect(r.code).toBe(1);
    expect(r.err).toMatch(/^meme: the model at http:\/\/127\.0\.0\.1:\d+\/v1 answered 500: the service is down\nStopped there\. What was read before it is kept; the rest is read by the next run\.\n$/);
    expect((await update(w, model([]).env)).out).toStartWith("dddddddd  Claude Code  ~/work/tool: kept 0\n");
  });

  test("--session reads one session, quiet or not, old or not; --all reads the old ones", async () => {
    const { w } = quiet();
    const m = model([]);
    const one = await update(w, m.env, "--session", w.wsl.id.slice(0, 8));
    expect(one.out).toMatch(/^11111111 {2}Claude Code {2}~\/work\/demo: kept 0\nRead 1 session:/);
    const rest = await update(w, m.env, "--all");
    expect(rest.out).toContain("Read 2 sessions:");
    expect(m.asked.length).toBe(3);
    expect(readFileSync(path.join(w.home, ".meme", "state", "processed.jsonl"), "utf8").trim().split("\n").length).toBe(3);
  });
});
