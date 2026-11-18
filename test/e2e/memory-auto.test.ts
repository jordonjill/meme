/**
 * Memory that forms by itself (plan-m2 F9): the pipeline starts in the background when
 * an agent starts, `remember` does not keep what the model judges meant for this time
 * only, and the user reads a digest. The model is a server the test runs.
 */
import { afterEach, describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { ClaudeSession } from "../fixtures/gen-claude";
import { run, runAsync, world, type World } from "./world";

const servers: { stop(): void }[] = [];
afterEach(() => {
  for (const s of servers.splice(0)) s.stop();
});

function model(memories: unknown[]) {
  const asked: string[] = [];
  const server = Bun.serve({
    port: 0,
    hostname: "127.0.0.1",
    async fetch(req) {
      const body = (await req.json()) as { messages: { content: string }[] };
      asked.push(body.messages[1]!.content);
      return Response.json({ choices: [{ message: { role: "assistant", content: JSON.stringify({ memories }) } }] });
    },
  });
  servers.push({ stop: () => server.stop(true) });
  return { asked, env: { MEME_MODEL_URL: `http://127.0.0.1:${server.port}/v1`, MEME_MODEL_NAME: "fake-1", MEME_MODEL_KEY: "sk-test-key-0123456789" } };
}

/** Until `ok` holds, for a few seconds at most. */
async function eventually(ok: () => boolean, ms = 15_000): Promise<boolean> {
  for (const end = Date.now() + ms; Date.now() < end; await Bun.sleep(100)) if (ok()) return true;
  return ok();
}

/** A project and a session in it that went quiet three hours ago, with a rule the user stated. */
function quiet() {
  const w = world();
  const tool = path.join(w.home, "work", "tool");
  mkdirSync(path.join(tool, ".git"), { recursive: true });
  writeFileSync(path.join(tool, ".git", "config"), '[remote "origin"]\n\turl = git@github.com:me/tool.git\n');
  const s = new ClaudeSession({ id: "eeeeeeee-0000-4000-8000-0000000000ee", cwd: tool, start: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString() });
  s.user("限流统一在应用里用 Redis 做，以后都这样");
  s.assistant("好的。");
  s.write(path.join(w.home, ".claude", "projects"));
  return { w, tool };
}

const state = (w: World, name: string) => path.join(w.home, ".meme", "state", name);
const RULE = [{ text: "限流统一在应用里用 Redis 实现", kind: "fact", about: "project", quote: "限流统一在应用里用 Redis 做", at: 1 }];

describe("the pipeline starts by itself", () => {
  test("when an agent starts, with a model set up: memory catches up in the background; not again within hours", async () => {
    const { w, tool } = quiet();
    const m = model(RULE);
    const env = { ...m.env, MEME_NO_AUTO_UPDATE: "" };
    const first = await runAsync(w, ["context"], { cwd: tool, env });
    expect(first.code).toBe(0);
    // It answered at once; the reading happens after, in a process of its own.
    expect(await eventually(() => existsSync(state(w, "processed.jsonl")))).toBe(true);
    expect(m.asked.length).toBe(1);
    expect(run(w, ["memory"]).out).toContain("限流统一在应用里用 Redis 实现");
    const started = readFileSync(state(w, "last-update"), "utf8");
    await runAsync(w, ["context"], { cwd: tool, env });
    await Bun.sleep(1500);
    expect(readFileSync(state(w, "last-update"), "utf8")).toBe(started);
    expect(m.asked.length).toBe(1);
  }, 30_000);

  test("without a model, or turned off, nothing is started", async () => {
    const { w, tool } = quiet();
    await runAsync(w, ["context"], { cwd: tool, env: { MEME_NO_AUTO_UPDATE: "" } });
    const m = model(RULE);
    mkdirSync(path.join(w.home, ".meme"), { recursive: true });
    writeFileSync(path.join(w.home, ".meme", "config.json"), JSON.stringify({ auto: false }));
    await runAsync(w, ["context"], { cwd: tool, env: { ...m.env, MEME_NO_AUTO_UPDATE: "" } });
    await Bun.sleep(1500);
    expect(existsSync(state(w, "last-update"))).toBe(false);
    expect(m.asked).toEqual([]);
  });
});

describe("remember and the digest", () => {
  test("what the model judges meant for this time only is not kept, in one line; --as-is keeps it", async () => {
    const w = world();
    const m = model([]);
    const r = await runAsync(w, ["remember", "这次先别跑测试"], { env: m.env });
    expect([r.code, r.out]).toEqual([0, 'Not kept: it reads as meant for this time only. To keep it anyway: meme remember --as-is "这次先别跑测试"\n']);
    expect(run(w, ["memory"]).out).toStartWith("Nothing remembered yet.");
    const kept = await runAsync(w, ["remember", "--as-is", "这次先别跑测试"], { env: m.env });
    expect(kept.out).toMatch(/^Remembered m-[0-9a-f]{8} in ~\/\.meme\/memory\/RULES\.md\.\n$/);
    expect(m.asked.length).toBe(1);
  });

  test("the digest tells what came in and what was not kept, once; meme status says when there is something new", async () => {
    const w = world();
    const m = model([]);
    run(w, ["remember", "Reply in Chinese."]);
    await runAsync(w, ["remember", "这次先别跑测试"], { env: m.env });
    expect(run(w, ["status"]).out).toContain("; 1 new since you last looked: meme memory digest\n");
    const d = run(w, ["memory", "digest"]).out;
    expect(d).toStartWith("What meme did with your memory so far:\n\nRemembered (1)\n");
    expect(d).toMatch(/\n {2}m-[0-9a-f]{8} {2}Reply in Chinese\. {2}\(rules · meme remember\)\n/);
    expect(d).toContain("\nNot kept: 1, as meant for that time only or not found in what you said (--all lists them)\n");
    expect(run(w, ["memory", "digest"]).out).toMatch(/^Nothing new since you last looked \(.+\)\. `meme memory` lists everything remembered\.\n$/);
    expect(run(w, ["status"]).out).not.toContain("new since you last looked");
  });
});
