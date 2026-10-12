/** The handoff after step 6 (handoff.md §7.3): A1–A5 and the order things are cut in. */
import { describe, expect, test } from "bun:test";
import { rmSync } from "node:fs";
import path from "node:path";
import { codex } from "../../src/adapters/codex";
import { claudeCode } from "../../src/adapters/claude-code";
import { estimateTokens, type Limits } from "../../src/handoff/budget";
import { buildHandoff } from "../../src/handoff/build";
import { isMemeCommand, parseHandoff } from "../../src/handoff/chain";
import { onlyReads, outcome, segments } from "../../src/handoff/commands";
import { nullLogger } from "../../src/platform/log";
import { numberList } from "../../src/render/text";
import { openStore } from "../../src/store/db";
import { importAll } from "../../src/store/import";
import { getSession, handedOver, sessionRecords } from "../../src/store/queries";
import { ClaudeSession, compactedClaude, resetIds } from "../fixtures/gen-claude";
import { CodexSession, compactedCodex } from "../fixtures/gen-codex";
import { projectsDir, tempDir, testPlatform } from "../helpers";

const NOW = Date.parse("2026-10-12T12:00:00.000Z");

/** A home with sessions of both agents, imported again on every `handoff`. */
function world() {
  const home = tempDir();
  const p = testPlatform(home);
  const store = openStore(p.dataDir);
  const files = new Map<string, string>();
  return {
    claude(s: ClaudeSession) {
      files.set(s.id, s.write(projectsDir(home)));
    },
    codex(s: CodexSession) {
      files.set(s.id, s.write(path.join(home, ".codex")));
    },
    remove(id: string) {
      rmSync(files.get(id)!);
    },
    handoff(id: string, o: { fresh?: boolean; limits?: Limits; current?: string[] } = {}) {
      importAll(store, p, [claudeCode, codex], nullLogger);
      const session = getSession(store.db, id)!;
      return buildHandoff(
        {
          session,
          records: sessionRecords(store.db, id),
          env: "linux",
          now: NOW,
          lookup: (ref, before) => handedOver(store.db, ref, before),
          current: new Set(o.current ?? []),
        },
        { fresh: Boolean(o.fresh), limits: o.limits },
      );
    },
  };
}

describe("A5: the preamble", () => {
  test("turn numbers read as a list, not a range", () => {
    expect(numberList([3, 6])).toBe("3 and 6");
    expect(numberList([3, 4])).toBe("3 and 4");
    expect(numberList([5, 6, 7, 8])).toBe("5–8");
    expect(numberList([3, 5, 6, 7, 9])).toBe("3, 5–7 and 9");
    expect(numberList([4])).toBe("4");
  });

  test("the last two turns with AI activity, local commands between them", () => {
    resetIds();
    const w = world();
    // The 10-12 Claude Code test: turns 4 and 5 are local commands, so the last two are 3 and 6.
    const s = new ClaudeSession({ id: "a5a5a5a5-0000-4000-8000-000000000001" });
    s.user("one");
    s.assistant("1");
    s.user("two");
    s.assistant("2");
    s.user("three");
    s.assistant("3");
    s.localCommand("model", "Kept model");
    s.localCommand("statusline", "ok");
    s.user("six");
    s.assistant("6");
    w.claude(s);
    const text = w.handoff(s.id).text;
    expect(text).toContain("the last 2 turns (3 and 6) step by step");
    expect(text).toContain("If your context is compacted later, run `meme continue a5a5a5a5` again to reload this handoff.\n");
    expect(text).toContain("The steps listed below were already run; don't repeat them blindly. Check their effect in the repository.\n");
  });

  test("Left out says what was dropped to fit", () => {
    resetIds();
    const w = world();
    const s = new ClaudeSession({ id: "a5a5a5a5-0000-4000-8000-000000000002" });
    for (let i = 1; i <= 30; i++) {
      s.user(`message ${i} ` + "word ".repeat(60));
      s.assistant(`reply ${i} ` + "detail ".repeat(20));
    }
    w.claude(s);
    const full = w.handoff(s.id).text;
    // No steps in the last turns, so no tool output is left out.
    expect(full).toContain("Left out: AI replies and steps before turn 29, except one line each.\n");

    // Some `↳` lines go first, oldest first: the first limit that drops any keeps every message.
    let chars = full.length + 2000;
    let fewer = full;
    while (!fewer.includes("except one line each from turn")) fewer = w.handoff(s.id, { limits: { tokens: 1_000_000, chars: (chars -= 50) } }).text;
    const from = /except one line each from turn (\d+) on/.exec(fewer);
    expect(from).not.toBeNull();
    expect(fewer).toContain(`one line on what the AI did in each earlier turn from turn ${from![1]} on`);
    expect(fewer).toContain("Included: all 30 user messages");
    expect(fewer).not.toContain("1. message 1 " + "word ".repeat(59) + "word\n   ↳");

    // Then user messages in the middle.
    const small = w.handoff(s.id, { limits: { tokens: 3000, chars: 1_000_000 } }).text;
    // Room the cut messages leave goes back to the newest `↳` lines.
    const m = /Left out: (\d+) user messages in the middle \(turns 2–(\d+)\); AI replies and steps before turn 29(?:, except one line each from turn \d+ on)?\./.exec(small);
    expect(m).not.toBeNull();
    expect(small).toContain(`… ${m![1]} messages left out (turns 2–${m![2]}); find them with`);
    expect(estimateTokens(small)).toBeLessThanOrEqual(3000);
  });
});

describe("A2: one line on each earlier turn", () => {
  test("the final reply, not a note before a step; none on the last two turns", () => {
    resetIds();
    const w = world();
    const s = compactedCodex({ id: "a2a2a2a2-0000-7000-8000-000000000001" });
    w.codex(s);
    const text = w.handoff(s.id).text;
    expect(text).toContain("1. Create hello.py that prints hello\n   ↳ 3 steps · 2 commands · edited 1 file · AI: Created hello.py; running it prints hello.\n");
    expect(text).toContain("2. Run it\n   ↳ 1 step · 1 command · AI: It ran and printed hello.\n3. Print the current time");
    expect(text).not.toContain("I will create hello.py, then run it.");
    expect(text).toMatch(/\n3\. Print the current time instead, and run it again\n4\. Add a --name option\n/);
  });

  test("a turn that ended on a step: interrupted or no reply", () => {
    resetIds();
    const w = world();
    const s = new ClaudeSession({ id: "a2a2a2a2-0000-4000-8000-000000000002" });
    s.user("migrate");
    s.assistant("Let me run the migration.");
    s.call("Bash", { command: "./migrate.sh" });
    s.interrupt(true);
    s.user("check the logs");
    s.assistant("Looking.");
    s.tool("Bash", { command: "tail log" }, "ok");
    s.user("go on");
    s.assistant("Done.");
    s.user("thanks");
    s.assistant("You're welcome.");
    w.claude(s);
    const text = w.handoff(s.id).text;
    expect(text).toContain("1. migrate\n   ↳ 1 step · 1 command · interrupted\n");
    expect(text).toContain("2. check the logs\n   ↳ 1 step · 1 command · no reply\n");
    const long = "x".repeat(300);
    resetIds();
    const t = new ClaudeSession({ id: "a2a2a2a2-0000-4000-8000-000000000003" });
    t.user("explain");
    t.assistant(long);
    t.user("more");
    t.assistant("ok");
    t.user("and more");
    t.assistant("ok");
    w.claude(t);
    expect(w.handoff(t.id).text).toContain(`1. explain\n   ↳ AI: ${"x".repeat(119)}…\n`);
  });
});

describe("A4: recent commands", () => {
  test("what only reads, and meme itself, are left out", () => {
    for (const c of ["ls -la", "cat a | head -5", "git status && git log -3", "git -C x diff", "cd src && grep -rn foo .", "rg x", "pwd; echo hi", "meme continue 2", "./dist/meme-linux-x64 ls", "find . -name '*.ts' | wc -l", "Get-Content a.txt"]) {
      expect(onlyReads(c)).toBe(true);
    }
    for (const c of ["bun test", "git commit -m x", "cat > a.txt <<'EOF'", "echo hi > a.txt", "ls && rm x", "sed -i s/a/b/ f", "git push"]) {
      expect(onlyReads(c)).toBe(false);
    }
    expect(onlyReads("echo hi 2>&1 >/dev/null")).toBe(true);
    expect(segments(`grep "a|b" f && echo 'x; y'`)).toEqual([`grep "a|b" f`, `echo 'x; y'`]);
  });

  test("newest last, at most ten, failures marked, the last two turns not repeated", () => {
    resetIds();
    const w = world();
    const s = new ClaudeSession({ id: "a4a4a4a4-0000-4000-8000-000000000001" });
    s.user("build it");
    for (let i = 1; i <= 12; i++) s.tool("Bash", { command: `make step${i}` }, i === 12 ? "Exit code 2\nboom" : "done", i === 12);
    s.tool("Bash", { command: "ls" }, "a b");
    s.tool("Bash", { command: "meme ls" }, "list");
    s.assistant("Built, except step 12.");
    s.user("fix step 12");
    s.tool("Bash", { command: "make step12" }, "done");
    s.assistant("Fixed.");
    s.user("ship");
    s.tool("Bash", { command: "git push" }, "ok");
    s.assistant("Shipped.");
    w.claude(s);
    const text = w.handoff(s.id).text;
    const section = text.split("## Recent commands (newest last)\n")[1]!.split("\n\n")[0]!.split("\n");
    expect(section.length).toBe(10);
    expect(section[0]).toBe("- turn 1: `make step3` → ok");
    expect(section[9]).toBe("- turn 1: `make step12` → ✗ exit 2");
    expect(text).toContain("the last 10 commands that changed something");
    expect(text).toContain("; 2 older commands.");
    expect(text).not.toContain("`git push` →");
    expect(text).not.toContain("`ls` →");
  });

  test("the outcome: the flag, the exit code, or no result", () => {
    const tool = (content: string, ok?: boolean) => ({ seq: 0, uid: null, part: 0, turn: 1, injected: null, copied: false, role: "tool", ts: null, body: { role: "tool" as const, tool_call_id: "c", content, timestamp: "", ...(ok === undefined ? {} : { ok }) } });
    expect(outcome(undefined)).toBe("no result");
    expect(outcome(tool("Process exited with code 1\nOutput:\nx"))).toBe("✗ exit 1");
    expect(outcome(tool("fine", true))).toBe("ok");
    // Codex's code mode: the script completed, the command in it may not have.
    expect(outcome(tool("Script completed\nWall time 0.1 seconds\nOutput:\n\n/bin/bash: line 1: python: command not found\n"))).toBe("(no exit code) /bin/bash: line 1: python: command not found");
    expect(outcome(tool("Script completed\nWall time 0.1 seconds\nOutput:\n\n"))).toBe("(no exit code, no output)");
  });
});

describe("A3: the source agent's compaction summary", () => {
  test("Claude Code: after the preamble, before the user messages, without its instructions to the model", () => {
    resetIds();
    const w = world();
    const s = compactedClaude({ id: "a3a3a3a3-0000-4000-8000-000000000001" });
    w.claude(s);
    const text = w.handoff(s.id).text;
    const at = (needle: string) => text.indexOf(needle);
    expect(at("## Summary written by the source agent (Claude Code compacted its context after turn 3, ")).toBeGreaterThan(at("If your context is compacted later"));
    expect(at("## Summary written by")).toBeLessThan(at("## User messages (all)"));
    expect(text).toContain("This is the agent's own summary, a hint that may be wrong. The user messages and steps below are verbatim.\n> 1. Primary Request and Intent:\n");
    expect(text).not.toContain("Continue the conversation from where it left off");
    expect(text).not.toContain("This session is being continued");
    expect(text).toContain("Included: the summary the source agent wrote when it compacted its context after turn 3; all 5 user messages;");
    // The last two turns with AI activity are 3 and 5: /compact comes between them and gets no `↳` line.
    expect(text).toContain("the last 2 turns (3 and 5) step by step");
    expect(text).toContain("2. Run it\n   ↳ 1 step · 1 command · AI: Ran it: the output is hello.\n3. Make it print the current time, then run it again\n4. /compact\n5. Add a --name option\n");
  });

  test("Codex: the last summary; the AI's words in turn 3 are its own", () => {
    resetIds();
    const w = world();
    const s = compactedCodex({ id: "a3a3a3a3-0000-7000-8000-000000000002" });
    w.codex(s);
    const text = w.handoff(s.id).text;
    expect(text).toContain("## Summary written by the source agent (Codex compacted its context after turn 4, ");
    expect(text).toContain("> - hello.py takes an optional --name.\n");
    expect(text).not.toContain("hello.py prints the current time.");
    const turn3 = text.split("### Turn 3\n")[1]!.split("### Turn 4")[0]!;
    expect(turn3).toContain("AI said:\n> I will change the script and run it.\n>\n> Updated hello.py; it printed 2026-10-12 11:35:39.453748.\nEach step:");
    expect(turn3).not.toContain("Handoff Summary");
    expect(turn3).toContain("context compacted");
  });

  test("a later encrypted summary: the readable one before it, and up to which turn it covers", () => {
    resetIds();
    const w = world();
    const s = compactedCodex({ id: "a3a3a3a3-0000-7000-8000-000000000003" });
    s.user("And a --loud option");
    s.command("python3 hello.py --loud", "HELLO");
    s.assistant("Added --loud.");
    s.compact("", { encrypted: true });
    w.codex(s);
    const text = w.handoff(s.id).text;
    expect(text).toContain("(Codex compacted its context after turn 4, ");
    expect(text).toContain("It compacted again after turn 5, but that summary is encrypted; this one covers up to turn 4.\n");

    resetIds();
    const only = new CodexSession({ id: "a3a3a3a3-0000-7000-8000-000000000004" });
    only.user("Start");
    only.command("make", "ok");
    only.assistant("Started.");
    only.compact("", { encrypted: true });
    only.user("Go on");
    only.assistant("Going.");
    w.codex(only);
    const t2 = w.handoff(only.id).text;
    expect(t2).toContain("Note: Codex compacted its context after turn 1, and its summary is encrypted; only the records below are included.\n");
    expect(t2).not.toContain("## Summary written by");
  });

  test("cut to 3,000 tokens, then 1,000, then dropped, before anything said by the user", () => {
    resetIds();
    const w = world();
    const s = compactedClaude({ id: "a3a3a3a3-0000-4000-8000-000000000005" });
    // A summary of about 5,000 tokens.
    const big = new ClaudeSession({ id: "a3a3a3a3-0000-4000-8000-000000000006", cwd: "/work/compact-lab" });
    big.user("Start");
    big.tool("Bash", { command: "make" }, "ok");
    big.assistant("Started.");
    big.compact(Array.from({ length: 400 }, (_, i) => `- line ${i} of the summary, with some words`).join("\n"));
    big.user("Go on");
    big.assistant("Going.");
    w.claude(s);
    w.claude(big);
    const text = w.handoff(big.id).text;
    expect(text).toMatch(/> … \(cut; `meme show a3a3a3a3[\w-]* 2 --all --full` has all of it\)\n/);
    const summaryTokens = (t: string) => estimateTokens(t.split("## Summary written by")[1]!.split("\n## User messages")[0]!);
    expect(summaryTokens(text)).toBeGreaterThan(2800);
    // 3,000 for the summary, a few more for its heading.
    expect(summaryTokens(text)).toBeLessThan(3300);
    expect(text).toMatch(/Left out: [^\n]*the rest of the source agent's compaction summary/);

    const tight = w.handoff(big.id, { limits: { tokens: 2500, chars: 1_000_000 } }).text;
    expect(summaryTokens(tight)).toBeLessThan(1150);
    expect(tight).toContain("Included: the summary the source agent wrote");
    expect(tight).toContain("\n1. Start\n");

    const tighter = w.handoff(big.id, { limits: { tokens: 1200, chars: 1_000_000 } }).text;
    expect(tighter).not.toContain("## Summary written by");
    expect(tighter).toMatch(/Left out: [^\n]*the source agent's compaction summary \(`meme show a3a3a3a3[\w-]* 2 --all --full`\)/);
    expect(tighter).toContain("## User messages (all)");
  });
});

describe("A1: the relay chain", () => {
  /** A → B → C, each handed over the way meme does it: B's agent ran `meme continue`, C's user typed `!`. */
  function relay() {
    resetIds();
    const w = world();
    const a = new ClaudeSession({ id: "aaaa1111-0000-4000-8000-000000000001", cwd: "/work/relay", start: "2026-10-01T08:00:00.000Z" });
    a.user("Write a CSV importer for the orders table");
    a.tool("Write", { file_path: "/work/relay/import.py", content: "x" }, "ok");
    a.assistant("Wrote import.py.");
    a.user("Also skip rows without an order id");
    a.assistant("Done.");
    w.claude(a);
    const handoffA = w.handoff(a.id).text;

    const b = new ClaudeSession({ id: "bbbb2222-0000-4000-8000-000000000002", cwd: "/work/relay", start: "2026-10-02T08:00:00.000Z" });
    b.user("Continue an earlier session: run `meme continue aaaa1111` and follow the instructions at the top of its output.");
    b.tool("Bash", { command: "meme continue aaaa1111" }, handoffA);
    b.assistant("Summary of A. Shall I go on?");
    b.user("Yes, and add a dry-run flag");
    b.tool("Bash", { command: "meme continue aaaa1111 | head -3" }, handoffA.split("\n").slice(0, 3).join("\n"));
    b.assistant("Added --dry-run.");
    w.claude(b);
    const handoffB = w.handoff(b.id).text;

    const c = new ClaudeSession({ id: "cccc3333-0000-4000-8000-000000000003", cwd: "/work/relay", start: "2026-10-03T08:00:00.000Z" });
    c.bash("meme continue", "  1  Claude·Linux  1d ago  …  bbbb2222");
    c.bash("meme continue 1", handoffB);
    c.user("接着做");
    c.assistant("Continuing.");
    w.claude(c);
    return { w, a, b, c };
  }

  test("the user messages of every session up the chain, oldest first; meme's own commands are not messages", () => {
    const { w, c } = relay();
    const text = w.handoff(c.id).text;
    expect(text).toContain(
      "## Earlier session aaaa1111 (handed over into bbbb2222)\nClaude·Linux · Write a CSV importer for the orders table · 10-01 08:00 → 08:00\n1. Write a CSV importer for the orders table\n2. Also skip rows without an order id\n\n" +
        "## Earlier session bbbb2222 (handed over into this one)\nClaude·Linux · Continue an earlier session: run `meme continue aaaa1111` and follow the instructions at the top of its output. · 10-02 08:00 → 08:00\n2. Yes, and add a dry-run flag\n\n" +
        "## User messages in this session (all)\n3. 接着做\n",
    );
    expect(text).toContain("Included: the user messages of 2 earlier sessions it was handed over from; the one user message;");
    expect(text).toContain("what the AI did in the earlier sessions");
  });

  test("a session handed over that has since been deleted: its messages from the recorded handoff", () => {
    const { w, b, c } = relay();
    w.remove(b.id);
    const text = w.handoff(c.id).text;
    // A is still there: read from the mirror, not from what B's handoff said.
    expect(text).toContain("## Earlier session aaaa1111 (handed over into bbbb2222)\nClaude·Linux · Write a CSV importer for the orders table · 10-01 08:00 → 08:00\n1. Write a CSV importer for the orders table\n2. Also skip rows without an order id\n");
    expect(text).toContain("## Earlier session bbbb2222 (handed over into this one)\nThe session is gone from meme's mirror; its messages below are from the handoff recorded after it.\n2. Yes, and add a dry-run flag\n");
  });

  test("switching back: the session the agent is in is not repeated", () => {
    const { w, a, c } = relay();
    const text = w.handoff(c.id, { current: [a.id] }).text;
    expect(text).not.toContain("## Earlier session aaaa1111");
    expect(text).toContain("## Earlier session bbbb2222");
    expect(text).toContain("the messages of session aaaa1111, which you are in");
  });

  test("the first message kept is the first of the oldest session", () => {
    const { w, c } = relay();
    const text = w.handoff(c.id, { limits: { tokens: 900, chars: 1_000_000 } }).text;
    expect(text).toContain("1. Write a CSV importer for the orders table\n");
    expect(text).toContain("3. 接着做\n");
  });

  test("Codex: `!` output counts; a recorded handoff parses back", () => {
    resetIds();
    const w = world();
    const a = new ClaudeSession({ id: "dddd4444-0000-4000-8000-000000000004", cwd: "/work/relay" });
    a.user("Port the tests to vitest");
    a.assistant("Ported.");
    w.claude(a);
    const handoffA = w.handoff(a.id).text;
    const x = new CodexSession({ id: "eeee5555-0000-7000-8000-000000000005", cwd: "/work/relay" });
    x.shell("meme continue", "  1  Claude·Linux  …  dddd4444");
    x.shell("meme continue 1", handoffA.trimEnd());
    x.user("接着做");
    x.assistant("Going on.");
    w.codex(x);
    expect(w.handoff(x.id).text).toContain("## Earlier session dddd4444 (handed over into this one)\nClaude·Linux · Port the tests to vitest");
    expect(parseHandoff(handoffA, "dddd4444")!.messages).toEqual([{ n: 1, text: "Port the tests to vitest" }]);
  });

  test("meme's commands and launch messages", () => {
    expect(isMemeCommand("! meme continue 2")).toBe(true);
    expect(isMemeCommand("! meme ls -a")).toBe(true);
    expect(isMemeCommand("Continue an earlier session: run `meme continue 01a1` and follow the instructions at the top of its output.")).toBe(true);
    expect(isMemeCommand("@/home/u/.meme/handoffs/164801e9-20261010-1428.md")).toBe(true);
    expect(isMemeCommand("meme is a tool; continue")).toBe(false);
    expect(isMemeCommand("! ls")).toBe(false);
  });
});
