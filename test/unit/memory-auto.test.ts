import { describe, expect, test } from "bun:test";
import { readFileSync, utimesSync } from "node:fs";
import path from "node:path";
import { apply, changesFile, forget, type NewEvidence, type Proposal } from "../../src/memory/apply";
import { digest, markSeen } from "../../src/memory/digest";
import { processItem, putInbox, waiting } from "../../src/memory/inbox";
import type { Ask } from "../../src/memory/model";
import { entriesIn, memoryPaths } from "../../src/memory/store";
import type { Shelf } from "../../src/memory/types";
import { tempDir } from "../helpers";

const RULES: Shelf = { level: "user", file: "RULES" };
const AT = new Date(2026, 10, 17, 14, 32);

const seen = (content: string, source: string): NewEvidence => ({ kind: "experience", tier: "inferred", speaker: "agent", scope: "user", source, content, at: AT, label: "Claude Code · tool" });
const inferred = (text: string, source: string): Proposal => ({ origin: "pipeline", evidence: [seen(text, source)], ops: [{ op: "add", shelf: RULES, text, kind: "experience", evidence: [0] }] });

function setup() {
  const dataDir = path.join(tempDir(), ".meme");
  return { dataDir, p: memoryPaths(dataDir) };
}

describe("what is only inferred takes effect once seen in two places (plan-m2 F9)", () => {
  test("seen in one session it waits; seen in a second session it is in force", async () => {
    const { dataDir, p } = setup();
    await apply(dataDir, inferred("Start the database before the tests.", "session:aaaa#4"), { verify: () => true });
    expect(entriesIn(p.memory)[0]!.entry.status).toBe("candidate");
    // The same session again is still one place.
    await apply(dataDir, inferred("Start the database before the tests.", "session:aaaa#9"), { verify: () => true });
    expect(entriesIn(p.memory)[0]!.entry.status).toBe("candidate");
    await apply(dataDir, inferred("start the database before the tests", "session:bbbb#2"), { verify: () => true });
    expect(entriesIn(p.memory)[0]!.entry).toMatchObject({ status: "active", evidence: [expect.any(String), expect.any(String), expect.any(String)] });
    expect(digest(p).inForce).toMatchObject([{ change: "in force", text: "Start the database before the tests." }]);
  });

  test("an entry that waits to replace another takes its place once in force", async () => {
    const { dataDir, p } = setup();
    const old = (await apply(dataDir, { origin: "user", evidence: [{ kind: "fact", tier: "inferred", speaker: "agent", scope: "user", source: "session:x#1", content: "Install with npm.", at: AT, label: "x" }], ops: [{ op: "add", shelf: RULES, text: "Install with npm.", kind: "fact", evidence: [0] }] }, { verify: () => true })).outcomes[0] as { id: string };
    // Make the old one in force by a second place.
    await apply(dataDir, inferred("Install with npm.", "session:y#1"), { verify: () => true });
    const fresh = (await apply(dataDir, { origin: "pipeline", evidence: [seen("Install with pnpm.", "session:z#1")], ops: [{ op: "replace", id: old.id, shelf: RULES, text: "Install with pnpm.", kind: "fact", evidence: [0] }] }, { verify: () => true })).outcomes[0] as { id: string };
    let byId = new Map(entriesIn(p.memory).map((e) => [e.entry.id, e.entry]));
    expect([byId.get(old.id)!.status, byId.get(fresh.id)!.status]).toEqual(["active", "candidate"]);
    await apply(dataDir, { origin: "pipeline", evidence: [seen("Install with pnpm.", "session:w#3")], ops: [{ op: "update", id: fresh.id, evidence: [0] }] }, { verify: () => true });
    byId = new Map(entriesIn(p.memory).map((e) => [e.entry.id, e.entry]));
    expect([byId.get(old.id)!.status, byId.get(fresh.id)!.status]).toEqual(["replaced", "active"]);
  });
});

describe("the digest (plan-m2 F9)", () => {
  test("what came in since the user last looked; after looking, nothing", async () => {
    const { dataDir, p } = setup();
    await apply(dataDir, { origin: "user", evidence: [{ kind: "fact", tier: "stated", speaker: "user", scope: "user", source: "cli", content: "Reply in Chinese.", at: AT, label: "meme remember" }], ops: [{ op: "add", shelf: RULES, text: "Reply in Chinese.", kind: "fact", evidence: [0] }] });
    await apply(dataDir, inferred("Run the linter before committing.", "session:aaaa#2"), { verify: () => true });
    const d = digest(p);
    expect(d.since).toBeNull();
    expect(d.added.map((r) => [r.text, r.shelf, r.from])).toEqual([["Reply in Chinese.", "RULES", "meme remember"]]);
    expect(d.waiting.map((e) => e.text)).toEqual(["Run the linter before committing."]);
    markSeen(p, new Date(Date.now() + 1000));
    expect(digest(p).added).toEqual([]);
  });

  test("forgetting takes the words out of the log of changes as well", async () => {
    const { dataDir, p } = setup();
    const done = await apply(dataDir, { origin: "user", evidence: [{ kind: "fact", tier: "stated", speaker: "user", scope: "user", source: "cli", content: "Never force-push.", at: AT, label: "meme remember" }], ops: [{ op: "add", shelf: RULES, text: "Never force-push.", kind: "fact", evidence: [0] }] });
    await forget(dataDir, (done.outcomes[0] as { id: string }).id);
    const log = readFileSync(changesFile(p), "utf8");
    expect(log).not.toContain("force-push");
    expect(digest(p)).toMatchObject({ added: [], forgotten: 1 });
  });
});

describe("what an agent passed on, waiting to be worded (plan-m2 F9)", () => {
  const item = { words: "以后装依赖一律用 pnpm", session: "s-1", focus: 3, records: [{ seq: 3, speaker: "user" as const, text: "以后装依赖一律用 pnpm", ts: null }], project: null, label: "claude-code over MCP", at: AT.toISOString() };
  const ask: Ask = async () => JSON.stringify({ memories: [{ text: "装依赖用 pnpm", kind: "fact", about: "rule", quote: "以后装依赖一律用 pnpm", at: 3 }] });

  test("worded by the model, then gone from the inbox", async () => {
    const { dataDir, p } = setup();
    const file = putInbox(p, item);
    expect(waiting(p)).toEqual([file]);
    const done = await processItem(dataDir, file, { ask });
    expect(done).toMatchObject({ by: "model", kept: [{ text: "装依赖用 pnpm" }] });
    expect(waiting(p)).toEqual([]);
    expect(entriesIn(p.memory)[0]!.entry).toMatchObject({ basis: "stated", status: "active" });
  });

  test("one process at a time; one that died leaves it for the next run, after a while", async () => {
    const { dataDir, p } = setup();
    const file = putInbox(p, item);
    const slow: Ask = () => new Promise((done) => setTimeout(() => done(JSON.stringify({ memories: [] })), 50));
    const first = processItem(dataDir, file, { ask: slow });
    expect(await processItem(dataDir, file, { ask })).toBeNull();
    await first;
    // A taken item whose process died: left alone at first, taken up once it is old.
    const again = putInbox(p, item);
    const taken = `${again}.99999.taken`;
    require("node:fs").renameSync(again, taken);
    expect(waiting(p)).toEqual([]);
    const old = Date.now() / 1000 - 3600;
    utimesSync(taken, old, old);
    expect(waiting(p)).toEqual([taken]);
    expect(await processItem(dataDir, taken, { ask })).toMatchObject({ by: "model" });
    expect(waiting(p)).toEqual([]);
  });
});
