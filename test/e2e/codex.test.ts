/** End to end: Codex sessions next to Claude Code ones, in both directions. */
import { describe, expect, test } from "bun:test";
import { chmodSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { CodexSession, sampleCodex, writeIndex } from "../fixtures/gen-codex";
import { run, world, type World } from "./world";

const CODEX_ID = "c0dec0de-0000-4000-8000-0000000000aa";
const demoDir = (w: World) => path.join(w.home, "work", "demo");

function withCodex(w: World) {
  mkdirSync(demoDir(w), { recursive: true });
  const s = sampleCodex({ id: CODEX_ID, cwd: demoDir(w), start: "2026-10-10T08:00:00.000Z" });
  s.write(path.join(w.home, ".codex"));
  writeIndex(path.join(w.home, ".codex"), [[CODEX_ID, "codex lab"]]);
  return s;
}

function fakeAgent(w: World, name: string) {
  const bin = path.join(w.home, "fake-bin");
  mkdirSync(bin, { recursive: true });
  const record = path.join(w.home, `${name}-was-called`);
  writeFileSync(path.join(bin, name), `#!/bin/sh\npwd > "${record}.cwd"\nfor a in "$@"; do printf '%s\\n' "$a"; done > "${record}.args"\nexit 0\n`);
  chmodSync(path.join(bin, name), 0o755);
  return { bin, cwd: () => readFileSync(`${record}.cwd`, "utf8").trim(), args: () => readFileSync(`${record}.args`, "utf8").trimEnd().split("\n") };
}

describe.skipIf(process.platform === "win32")("Codex sessions", () => {
  test("ls lists Codex·WSL sessions beside Claude Code ones", () => {
    const w = world();
    withCodex(w);
    const r = run(w, ["ls"], { cwd: demoDir(w) });
    expect(r.out).toMatch(/c0dec0de {2}Codex·WSL .* codex lab\n/);
    expect(r.out).toMatch(/11111111 {2}CC·WSL /);
    expect(run(w, ["ls", "--agent", "codex"], { cwd: demoDir(w) }).out).not.toContain("11111111");
  });

  test("continue codex hands over the Codex session; inside Codex its own session is left out", () => {
    const w = world();
    withCodex(w);
    const one = run(w, ["continue", "codex"], { cwd: demoDir(w) });
    expect(one.out).toStartWith("# Handoff: codex lab\nSource: Codex·WSL · session c0dec0de · ");
    expect(one.out).toContain("- apply_patch(");
    const inside = run(w, ["continue"], { cwd: demoDir(w), env: { CODEX_THREAD_ID: CODEX_ID } });
    expect(inside.out).not.toContain("c0dec0de");
    expect(inside.out).toContain("11111111");
  });

  test("inside Codex a handoff stays under 36,000 bytes", () => {
    const w = world();
    mkdirSync(demoDir(w), { recursive: true });
    const big = new CodexSession({ id: "c0dec0de-0000-4000-8000-0000000000bb", cwd: demoDir(w) });
    for (let i = 1; i <= 60; i++) {
      big.user(`第 ${i} 步：` + "请继续整理导入模块，并说明这一步改了什么。".repeat(12));
      big.assistant("已完成。" + "导入模块现在又多处理了一种情况。".repeat(10));
    }
    big.write(path.join(w.home, ".codex"));
    const outside = run(w, ["continue", "c0dec0de-0000-4000-8000-0000000000bb"]);
    const inside = run(w, ["continue", "c0dec0de-0000-4000-8000-0000000000bb"], { env: { CODEX_THREAD_ID: "c0dec0de-0000-4000-8000-0000000000ff" } });
    expect(Buffer.byteLength(outside.out)).toBeGreaterThan(36_000);
    expect(outside.out.length).toBeLessThanOrEqual(25_000);
    expect(Buffer.byteLength(inside.out)).toBeLessThanOrEqual(36_000);
    expect(inside.out).toContain("\n1. 第 1 步：");
    expect(inside.out).toContain("\n60. 第 60 步：");
  });

  test("push to Codex: codex starts in the project and is asked to run meme continue itself", () => {
    const w = world();
    withCodex(w);
    const fake = fakeAgent(w, "codex");
    const r = run(w, ["continue", "1111", "--in", "codex"], { env: { PATH: `${fake.bin}:/usr/bin:/bin`, MEME_TERMINAL: "1" } });
    expect(r.code).toBe(0);
    expect(r.out).toBe("Continuing 11111111 (Status line setup) in Codex, in ~/work/demo\n");
    expect(fake.cwd()).toBe(demoDir(w));
    expect(fake.args()).toEqual([
      "Continue an earlier session: run `meme continue 11111111` (its output can be up to 10,000 tokens; allow that much) and follow the instructions at the top of its output.",
    ]);
  });

  test("push to Claude Code from a Codex session", () => {
    const w = world();
    withCodex(w);
    const fake = fakeAgent(w, "claude");
    const r = run(w, ["continue", "c0dec0de", "--in", "claude"], { env: { PATH: `${fake.bin}:/usr/bin:/bin`, MEME_TERMINAL: "1" } });
    expect(r.out).toBe("Continuing c0dec0de (codex lab) in Claude Code, in ~/work/demo\n");
    expect(fake.args()[0]).toBe("Continue an earlier session: run `meme continue c0dec0de` and follow the instructions at the top of its output.");
  });
});
