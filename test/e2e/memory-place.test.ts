/**
 * Where memory is kept in WSL (plan-m2 F6): in the Windows user's folder, read and
 * written from WSL, with one link in WSL's data folder. The world is WSL with a
 * Windows user `me`; these tests leave MEME_STORE unset, as on a real machine.
 */
import { describe, expect, test } from "bun:test";
import { existsSync, lstatSync, readFileSync, readlinkSync, readdirSync } from "node:fs";
import path from "node:path";
import { run, world, type World } from "./world";

const real = { env: { MEME_STORE: "" } };
const windows = (w: World, ...rest: string[]) => path.join(w.users, "me", ".meme", ...rest);

describe("memory in WSL lives on the Windows side", () => {
  test("remember writes into the Windows user's folder; WSL keeps a link to it and its own caches", () => {
    const w = world();
    const r = run(w, ["remember", "Do not push unless asked."], real);
    expect(r.code).toBe(0);
    expect(r.out).toMatch(/^Remembered m-[0-9a-f]{8} in ~\/mnt-c-Users\/me\/\.meme\/memory\/RULES\.md\.\n$/);
    expect(readFileSync(windows(w, "memory", "RULES.md"), "utf8")).toContain("Do not push unless asked.");
    expect(readdirSync(windows(w)).sort()).toEqual(["FORMAT", "evidence", "memory", "state"]);
    const link = path.join(w.home, ".meme", "store");
    expect(lstatSync(link).isSymbolicLink()).toBe(true);
    expect(readlinkSync(link)).toBe(windows(w));
    // Nothing of memory is in WSL's own folder, and through the link a person finds it.
    expect(readdirSync(path.join(w.home, ".meme")).sort()).toEqual(["store"]);
    expect(readFileSync(path.join(link, "memory", "RULES.md"), "utf8")).toContain("Do not push unless asked.");
  });

  test("every memory command goes there: list, show, context, recall, the tools over MCP", () => {
    const w = world();
    const id = /m-[0-9a-f]{8}/.exec(run(w, ["remember", "Do not push unless asked."], real).out)![0];
    expect(run(w, ["memory"], real).out).toBe(`Rules  ~/mnt-c-Users/me/.meme/memory/RULES.md\n  ${id}  Do not push unless asked.\n`);
    expect(run(w, ["memory", "show", id], real).out).toContain("  in ~/mnt-c-Users/me/.meme/memory/RULES.md\n");
    expect(run(w, ["context"], real).out).toContain(`- [${id}] Do not push unless asked.\n`);
    expect(run(w, ["recall", "push"], real).out).toContain(id);
    const call = JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "recall", arguments: { words: "push" } } });
    expect(run(w, ["mcp"], { ...real, input: call + "\n" }).out).toContain(id);
    expect(run(w, ["status"], real).out).toContain("\nMemory:       ~/mnt-c-Users/me/.meme, 1 entry\n");
    // The mirror of the sessions is WSL's own: SQLite stays on its own system.
    expect(existsSync(path.join(w.home, ".meme", "raw", "sessions.sqlite"))).toBe(true);
    expect(existsSync(windows(w, "raw"))).toBe(false);
  });

  test("uninstalling in WSL removes the link and WSL's caches; the memory on the Windows side stays", () => {
    const w = world();
    run(w, ["remember", "Do not push unless asked."], real);
    run(w, ["ls"], real);
    expect(run(w, ["uninstall", "--yes"], real).code).toBe(0);
    expect(existsSync(path.join(w.home, ".meme"))).toBe(false);
    expect(readFileSync(windows(w, "memory", "RULES.md"), "utf8")).toContain("Do not push unless asked.");
  });
});
