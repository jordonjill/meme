/**
 * `meme model`, `meme memory exclude`, and remembering through meme's own model
 * (plan-m2 F8). The model is a server the test runs, in the OpenAI chat form.
 */
import { afterEach, describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { ClaudeSession } from "../fixtures/gen-claude";
import { run, runAsync, runTyped, SCRIPT, world, type World } from "./world";

const servers: { stop(): void }[] = [];
afterEach(() => {
  for (const s of servers.splice(0)) s.stop();
});

/** A model service: answers every question with `memories`, or with `status`; keeps what it was asked. */
function model(memories: unknown[] = [], status = 200) {
  const asked: { auth: string | null; system: string; user: string }[] = [];
  const server = Bun.serve({
    port: 0,
    hostname: "127.0.0.1",
    async fetch(req) {
      const body = (await req.json()) as { messages: { content: string }[] };
      asked.push({ auth: req.headers.get("authorization"), system: body.messages[0]!.content, user: body.messages[1]!.content });
      if (status !== 200) return new Response("the service is down", { status });
      return Response.json({ choices: [{ message: { role: "assistant", content: JSON.stringify({ memories }) } }] });
    },
  });
  servers.push({ stop: () => server.stop(true) });
  const url = `http://127.0.0.1:${server.port}/v1`;
  return { asked, url, env: { MEME_MODEL_URL: url, MEME_MODEL_NAME: "fake-1", MEME_MODEL_KEY: "sk-test-key-0123456789" } };
}

const config = (w: World) => path.join(w.home, ".meme", "config.json");
const read = (w: World) => JSON.parse(readFileSync(config(w), "utf8"));

describe("meme model", () => {
  test("with nothing set up it says so", () => {
    expect(run(world(), ["model"]).out).toBe("No model is set up: meme sends nothing anywhere.\n`meme model set` sets one up.\n");
  });

  test("set with --url, --name and --key-env: tried once, saved without the key, shown with the key's last characters", async () => {
    const w = world();
    const m = model();
    const env = { MY_KEY: "sk-from-env-0123456789" };
    const r = await runAsync(w, ["model", "set", "--url", `${m.url}/`, "--name", "fake-1", "--key-env", "MY_KEY"], { env });
    expect([r.code, r.err]).toEqual([0, ""]);
    expect(r.out).toMatch(new RegExp(`^Trying fake-1 at ${m.url.replace(/[./]/g, "\\$&")}…\\nIt answered in \\d+\\.\\d s\\.\\nSaved in ~/\\.meme/config\\.json\\.\\n$`));
    expect(m.asked.map((a) => a.auth)).toEqual(["Bearer sk-from-env-0123456789"]);
    expect(read(w)).toEqual({ model: { url: m.url, name: "fake-1", keyEnv: "MY_KEY" } });
    expect(readFileSync(config(w), "utf8")).not.toContain("sk-from-env");
    expect(run(w, ["model"], { env }).out).toBe(`Model:  fake-1 at ${m.url}\nKey:    from MY_KEY, …6789\nSet in: ~/.meme/config.json\nUsed by \`meme memory update\`, and to word what you ask to remember.\n`);
    expect(run(w, ["model"]).out).toContain("Key:    from MY_KEY, which is not set here\n");
  });

  test.skipIf(!SCRIPT)("set at a terminal asks for each part; the key is not shown as it is typed, and is kept where only the user can read it", async () => {
    const w = world();
    const m = model();
    const r = await runTyped(w, ["model", "set"], [m.url, "fake-1", "sk-typed-secret-98765"]);
    expect(r.out).toContain("Address of the model service");
    expect(r.out).toContain("Key (not shown;");
    expect(r.out).not.toContain("sk-typed-secret");
    expect(r.out).toContain("Saved in ~/.meme/config.json, which only you can read; the key is in it as it is.");
    expect(read(w)).toEqual({ model: { url: m.url, name: "fake-1", key: "sk-typed-secret-98765" } });
    if (process.platform !== "win32") expect(statSync(config(w)).mode & 0o777).toBe(0o600);
    expect(m.asked[0]!.auth).toBe("Bearer sk-typed-secret-98765");
    expect(run(w, ["model"]).out).toContain("Key:    …8765, in ~/.meme/config.json\n");
  });

  test("a model that does not answer is not saved", async () => {
    const w = world();
    const down = model([], 500);
    const r = await runAsync(w, ["model", "set", "--url", down.url, "--name", "fake-1", "--no-key"]);
    expect(r.code).toBe(1);
    expect(r.err).toMatch(/^meme: the model at http:\/\/127\.0\.0\.1:\d+\/v1 answered 500: the service is down\nNothing was saved\. Check the address, the name and the key, or add --no-test to save it anyway\.\n$/);
    expect(existsSync(config(w))).toBe(false);
  });

  test("where it cannot ask, or inside an agent, set takes no key: it needs --key-env or --no-key", () => {
    const w = world();
    const r = run(w, ["model", "set", "--url", "http://127.0.0.1:9/v1", "--name", "x"]);
    expect([r.code, r.err.split("\n")[0]]).toEqual([2, "meme model: set needs a terminal to ask; here give --url, --name, and --key-env <VAR> or --no-key (a key is never given on the command line)"]);
    expect(run(w, ["model", "set", "--key-env", "A", "--no-key"]).err.split("\n")[0]).toBe("meme model: --key-env and --no-key do not go together");
    expect(run(w, ["model", "--url", "x"]).err.split("\n")[0]).toBe("meme model: --url, --name, --key-env, --no-key and --no-test go with set");
  });

  test("test asks once; remove takes the model out and leaves the rest of the file", async () => {
    const w = world();
    const m = model();
    mkdirSync(path.join(w.home, ".meme"), { recursive: true });
    writeFileSync(config(w), JSON.stringify({ model: { url: m.url, name: "fake-1" }, exclude: ["/work/secret"] }));
    const tried = await runAsync(w, ["model", "test"]);
    expect(tried.out).toMatch(new RegExp(`^fake-1 at ${m.url.replace(/[./]/g, "\\$&")} answered in \\d+\\.\\d s: `));
    expect(run(w, ["model", "remove"]).out).toBe("Removed the model from ~/.meme/config.json. From now on nothing is sent.\n");
    expect(read(w)).toEqual({ exclude: ["/work/secret"] });
    expect(run(w, ["model", "remove"]).out).toBe("No model was set up in the file; nothing to remove.\n");
    const none = run(w, ["model", "test"]);
    expect([none.code, none.err]).toEqual([1, "meme: no model is set up; `meme model set` sets one up\n"]);
  });
});

describe("meme memory exclude", () => {
  test("a folder is kept as what its project is known by; listed, refused twice, taken off", () => {
    const w = world();
    const tool = path.join(w.home, "work", "tool");
    mkdirSync(path.join(tool, ".git"), { recursive: true });
    writeFileSync(path.join(tool, ".git", "config"), '[remote "origin"]\n\turl = git@github.com:me/tool.git\n');
    expect(run(w, ["memory", "exclude"]).out).toBe("No project is excluded: the sessions of every project may be sent to the model you set up.\n");
    expect(run(w, ["memory", "exclude", "."], { cwd: tool }).out).toBe("Excluded github.com/me/tool: its sessions are never sent to the model, and what you ask to remember there is kept in your own words.\n");
    expect(run(w, ["memory", "exclude", "github.com/me/tool"]).out).toBe("github.com/me/tool is excluded already.\n");
    run(w, ["memory", "exclude", "~/private"]);
    expect(run(w, ["memory", "exclude"]).out).toBe("Never sent to the model:\n  github.com/me/tool\n  ~/private\n");
    expect(read(w).exclude).toEqual(["github.com/me/tool", path.join(w.home, "private")]);
    expect(run(w, ["memory", "exclude", "--remove", "."], { cwd: tool }).out).toBe("github.com/me/tool is no longer excluded.\n");
    const gone = run(w, ["memory", "exclude", "--remove", "github.com/me/other"]);
    expect([gone.code, gone.err]).toEqual([1, "meme: github.com/me/other is not excluded; excluded are: ~/private\n"]);
  });
});

describe("remembering through meme's model", () => {
  const WORDS = "以后装依赖一律用 pnpm，别再用 npm 了";
  const WORDED = [{ text: "装依赖用 pnpm，不要用 npm", kind: "fact", about: "project", quote: "以后装依赖一律用 pnpm", at: 0 }];

  function repo(w: World) {
    const tool = path.join(w.home, "work", "tool");
    mkdirSync(path.join(tool, ".git"), { recursive: true });
    writeFileSync(path.join(tool, ".git", "config"), '[remote "origin"]\n\turl = git@github.com:me/tool.git\n');
    return tool;
  }

  test("meme remember: the model words and places it; secrets are masked before anything is sent", async () => {
    const w = world();
    const tool = repo(w);
    const m = model(WORDED);
    const r = await runAsync(w, ["remember", `${WORDS}; the token is ghp_abcdefghijklmnopqrstuvwxyz0123456789`], { cwd: tool, env: m.env });
    expect([r.code, r.err]).toEqual([0, ""]);
    expect(r.out).toMatch(/^Remembered m-[0-9a-f]{8} in ~\/\.meme\/memory\/projects\/tool-[0-9a-f]{8}\/MEMORY\.md: 装依赖用 pnpm，不要用 npm\nA secret in it was masked before it was stored\.\n$/);
    expect(m.asked[0]!.system).toContain("The person (the user) asked for something to be remembered.");
    expect(m.asked[0]!.user).toContain("Project: github.com/me/tool\n");
    expect(m.asked[0]!.user).not.toContain("ghp_");
    const [day] = readdirSync(path.join(w.home, ".meme", "evidence"));
    expect(readFileSync(path.join(w.home, ".meme", "evidence", day!), "utf8")).toMatch(/· cli\n {2}装依赖用 pnpm，不要用 npm\n {2}> 以后装依赖一律用 pnpm\n$/);
  });

  test("meme remember when the model is down: the words are kept as they are, and that is said", async () => {
    const w = world();
    const down = model([], 500);
    const r = await runAsync(w, ["remember", "Use pnpm."], { env: down.env });
    expect(r.code).toBe(0);
    expect(r.out).toMatch(/^Remembered m-[0-9a-f]{8} in ~\/\.meme\/memory\/RULES\.md\.\nThe model could not be asked \(the model at http:\/\/127\.0\.0\.1:\d+\/v1 answered 500: the service is down\); your words were kept as they are\.\n$/);
  });

  test("in an excluded project nothing is sent: the words go in as they are", async () => {
    const w = world();
    const tool = repo(w);
    const m = model(WORDED);
    run(w, ["memory", "exclude", "."], { cwd: tool });
    const r = await runAsync(w, ["remember", WORDS], { cwd: tool, env: m.env });
    expect(r.out).toMatch(/^Remembered m-[0-9a-f]{8} in ~\/\.meme\/memory\/RULES\.md\.\n$/);
    expect(m.asked).toEqual([]);
  });

  test("an agent's remember: the user's message and those around it go to the model, which words the memory", async () => {
    const w = world();
    const tool = repo(w);
    const s = new ClaudeSession({ id: "aaaaaaaa-0000-4000-8000-00000000000a", cwd: tool, start: new Date().toISOString() });
    s.user("帮我跑一下测试");
    s.assistant("测试通过了。");
    s.user(WORDS);
    s.assistant("好的，记住了。");
    s.write(path.join(w.home, ".claude", "projects"));
    const m = model(WORDED);
    const lines = [
      JSON.stringify({ jsonrpc: "2.0", id: 0, method: "initialize", params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "claude-code", version: "1" } } }),
      JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "remember", arguments: { quote: "装依赖一律用 pnpm", note: "a rule for this repository" } } }),
    ];
    const r = await runAsync(w, ["mcp"], { cwd: tool, env: m.env, input: lines.join("\n") + "\n" });
    const reply = r.out
      .split("\n")
      .filter(Boolean)
      .map((l) => JSON.parse(l))
      .find((x) => x.id === 1);
    expect(reply.result.content[0].text).toMatch(/^Remembered: \[m-[0-9a-f]{8}\] 装依赖用 pnpm，不要用 npm$/);
    const asked = m.asked[0]!.user;
    expect(asked).toMatch(/The user asked to remember what they said in record #\d+, in particular: 装依赖一律用 pnpm\.\n/);
    expect(asked).toContain("The agent that asked adds: a rule for this repository\n");
    expect(asked).toContain("帮我跑一下测试");
    expect(asked).toContain("好的，记住了。");
  });
});
