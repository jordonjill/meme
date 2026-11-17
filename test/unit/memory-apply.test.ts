import { describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { apply, forget, type NewEvidence, type Op, type Origin, type Proposal } from "../../src/memory/apply";
import { readAll } from "../../src/memory/evidence";
import { entriesIn, memoryPaths, NewerFormat, readVersion, snapshotDirs } from "../../src/memory/store";
import type { Shelf } from "../../src/memory/types";
import { tempDir } from "../helpers";

const RULES: Shelf = { level: "user", file: "RULES" };
const AT = new Date(2026, 10, 17, 14, 32);

function setup() {
  const dataDir = path.join(tempDir(), ".meme");
  return { dataDir, p: memoryPaths(dataDir) };
}

const said = (content: string, over: Partial<NewEvidence> = {}): NewEvidence => ({ kind: "fact", tier: "stated", speaker: "user", scope: "user", source: "cli", content, at: AT, label: "meme remember", ...over });

/** One piece of evidence and one entry that rests on it. */
const one = (text: string, origin: Origin = "user", evidence: Partial<NewEvidence> = {}, op: Partial<Op> = {}): Proposal => ({
  origin,
  evidence: [said(text, evidence)],
  ops: [{ op: "add", shelf: RULES, text, kind: "fact", evidence: [0], ...op } as Op],
});

/** Every file under a folder with what is in it: equal before and after means nothing changed. */
function tree(dir: string): Record<string, string> {
  const out: Record<string, string> = {};
  const walk = (d: string) => {
    for (const e of existsSync(d) ? readdirSync(d, { withFileTypes: true }) : []) {
      const f = path.join(d, e.name);
      if (e.isDirectory()) walk(f);
      else out[path.relative(dir, f)] = readFileSync(f, "utf8");
    }
  };
  walk(dir);
  return out;
}

describe("apply: the one way into memory (plan-m2 F2)", () => {
  test("something the user said becomes a piece of evidence and an entry in force that rests on it", async () => {
    const { dataDir, p } = setup();
    const done = await apply(dataDir, one("Do not push unless asked."));
    const [outcome] = done.outcomes;
    expect(outcome).toMatchObject({ ok: true, change: "added", file: path.join(p.memory, "RULES.md") });
    const entries = entriesIn(p.memory);
    expect(entries.map((e) => e.entry)).toEqual([{ id: (outcome as { id: string }).id, text: "Do not push unless asked.", kind: "fact", agents: "all", basis: "stated", status: "active", evidence: [done.evidence[0]!] }]);
    expect(readAll(p.evidence)).toMatchObject([{ id: done.evidence[0], day: "2026-11-17", time: "14:32", content: "Do not push unless asked.", tier: "stated" }]);
    expect([done.version, readVersion(p), readFileSync(p.format, "utf8")]).toEqual([1, 1, "1\n"]);
  });

  test("said again in other words: no second entry, one more piece of evidence", async () => {
    const { dataDir, p } = setup();
    const first = await apply(dataDir, one("Do not push unless asked.", "user", { salt: "1" }));
    const again = await apply(dataDir, one("do not push, unless asked", "user", { salt: "2" }));
    expect(again.outcomes[0]).toMatchObject({ ok: true, change: "more evidence", id: (first.outcomes[0] as { id: string }).id });
    const [e] = entriesIn(p.memory);
    expect(e!.entry.text).toBe("Do not push unless asked.");
    expect(e!.entry.evidence).toEqual([first.evidence[0]!, again.evidence[0]!]);
    expect(readAll(p.evidence).length).toBe(2);
  });

  test("the same proposal twice changes nothing the second time", async () => {
    const { dataDir, p } = setup();
    await apply(dataDir, one("Do not push unless asked.", "user", { salt: "1" }));
    const before = tree(dataDir);
    const again = await apply(dataDir, one("Do not push unless asked.", "user", { salt: "1" }));
    expect(again.outcomes[0]).toMatchObject({ ok: true, change: "more evidence" });
    expect(tree(dataDir)).toEqual(before);
    expect(readVersion(p)).toBe(1);
  });

  test("secrets are masked before anything is written", async () => {
    const { dataDir } = setup();
    const done = await apply(dataDir, one("the staging token is ghp_abcdefghijklmnopqrstuvwxyz0123456789"));
    expect(done.masked).toBe(true);
    const all = JSON.stringify(tree(dataDir));
    expect(all).toContain("[REDACTED:");
    expect(all).not.toContain("ghp_abcdefghijklmnopqrstuvwxyz0123456789");
  });

  test("format: an entry is one line of at most 300 characters; line breaks become spaces", async () => {
    const { dataDir, p } = setup();
    const long = await apply(dataDir, one("x".repeat(301)));
    expect(long.outcomes[0]).toMatchObject({ ok: false, gate: "format" });
    expect(long.evidence).toEqual([null]);
    expect(existsSync(p.memory)).toBe(false);
    await apply(dataDir, one("first line\n  second line"));
    expect(entriesIn(p.memory)[0]!.entry.text).toBe("first line second line");
  });

  test("source: evidence nobody can check is not taken, and neither is an entry that rests only on it", async () => {
    const { dataDir, p } = setup();
    const done = await apply(dataDir, one("The api needs Postgres.", "pipeline", { source: "session:3f2a#12", tier: "observed", speaker: "tool" }));
    expect(done.outcomes[0]).toMatchObject({ ok: false, gate: "source" });
    expect(existsSync(p.evidence)).toBe(false);
    // With a way to check it, it is.
    const checked = await apply(dataDir, one("The api needs Postgres.", "pipeline", { source: "session:3f2a#12", tier: "observed", speaker: "tool" }), { verify: () => true });
    expect(checked.outcomes[0]).toMatchObject({ ok: true, change: "added" });
    expect(entriesIn(p.memory)[0]!.entry).toMatchObject({ basis: "observed", status: "active" });
  });

  test("what was only inferred or reported waits as a candidate; the user saying it puts it in force", async () => {
    const { dataDir, p } = setup();
    await apply(dataDir, one("Prefers short answers.", "agent", { source: "mcp:test", tier: "reported", speaker: "agent" }), { verify: () => true });
    expect(entriesIn(p.memory)[0]!.entry).toMatchObject({ basis: "reported", status: "candidate" });
    await apply(dataDir, one("Prefers short answers."));
    expect(entriesIn(p.memory)[0]!.entry).toMatchObject({ basis: "stated", status: "active" });
    expect(entriesIn(p.memory)[0]!.entry.evidence.length).toBe(2);
  });

  test("rights: only the user changes what the user said; others may add evidence to it", async () => {
    const { dataDir, p } = setup();
    const first = await apply(dataDir, one("Reply in Chinese."));
    const id = (first.outcomes[0] as { id: string }).id;
    const proposal = (ops: Op[], origin: Origin): Proposal => ({ origin, evidence: [said("the user wrote in English today", { source: "session:1#2", tier: "inferred", speaker: "agent" })], ops });
    const reworded = await apply(dataDir, proposal([{ op: "update", id, evidence: [0], text: "Reply in English." }], "pipeline"), { verify: () => true });
    expect(reworded.outcomes[0]).toMatchObject({ ok: false, gate: "rights" });
    const replaced = await apply(dataDir, proposal([{ op: "replace", id, shelf: RULES, text: "Reply in English.", kind: "fact", evidence: [0] }], "pipeline"), { verify: () => true });
    expect(replaced.outcomes[0]).toMatchObject({ ok: false, gate: "rights" });
    expect(entriesIn(p.memory).map((e) => e.entry.text)).toEqual(["Reply in Chinese."]);
    const more = await apply(dataDir, proposal([{ op: "update", id, evidence: [0] }], "pipeline"), { verify: () => true });
    expect(more.outcomes[0]).toMatchObject({ ok: true, change: "more evidence" });
    const mine = await apply(dataDir, { origin: "user", evidence: [], ops: [{ op: "update", id, evidence: [], text: "Reply in Chinese, briefly." }] });
    expect(mine.outcomes[0]).toMatchObject({ ok: true, change: "updated" });
    expect(entriesIn(p.memory)[0]!.entry).toMatchObject({ id, text: "Reply in Chinese, briefly." });
  });

  test("replace: the new entry names the old one, which stays in the file as replaced", async () => {
    const { dataDir, p } = setup();
    const old = (await apply(dataDir, one("Install with npm."))).outcomes[0] as { id: string };
    const done = await apply(dataDir, { origin: "user", evidence: [said("Install with pnpm, not npm.")], ops: [{ op: "replace", id: old.id, shelf: RULES, text: "Install with pnpm, not npm.", kind: "fact", evidence: [0], why: "npm until 2026-09" }] });
    const fresh = done.outcomes[0] as { id: string };
    expect(done.outcomes[0]).toMatchObject({ ok: true, change: "replaced" });
    const byId = new Map(entriesIn(p.memory).map((e) => [e.entry.id, e.entry]));
    expect(byId.get(old.id)).toMatchObject({ status: "replaced", replacedBy: fresh.id });
    expect(byId.get(fresh.id)).toMatchObject({ status: "active", replaces: old.id, why: "npm until 2026-09" });
    // Only an entry in force can be replaced, and only one that is there.
    const twice = await apply(dataDir, { origin: "user", evidence: [said("Install with bun.")], ops: [{ op: "replace", id: old.id, shelf: RULES, text: "Install with bun.", kind: "fact", evidence: [0] }] });
    expect(twice.outcomes[0]).toMatchObject({ ok: false, gate: "target" });
    const nowhere = await apply(dataDir, { origin: "user", evidence: [], ops: [{ op: "update", id: "m-ffffffff", evidence: [], text: "x" }] });
    expect(nowhere.outcomes[0]).toMatchObject({ ok: false, gate: "target" });
  });

  test("limit: the pipeline changes no more than its share in one run; the rest is refused, not dropped silently", async () => {
    const { dataDir, p } = setup();
    const texts = ["one fact", "another fact", "a third fact"];
    const done = await apply(dataDir, { origin: "pipeline", evidence: texts.map((t) => said(t, { source: "session:1#1", tier: "observed", speaker: "tool" })), ops: texts.map((text, i) => ({ op: "add", shelf: RULES, text, kind: "fact", evidence: [i] }) as Op) }, { verify: () => true, maxChanges: 2 });
    expect(done.outcomes.map((o) => (o.ok ? o.change : o.gate))).toEqual(["added", "added", "limit"]);
    expect(entriesIn(p.memory).length).toBe(2);
  });

  test("all or nothing: when a file cannot be written, the evidence and the conclusions are as before", async () => {
    const { dataDir, p } = setup();
    await apply(dataDir, one("Do not push unless asked."));
    const before = tree(dataDir);
    // A folder where a conclusion file should be: writing it fails after the evidence was written.
    mkdirSync(path.join(p.memory, "USER.md"));
    await expect(apply(dataDir, { origin: "user", evidence: [said("I work in WSL.")], ops: [{ op: "add", shelf: { level: "user", file: "USER" }, text: "I work in WSL.", kind: "fact", evidence: [0] }] })).rejects.toThrow();
    rmSync(path.join(p.memory, "USER.md"), { recursive: true });
    const after = tree(dataDir);
    for (const key of Object.keys(after).filter((k) => k.startsWith(path.join("state", "snapshots")))) delete after[key];
    expect(after).toEqual(before);
    expect(existsSync(p.lock)).toBe(false);
  });

  test("a memory a newer meme wrote is not written to", async () => {
    const { dataDir, p } = setup();
    await apply(dataDir, one("Do not push unless asked."));
    writeFileSync(p.format, "2\n");
    const before = tree(dataDir);
    await expect(apply(dataDir, one("Reply in Chinese."))).rejects.toBeInstanceOf(NewerFormat);
    await expect(forget(dataDir, entriesIn(p.memory)[0]!.entry.id)).rejects.toBeInstanceOf(NewerFormat);
    expect(tree(dataDir)).toEqual(before);
  });

  test("a snapshot of the conclusions before each change; the last 20 are kept", async () => {
    const { dataDir, p } = setup();
    for (let i = 0; i < 23; i++) await apply(dataDir, one(`rule number ${i}`));
    const dirs = snapshotDirs(p);
    expect(dirs.length).toBe(20);
    // The newest snapshot is the state before the last change: 22 rules.
    expect(entriesIn(dirs.at(-1)!).length).toBe(22);
  });
});

describe("forget (plan-m2 F2)", () => {
  test("the entry, the evidence only it rested on and its text in the snapshots are gone; a hash stays", async () => {
    const { dataDir, p } = setup();
    const shared = said("Use pnpm; never force-push.", { salt: "shared" });
    const done = await apply(dataDir, {
      origin: "user",
      evidence: [shared, said("Never force-push.", { salt: "own" })],
      ops: [
        { op: "add", shelf: RULES, text: "Use pnpm.", kind: "fact", evidence: [0] },
        { op: "add", shelf: RULES, text: "Never force-push.", kind: "fact", evidence: [0, 1] },
      ],
    });
    await apply(dataDir, one("Reply in Chinese."));
    const [keep, gone] = done.outcomes as { id: string }[];
    const result = await forget(dataDir, gone!.id);
    expect(result).toMatchObject({ entry: { text: "Never force-push." }, evidence: [done.evidence[1]!] });
    expect(entriesIn(p.memory).map((e) => e.entry.id).sort()).toEqual([keep!.id, entriesIn(p.memory).find((e) => e.entry.text === "Reply in Chinese.")!.entry.id].sort());
    // The shared piece of evidence stays, for the entry that still rests on it.
    expect(readAll(p.evidence).map((e) => e.id).sort()).toContain(done.evidence[0]!);
    expect(readAll(p.evidence).map((e) => e.id)).not.toContain(done.evidence[1]!);
    const files = tree(dataDir);
    for (const [name, text] of Object.entries(files)) {
      if (name.startsWith("evidence")) continue; // the shared sentence holds the words
      expect(text).not.toContain("Never force-push");
    }
    expect(readFileSync(p.tombstones, "utf8")).not.toContain("force");
    expect(await forget(dataDir, gone!.id)).toBeNull();
  });

  test("what was forgotten is not learned again from anyone but the user", async () => {
    const { dataDir, p } = setup();
    const first = await apply(dataDir, one("Never force-push."));
    await forget(dataDir, (first.outcomes[0] as { id: string }).id);
    expect(existsSync(path.join(p.evidence, "2026-11-17.md"))).toBe(false);
    const learned = await apply(dataDir, one("never force push", "pipeline", { source: "session:1#3", tier: "inferred", speaker: "agent" }), { verify: () => true });
    expect(learned.outcomes[0]).toMatchObject({ ok: false });
    expect(learned.evidence).toEqual([null]);
    expect(entriesIn(p.memory)).toEqual([]);
    // The user saying it again lifts it.
    const again = await apply(dataDir, one("Never force-push."));
    expect(again.outcomes[0]).toMatchObject({ ok: true, change: "added" });
    expect(readFileSync(p.tombstones, "utf8")).toBe("");
  });

  test("forgetting an entry that replaced another leaves no pointer to it", async () => {
    const { dataDir, p } = setup();
    const old = (await apply(dataDir, one("Install with npm."))).outcomes[0] as { id: string };
    const fresh = (await apply(dataDir, { origin: "user", evidence: [said("Install with pnpm.")], ops: [{ op: "replace", id: old.id, shelf: RULES, text: "Install with pnpm.", kind: "fact", evidence: [0] }] })).outcomes[0] as { id: string };
    await forget(dataDir, fresh.id);
    const [left] = entriesIn(p.memory);
    expect(left!.entry).toMatchObject({ id: old.id, status: "replaced" });
    expect(left!.entry.replacedBy).toBeUndefined();
  });
});
