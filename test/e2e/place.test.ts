/**
 * Where a session is continued (arch.md 6.3, D20): the examples of its table,
 * one by one. Windows drives are mounted inside the test's home through a
 * wsl.conf of its own, so `C:\code\shop` is a real directory here.
 */
import { describe, expect, test } from "bun:test";
import { chmodSync, mkdirSync, readFileSync, renameSync, symlinkSync, writeFileSync } from "node:fs";
import path from "node:path";
import { ClaudeSession } from "../fixtures/gen-claude";
import { run, world, type World } from "./world";

const MEME = "aaaa0001-0000-4000-8000-000000000001";
const FIX = "aaaa0002-0000-4000-8000-000000000002";
const SHOP = "aaaa0003-0000-4000-8000-000000000003";
const MINIMAL_PATH = "/usr/bin:/bin";

function placeWorld() {
  const w = world();
  const drives = path.join(w.home, "drives");
  writeFileSync(path.join(w.home, "wsl.conf"), `[automount]\nroot = ${drives}/\noptions = "metadata"\n`);
  const work = path.join(w.home, "work");
  // WSL: meme (main) and its worktree meme-fix (fix), and notes, which has nothing to do with them.
  mkdirSync(path.join(work, "meme", ".git", "worktrees", "meme-fix"), { recursive: true });
  mkdirSync(path.join(work, "meme", "src"), { recursive: true });
  mkdirSync(path.join(work, "meme-fix"), { recursive: true });
  writeFileSync(path.join(work, "meme-fix", ".git"), `gitdir: ${path.join(work, "meme", ".git", "worktrees", "meme-fix")}\n`);
  mkdirSync(path.join(work, "notes", ".git"), { recursive: true });
  // Windows: C:\code\shop, a repository; S1 started in its web folder. Another clone in WSL.
  mkdirSync(path.join(drives, "c", "code", "shop", ".git"), { recursive: true });
  mkdirSync(path.join(drives, "c", "code", "shop", "web"), { recursive: true });
  mkdirSync(path.join(work, "shop", ".git"), { recursive: true });

  const projects = path.join(w.home, ".claude", "projects");
  const s = (id: string, cwd: string, text: string, start: string) => {
    const x = new ClaudeSession({ id, cwd, start });
    x.user(text);
    x.assistant("ok");
    return x;
  };
  s(MEME, path.join(work, "meme"), "meme work", "2026-10-11T08:00:00.000Z").write(projects);
  s(FIX, path.join(work, "meme-fix"), "fix work", "2026-10-11T09:00:00.000Z").write(projects);
  // Windows sessions are found under the mount root from wsl.conf: <drives>/c/Users.
  s(SHOP, "C:\\code\\shop\\web", "shop work", "2026-10-11T10:00:00.000Z").write(path.join(drives, "c", "Users", "me", ".claude", "projects"));
  const env = { MEME_WSL_CONF: path.join(w.home, "wsl.conf"), MEME_WINDOWS_USERS_DIR: "" };
  return { w, work, drives, env };
}

function fakeClaude(w: World) {
  const bin = path.join(w.home, "fake-bin");
  mkdirSync(bin, { recursive: true });
  const record = path.join(w.home, "claude-was-called");
  writeFileSync(path.join(bin, "claude"), `#!/bin/sh\npwd -P > "${record}.cwd"\nexit 0\n`);
  chmodSync(path.join(bin, "claude"), 0o755);
  return { bin, cwd: () => readFileSync(`${record}.cwd`, "utf8").trim() };
}

const note = (text: string) => text.split("\n").find((l) => l.startsWith("Note: This session ran in")) ?? null;

describe.skipIf(process.platform === "win32")("where a session is continued (arch.md 6.3)", () => {
  test("1, 2: in the repository, or a folder in it, as usual; a symbolic link to it too", () => {
    const { w, work, env } = placeWorld();
    for (const cwd of [path.join(work, "meme"), path.join(work, "meme", "src")]) {
      const r = run(w, ["continue", "aaaa0001"], { cwd, env });
      expect(r.code).toBe(0);
      expect(r.out).toContain("# Handoff: meme work\n");
      expect(note(r.out)).toBeNull();
    }
    symlinkSync(path.join(work, "meme"), path.join(w.home, "link"));
    expect(note(run(w, ["continue", "aaaa0001"], { cwd: path.join(w.home, "link"), env }).out)).toBeNull();
  });

  test("3: a Windows session in its /mnt/c path, as usual; pushed, it starts in its folder there", () => {
    const { w, drives, env } = placeWorld();
    const shop = path.join(drives, "c", "code", "shop");
    const r = run(w, ["continue", "aaaa0003"], { cwd: shop, env });
    // Found through the mount root wsl.conf names; C:\code\shop\web matched to <root>/c/code/shop/web.
    expect(r.out).toContain(`Source: Claude·Win · session aaaa0003 · dir ${shop}/web (C:\\code\\shop\\web)`);
    expect(note(r.out)).toBeNull();
    expect(r.out).toContain("run git with `-c core.autocrlf=true -c core.filemode=false`");
    const claude = fakeClaude(w);
    const p = run(w, ["continue", "aaaa0003", "--in", "claude"], { cwd: w.home, env: { ...env, PATH: `${claude.bin}:${MINIMAL_PATH}`, MEME_TERMINAL: "1" } });
    expect(p.code).toBe(0);
    expect(claude.cwd()).toBe(path.join(shop, "web"));
  });

  test("4: in another repository: the handoff, and a note to ask first", () => {
    const { w, work, env } = placeWorld();
    const r = run(w, ["continue", "aaaa0001"], { cwd: path.join(work, "notes"), env });
    expect(r.code).toBe(0);
    expect(r.out).toContain("# Handoff: meme work\n");
    expect(note(r.out)).toBe(
      `Note: This session ran in ${path.join(work, "meme")} (WSL). You are in ${path.join(work, "notes")}, which is not that repository. ` +
        "Ask the user where to work before changing anything. They can also run `meme continue aaaa0001` in a terminal to open an agent in the right place.",
    );
    // Right after the Source line.
    expect(r.out.split("\n")[2]).toStartWith("Note: This session ran in");
  });

  test("5: another clone of the same repository is another place", () => {
    const { w, work, env } = placeWorld();
    const r = run(w, ["continue", "aaaa0003"], { cwd: path.join(work, "shop"), env });
    expect(note(r.out)).toBe(
      `Note: This session ran in C:\\code\\shop\\web (Windows). You are in ${path.join(work, "shop")}, which is not that repository. ` +
        "Ask the user where to work before changing anything. They can also run `meme continue aaaa0003` in a terminal to open an agent in the right place.",
    );
  });

  test("6: the repository renamed: pulling gets the note, pushing says where to pull from", () => {
    const { w, work, env } = placeWorld();
    renameSync(path.join(work, "meme"), path.join(work, "meme2"));
    const r = run(w, ["continue", "aaaa0001"], { cwd: path.join(work, "meme2"), env });
    expect(note(r.out)).toBe(
      `Note: This session ran in ${path.join(work, "meme")} (WSL). You are in ${path.join(work, "meme2")}, which is not that directory. ` +
        "Ask the user where to work before changing anything. They can also run `meme continue aaaa0001` in a terminal to open an agent in the right place.",
    );
    const claude = fakeClaude(w);
    const p = run(w, ["continue", "aaaa0001", "--in", "claude"], { cwd: w.home, env: { ...env, PATH: `${claude.bin}:${MINIMAL_PATH}`, MEME_TERMINAL: "1" } });
    expect(p.code).toBe(1);
    expect(p.err).toBe(`meme: the session's directory ${path.join(work, "meme")} is not there. To continue somewhere else, open the agent there and run \`! meme continue aaaa0001\`.\n`);
  });

  test("7: a worktree session: pushed, it starts in the worktree; pulled from the main repository, the note", () => {
    const { w, work, env } = placeWorld();
    const claude = fakeClaude(w);
    const p = run(w, ["continue", "aaaa0002", "--in", "claude"], { cwd: w.home, env: { ...env, PATH: `${claude.bin}:${MINIMAL_PATH}`, MEME_TERMINAL: "1" } });
    expect(p.code).toBe(0);
    expect(claude.cwd()).toBe(path.join(work, "meme-fix"));
    expect(note(run(w, ["continue", "aaaa0002"], { cwd: path.join(work, "meme"), env }).out)).toContain(`This session ran in ${path.join(work, "meme-fix")} (WSL). You are in ${path.join(work, "meme")}, which is not that repository.`);
    expect(note(run(w, ["continue", "aaaa0002"], { cwd: path.join(work, "meme-fix"), env }).out)).toBeNull();
    // The list still groups the worktree with its main repository.
    expect(run(w, ["ls", "--plain"], { cwd: path.join(work, "meme"), env }).out).toContain("fix work");
  });
});
