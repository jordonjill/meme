/** End to end: when an agent's files change under meme (arch.md §6.1). */
import { describe, expect, test } from "bun:test";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { ClaudeSession } from "../fixtures/gen-claude";
import { sampleCodex, writeIndex } from "../fixtures/gen-codex";
import { run, world, type World } from "./world";

const BROKEN = "c0deba0d-0000-4000-8000-0000000000b1";
const LATER = "c0deba0d-0000-4000-8000-0000000000b2";
const NEWER = "c0de0170-0000-4000-8000-0000000000b3";
const demoDir = (w: World) => path.join(w.home, "work", "demo");
const codexHome = (w: World) => path.join(w.home, ".codex");

describe.skipIf(process.platform === "win32")("agent upgrades", () => {
  test("a file meme cannot convert is still listed, and status, show and continue say why", () => {
    const w = world();
    mkdirSync(demoDir(w), { recursive: true });
    const file = sampleCodex({ id: BROKEN, cwd: demoDir(w), start: "2026-10-10T08:00:00.000Z" }).write(codexHome(w), { zst: true });
    writeIndex(codexHome(w), [[BROKEN, "broken lab"]]);
    writeFileSync(file, "this is not zstd");

    const ls = run(w, ["ls", "-a"]);
    // Listed from the file name, the file's time and the index alone, without converting it.
    expect(ls.out).toMatch(/ c0deba0d {2}Codex·WSL {3}0s ago .*broken lab \(can't read\)\n/);
    expect(ls.out).toContain("\n1 session could not be read, see `meme status`\n");

    const status = run(w, ["status"]).out;
    expect(status).toContain("Can't read:   1 session; meme lists them, with what it read before if anything\n");
    expect(status).toMatch(/ {2}Codex·WSL {3}c0deba0d {2}~\/\.codex\/sessions\/2026\/10\/10\/rollout-2026-10-10T08-00-00-c0deba0d-0000-4000-8000-0000000000b1\.jsonl\.zst {2}\S+.* \(never read\)\n/);
    expect(status).not.toContain("this is not zstd");

    for (const args of [["show", BROKEN], ["continue", BROKEN]]) {
      const r = run(w, args);
      expect(r.code).toBe(1);
      expect(r.err).toMatch(/^meme: meme can't read session c0deba0d \(ZSTD_error_\w+: \S.*\); see `meme status`\n/);
    }
  });

  test("a session read before: the copy from then, marked as of its last activity", () => {
    const w = world();
    mkdirSync(demoDir(w), { recursive: true });
    const s = sampleCodex({ id: LATER, cwd: demoDir(w), start: "2026-10-10T08:00:00.000Z" });
    const file = s.write(codexHome(w), { zst: true });
    writeIndex(codexHome(w), [[LATER, "later lab"]]);
    expect(run(w, ["ls", "-a"]).out).toMatch(/later lab\n/);

    // An upgrade later: the same file, written in a form meme cannot read.
    writeFileSync(file, "this is not zstd either");
    const ls = run(w, ["ls", "-a"]).out;
    expect(ls).toMatch(/later lab \(can't read after 10-10 08:00\)\n/);
    expect(ls).toContain("1 session could not be read, see `meme status`");

    const show = run(w, ["show", LATER, "--plain"]).out;
    expect(show).toMatch(/\nmeme can't read this session's file any more \(\S.*\): this is the session as of 10-10 08:00; what came after is missing\. See `meme status`\.\n/);
    expect(show).toContain("1 ❯ Make add() take any number of arguments and run the tests.");

    const handoff = run(w, ["continue", LATER]).out;
    expect(handoff).toContain("Note: meme can't read this session's file any more; this handoff is the session as of 10-10 08:00, and what came after is missing.");
    expect(handoff).toContain("## User messages (all)\n1. Make add() take any number of arguments and run the tests.");
    // A file that cannot even be unpacked does not say which version wrote it.
    expect(run(w, ["status"]).out).toMatch(/ ZSTD_error_\w+: .* \(shown as of 10-10 08:00\)\n/);

    // Fixed again: nothing to say any more.
    s.write(codexHome(w), { zst: true });
    expect(run(w, ["ls", "-a"]).out).not.toContain("can't read");
    expect(run(w, ["status"]).out).toContain("Can't read:   none\n");
  });

  test("record types meme does not know: status and show name them, with the agent's version", () => {
    const w = world();
    mkdirSync(demoDir(w), { recursive: true });
    const x = sampleCodex({ id: NEWER, cwd: demoDir(w), start: "2026-10-10T08:00:00.000Z" });
    (x.lines[0]!.payload as Record<string, unknown>).cli_version = "0.170.0";
    x.lines.push({ timestamp: "2026-10-10T08:05:00.000Z", type: "event_msg", payload: { type: "brand_new_event" } });
    x.lines.push({ timestamp: "2026-10-10T08:05:01.000Z", type: "event_msg", payload: { type: "brand_new_event" } });
    x.write(codexHome(w));
    const c = new ClaudeSession({ id: "c1a0de99-0000-4000-8000-0000000000b4", cwd: demoDir(w), version: "2.1.400" });
    c.user("hello");
    c.assistant("hi");
    c.lines.push({ type: "brand-new-line", version: "2.1.400", sessionId: c.id });
    c.write(path.join(w.home, ".claude", "projects"));

    const status = run(w, ["status"]).out;
    expect(status).toContain("Record types: some that meme doesn't know (a new agent version?):\n");
    expect(status).toContain("  Claude Code 2.1.400 writes record types meme doesn't know: brand-new-line (1 session)\n");
    expect(status).toContain("  Codex 0.170.0 writes record types meme doesn't know: event_msg/brand_new_event (1 session)\n");

    expect(run(w, ["show", NEWER, "--plain"]).out).toContain("\n2 records meme couldn't read (event_msg/brand_new_event); see `meme status`.\n");
    expect(run(w, ["show", "c1a0de99", "--plain"]).out).toContain("\n1 record meme couldn't read (brand-new-line); see `meme status`.\n");
    // The rest reads as before.
    expect(run(w, ["show", NEWER, "--plain"]).out).toContain("2 ❯ Now add subtract(a, b) in subtract.js with a test.");
    expect(run(w, ["show", "11111111", "--plain"]).out).not.toContain("couldn't read");
  });
});
