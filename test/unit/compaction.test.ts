import { describe, expect, test } from "bun:test";
import path from "node:path";
import { codex } from "../../src/adapters/codex";
import { summaryText } from "../../src/model/compaction";
import { contentOf } from "../../src/model/record";
import { groupTurns } from "../../src/model/turns";
import { nullLogger } from "../../src/platform/log";
import { makeStyle } from "../../src/render/labels";
import { buildShow, showText } from "../../src/render/show";
import { openStore } from "../../src/store/db";
import { importAll } from "../../src/store/import";
import { getSession, sessionRecords } from "../../src/store/queries";
import { compactedClaude, resetIds } from "../fixtures/gen-claude";
import { compactedCodex, CodexSession } from "../fixtures/gen-codex";
import { importInto, projectsDir, tempDir, testPlatform } from "../helpers";

const NOW = Date.parse("2026-10-12T12:00:00.000Z");
const showOpts = { st: makeStyle(false), width: 120, home: "/home/u", now: NOW, full: false, all: false, wrap: false };

function claudeWorld(s = compactedClaude({ id: "c1a0de00-0000-4000-8000-000000000001" })) {
  const home = tempDir();
  const p = testPlatform(home);
  s.write(projectsDir(home));
  const { store } = importInto(p);
  return { store, id: s.id };
}

function codexWorld(s: CodexSession) {
  const home = tempDir();
  const p = testPlatform(home);
  s.write(path.join(home, ".codex"));
  const store = openStore(p.dataDir);
  importAll(store, p, [codex], nullLogger);
  return { store, id: s.id };
}

describe("compaction (handoff.md §7.8)", () => {
  test("the summary without the agents' wrapping text", () => {
    expect(summaryText("Another language model started to solve this problem and produced a summary. Here is the summary produced by the other language model, use the information in this summary to assist with your own analysis:\n## Handoff Summary\n- a")).toBe("## Handoff Summary\n- a");
    const claude =
      "This session is being continued from a previous conversation that ran out of context. The summary below covers the earlier portion of the conversation.\n\nSummary:\n1. Primary Request:\n   - x\n\n" +
      "If you need specific details from before compaction (like exact code snippets), read the full transcript at: /a/b.jsonl\nContinue the conversation from where it left off without asking the user any further questions.\n\nThe messages after this summary are the most recent messages from before compaction, kept verbatim.";
    expect(summaryText(claude)).toBe("1. Primary Request:\n   - x");
    expect(summaryText("plain text")).toBe("plain text");
  });

  test("Claude Code: /compact typed and recorded again is one turn; the summary is marked", () => {
    resetIds();
    const w = claudeWorld();
    const records = sessionRecords(w.store.db, w.id);
    const { turns } = groupTurns(records);
    expect(turns.map((t) => (t.prompt ? contentOf(t.prompt.body) : null))).toEqual([
      "Create hello.py that prints hello",
      "Run it",
      "Make it print the current time, then run it again",
      "/compact",
      "Add a --name option",
    ]);
    const summary = records.filter((r) => r.injected === "compact_summary");
    expect(summary.length).toBe(1);
    expect(summary[0]!.turn).toBe(4);
    expect(turns[3]!.compactions.length).toBe(1);
    expect(getSession(w.store.db, w.id)!.turns).toBe(5);
  });

  test("Claude Code: an automatic compaction in the middle of a turn adds no turn", () => {
    resetIds();
    const s = compactedClaude({ id: "c1a0de00-0000-4000-8000-000000000002" });
    s.user("Keep going");
    s.tool("Bash", { command: "bun test" }, "ok");
    s.compact("1. Primary Request:\n   - keep going", "auto");
    s.assistant("Tests pass.");
    const w = claudeWorld(s);
    const { turns } = groupTurns(sessionRecords(w.store.db, w.id));
    expect(turns.length).toBe(6);
    expect(turns[5]!.compactions.length).toBe(1);
    expect(turns[5]!.reply).toBe("Tests pass.");
  });

  test("Codex: the summary message is not something the AI said", () => {
    resetIds();
    const w = codexWorld(compactedCodex({ id: "01a12e00-0000-7000-8000-000000000001" }));
    const records = sessionRecords(w.store.db, w.id);
    const { turns } = groupTurns(records);
    // /compact has no user message in Codex: it adds no turn.
    expect(turns.map((t) => t.n)).toEqual([1, 2, 3, 4]);
    expect(turns[2]!.reply).toBe("Updated hello.py; it printed 2026-10-12 11:35:39.453748.");
    expect(turns[3]!.reply).toBe("Added --name; it printed: Codex, current time is 2026-10-12 11:36:28.933977.");
    const summaries = records.filter((r) => r.injected === "compact_summary");
    expect(summaries.map((r) => [r.role, r.turn])).toEqual([["assistant", 3], ["assistant", 4]]);
    expect(turns[2]!.compactions.length).toBe(1);
    // Not searched either.
    const hits = w.store.db.query("SELECT COUNT(*) AS n FROM records WHERE injected IS NULL AND text LIKE '%Handoff Summary%'").get() as { n: number };
    expect(hits.n).toBe(0);
  });

  test("Codex: an encrypted summary leaves a marker where it compacted", () => {
    resetIds();
    const s = compactedCodex({ id: "01a12e00-0000-7000-8000-000000000002" });
    s.user("And a --loud option");
    s.command("python3 hello.py --loud", "HELLO");
    s.assistant("Added --loud.");
    s.compact("", { encrypted: true });
    const w = codexWorld(s);
    const records = sessionRecords(w.store.db, w.id);
    const marker = records.filter((r) => r.injected === "compaction");
    expect(marker.length).toBe(1);
    expect(marker[0]!.role).toBe("system");
    expect(marker[0]!.turn).toBe(5);
    expect(groupTurns(records).turns[4]!.reply).toBe("Added --loud.");
  });

  test("meme show: a line where it compacted, and the real reply", () => {
    resetIds();
    const w = codexWorld(compactedCodex({ id: "01a12e00-0000-7000-8000-000000000003" }));
    const m = buildShow(w.store.db, getSession(w.store.db, w.id)!);
    const folded = showText(m, showOpts, "none");
    expect(folded).toContain("  3 ❯ Print the current time instead, and run it again\n      ▸ 2 steps · 1 command · edited 1 file\n      ● Updated hello.py; it printed 2026-10-12 11:35:39.453748.\n  ── compacted here ──\n  4 ❯ Add a --name option\n");
    expect(folded).not.toContain("Handoff Summary");
    const four = showText(m, showOpts, 4);
    expect(four).toContain("● Added --name; it printed: Codex, current time is 2026-10-12 11:36:28.933977.\n");
    expect(four).toContain("      ── compacted here ──\n");
    expect(four).not.toContain("Handoff Summary");
    expect(showText(m, { ...showOpts, all: true }, 4)).toContain("⚙ ## Handoff Summary");

    resetIds();
    const c = claudeWorld();
    const cm = buildShow(c.store.db, getSession(c.store.db, c.id)!);
    expect(showText(cm, showOpts, "none")).toContain("  4 ❯ /compact\n  ── compacted here ──\n  5 ❯ Add a --name option\n");
  });
});
