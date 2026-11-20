/**
 * `meme remember` run inside an agent (plan-m2 F10): the agent may be the one running
 * it, so the words count only when they are found among what the user said, as with
 * MCP's `remember`. The user's own `! meme remember` shows in the session once it has
 * run; until then it waits in the inbox.
 */
import { afterEach, describe, expect, test } from "bun:test";
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { ClaudeSession } from "../fixtures/gen-claude";
import { run, runAsync, world, type World } from "./world";

const SESSION = "abababab-0000-4000-8000-0000000000ab";
const IN_AGENT = { CLAUDECODE: "1" };

const servers: { stop(): void }[] = [];
afterEach(() => {
  for (const s of servers.splice(0)) s.stop();
});

function model(memories: unknown[]) {
  const server = Bun.serve({
    port: 0,
    hostname: "127.0.0.1",
    fetch: () => Response.json({ choices: [{ message: { role: "assistant", content: JSON.stringify({ memories }) } }] }),
  });
  servers.push({ stop: () => server.stop(true) });
  return { MEME_MODEL_URL: `http://127.0.0.1:${server.port}/v1`, MEME_MODEL_NAME: "fake-1", MEME_MODEL_KEY: "sk-test-key-0123456789" };
}

/** A project with a session in it where the user stated a rule. */
function setup() {
  const w = world();
  const tool = path.join(w.home, "work", "tool");
  mkdirSync(path.join(tool, ".git"), { recursive: true });
  writeFileSync(path.join(tool, ".git", "config"), '[remote "origin"]\n\turl = git@github.com:me/tool.git\n');
  const s = new ClaudeSession({ id: SESSION, cwd: tool, start: new Date(Date.now() - 10 * 60 * 1000).toISOString() });
  s.user("对了，以后装依赖一律用 pnpm，别再用 npm 了");
  s.assistant("好的，以后都用 pnpm。");
  s.write(path.join(w.home, ".claude", "projects"));
  return { w, tool, s };
}

const inbox = (w: World) => {
  try {
    return readdirSync(path.join(w.home, ".meme", "state", "inbox")).map((n) => path.join(w.home, ".meme", "state", "inbox", n));
  } catch {
    return [];
  }
};
const listed = (w: World) => run(w, ["memory"]).out;

describe("meme remember inside an agent", () => {
  test("words the user said are kept as the user's, pointing at their message", () => {
    const { w, tool } = setup();
    const r = run(w, ["remember", "以后装依赖一律用 pnpm"], { cwd: tool, env: IN_AGENT });
    expect(r.code).toBe(0);
    expect(r.out).toMatch(/^Remembered: \[m-[0-9a-f]{8}\] 以后装依赖一律用 pnpm\n$/);
    const [day] = readdirSync(path.join(w.home, ".meme", "evidence"));
    const evidence = readFileSync(path.join(w.home, ".meme", "evidence", day!), "utf8");
    expect(evidence).toContain("· meme remember in Claude Code\n");
    expect(evidence).toMatch(new RegExp(`· stated · user · user · session:${SESSION}#\\d+\\n`));
  });

  test("words the user did not say are not kept now; once they have not shown for a while, they are not kept at all", async () => {
    const { w, tool } = setup();
    const r = run(w, ["remember", "Always use tabs for indentation"], { cwd: tool, env: IN_AGENT });
    expect(r.code).toBe(0);
    expect(r.out).toBe("Not among what the user said yet. If the user typed this, it is kept once it shows in the session; an agent passes the user's own words, exactly as they wrote them.\n");
    expect(listed(w)).not.toContain("tabs");
    const [item] = inbox(w);
    // Older than the wait for words to show.
    const old = JSON.parse(readFileSync(item!, "utf8"));
    writeFileSync(item!, JSON.stringify({ ...old, at: new Date(Date.now() - 10 * 60 * 1000).toISOString() }));
    const done = await runAsync(w, ["memory", "update", "--inbox"]);
    expect(done.out).toBe("Worded 0 things passed on to remember; 1 not kept, not found in what you said.\n");
    expect(inbox(w)).toEqual([]);
    expect(listed(w)).not.toContain("tabs");
    expect(run(w, ["memory", "digest", "--all"]).out).toContain("\nNot kept (1)\n  Always use tabs for indentation  (not found in what you said; meme remember in Claude Code, ");
  });

  test("the user's own `! meme remember` is kept once the session shows it", async () => {
    const { w, tool, s } = setup();
    expect(run(w, ["remember", "--project", "测试前先启动数据库"], { cwd: tool, env: IN_AGENT }).out).toStartWith("Not among what the user said yet.");
    // The agent writes the command to the session once it has run.
    s.user('<bash-input>meme remember --project "测试前先启动数据库"</bash-input>');
    s.user("<bash-stdout>Not among what the user said yet.</bash-stdout><bash-stderr></bash-stderr>");
    s.write(path.join(w.home, ".claude", "projects"));
    const done = await runAsync(w, ["memory", "update", "--inbox"]);
    expect(done.out).toBe("Worded 1 thing passed on to remember.\n");
    expect(listed(w)).toMatch(/^Project memory \(github\.com\/me\/tool\) .*\n {2}m-[0-9a-f]{8} {2}测试前先启动数据库\n/m);
  });

  test("with a model: answered at once, worded by the model from the inbox", async () => {
    const { w, tool } = setup();
    const env = { ...IN_AGENT, ...model([{ text: "装依赖用 pnpm，不要用 npm", kind: "fact", about: "project", quote: "以后装依赖一律用 pnpm", at: 1 }]) };
    const r = run(w, ["remember", "以后装依赖一律用 pnpm"], { cwd: tool, env });
    expect(r.out).toBe("Noted. meme words it and keeps it if it holds beyond this task.\n");
    expect(inbox(w).length).toBe(1);
    // In a test nothing starts by itself; the background run is this.
    expect((await runAsync(w, ["memory", "update", "--inbox"], { env })).out).toBe("Worded 1 thing passed on to remember.\n");
    expect(listed(w)).toContain("  装依赖用 pnpm，不要用 npm\n");
  });

  test("with a model and nothing stopping it, the background run words it by itself", async () => {
    const { w, tool } = setup();
    const env = { ...IN_AGENT, MEME_NO_AUTO_UPDATE: "", ...model([{ text: "装依赖用 pnpm，不要用 npm", kind: "fact", about: "project", quote: "以后装依赖一律用 pnpm", at: 1 }]) };
    expect(run(w, ["remember", "以后装依赖一律用 pnpm"], { cwd: tool, env }).out).toStartWith("Noted.");
    let shown = "";
    for (const end = Date.now() + 15_000; Date.now() < end && !shown.includes("pnpm"); await Bun.sleep(200)) shown = listed(w);
    expect(shown).toContain("  装依赖用 pnpm，不要用 npm\n");
  });

  test("outside an agent, what is typed is the user's own, as before", () => {
    const { w, tool } = setup();
    expect(run(w, ["remember", "Always use tabs for indentation"], { cwd: tool }).out).toMatch(/^Remembered m-[0-9a-f]{8} in ~\/\.meme\/memory\/RULES\.md\.\n$/);
  });

  test("--inbox reads no session", () => {
    const { w } = setup();
    expect(run(w, ["memory", "update", "--inbox", "--all"]).err).toContain("--inbox reads no session");
    expect(run(w, ["memory", "show", "m-12345678", "--inbox"]).err).toContain("--dry-run, --session and --inbox go with update");
  });
});
