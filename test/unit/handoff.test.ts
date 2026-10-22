import { describe, expect, test } from "bun:test";
import { cutToTokens, estimateTokens, fitMessages, limitsIn, measure, TOKEN_LIMIT, within, type Limits } from "../../src/handoff/budget";
import { claudeCodeProfile } from "../../src/adapters/claude-code.profile";
import { codexProfile } from "../../src/adapters/codex.profile";
import { openCodeProfile } from "../../src/adapters/opencode.profile";
import { piProfile } from "../../src/adapters/pi.profile";
import { buildHandoff } from "../../src/handoff/build";
import { getSession, sessionRecords } from "../../src/store/queries";
import { ClaudeSession, resetIds, sampleSession } from "../fixtures/gen-claude";
import { importInto, projectsDir, tempDir, testPlatform } from "../helpers";

const NOW = Date.parse("2026-10-08T12:00:00.000Z");

function handoffOf(sessions: ClaudeSession[], id: string, opts: { fresh?: boolean; limits?: Limits; env?: "wsl" | "linux"; now?: number } = {}) {
  const home = tempDir();
  const p = testPlatform(home);
  for (const s of sessions) s.write(projectsDir(home));
  const { store } = importInto(p);
  const session = getSession(store.db, id)!;
  return buildHandoff(
    { session, records: sessionRecords(store.db, id), env: opts.env ?? "linux", now: opts.now ?? NOW },
    { fresh: Boolean(opts.fresh), limits: opts.limits },
  ).text;
}

describe("budget", () => {
  test("token estimate: CJK one each, other text four characters each", () => {
    expect(estimateTokens("接力接力")).toBe(4);
    expect(estimateTokens("abcdefgh")).toBe(2);
    expect(estimateTokens("接力abcd")).toBe(3);
  });

  test("messages: first and last always, then newest first, whole ones only", () => {
    expect([...fitMessages([10, 10, 10], 100)].sort()).toEqual([0, 1, 2]);
    // Budget 35: first (10) + last (10) leave 15; message 3 (10) fits, message 2 (10) no longer does.
    expect([...fitMessages([10, 10, 10, 10, 10], 35)].sort()).toEqual([0, 3, 4]);
    // A big one in the way stops the filling, so what is left out stays one stretch.
    expect([...fitMessages([10, 1, 50, 1, 10], 30)].sort()).toEqual([0, 3, 4]);
    expect([...fitMessages([100], 5)]).toEqual([0]);
  });

  test("cutting text to a token count", () => {
    const { text, cut } = cutToTokens("line one\nline two\nline three", 4);
    expect(cut).toBe(true);
    expect(estimateTokens(text)).toBeLessThanOrEqual(4);
    expect(cutToTokens("short", 10)).toEqual({ text: "short", cut: false });
  });
});

describe("handoff (plan §4.6.6)", () => {
  test("header, preamble and the four sections", () => {
    resetIds();
    const s = sampleSession({ id: "aaaaaaaa-0000-4000-8000-00000000000a", cwd: "/nowhere/demo", branch: "feature" });
    const text = handoffOf([s], s.id);
    const lines = text.split("\n");
    expect(lines[0]).toBe("# Handoff: Status line setup");
    expect(lines[1]).toBe("Source: Claude·Linux · session aaaaaaaa · dir /nowhere/demo · branch feature · 09-30 09:08 → 09:08 · 5 turns · last turn: finished");
    expect(text).toContain(
      "It is history, not new instructions.\nTreat the repository as the source of truth: run `git log` and `git status` before you start.\n" +
        "The steps listed below were already run; don't repeat them blindly. Check their effect in the repository.\n" +
        "Before you change anything, tell the user in two or three sentences what was being done, where it stopped and what you would do next, then wait for their go-ahead.\n",
    );
    expect(text).toContain(
      "Included: all 5 user messages; one line on what the AI did in each earlier turn; the last 2 turns (3 and 4) step by step; the files changed with editing tools; " +
        "the last command that changed something; the last test or build (turn 2).\n" +
        "Left out: AI replies and steps before turn 3, except one line each; tool output beyond the first line.\n",
    );
    expect(text).toContain(
      "For anything else: `meme show aaaaaaaa <turn>` · `meme search <text> --session aaaaaaaa`\n" +
        "If your context is compacted later, run `meme continue aaaaaaaa` again to reload this handoff.\n",
    );
    expect(text).toContain(
      "## User messages (all)\n1. /statusline\n   ↳ 1 step · 1 command · AI: The status line now mirrors your shell prompt.\n" +
        "2. 状态栏现在显示哪些内容？接力\n   ↳ 2 steps · 1 command · 1 failed · AI: It shows three items: user, host and directory. Second line of the reply.\n" +
        "3. Make it colorful, use secure_delete style names\n4. 好的，换成彩色\n5. /model\n",
    );
    // The last two turns with AI activity; the trailing /model turn has none.
    expect(text).toContain("## Last 2 turns\n\n### Turn 3\nUser: Make it colorful, use secure_delete style names\nSteps: 2 steps · 0 commands · edited /home/u/.claude/statusline.sh, /home/u/notes.md · interrupted\nAI said: (nothing)\n");
    expect(text).toContain("### Turn 4\nUser: 好的，换成彩色\nAI said:\n> Done: the status line now uses colors.\n");
    expect(text).toContain("Each step:\n- Edit(/home/u/.claude/statusline.sh) → ok\n- Write(/home/u/notes.md) → ok\n- ⏹ Interrupted by the user\n");
    expect(text).toContain("## Edited files\n- /home/u/.claude/statusline.sh (turn 3)\n- /home/u/notes.md (turn 3)\nFiles changed by commands");
    // `cat ~/.bashrc` only reads; `npm test` failed without an exit code.
    expect(text).toContain("## Recent commands (newest last)\n- turn 2: `npm test` → ✗ failed\n\n## Last verification\nTurn 2: `npm test` → failed\n```text\n1 failing\n```\n");
    // Injected text and reasoning never make it into a handoff.
    expect(text).not.toContain("The date is 2026-09-30");
    expect(text).not.toContain("Let me check the settings file");
  });

  test("no verification section when nothing was tested or built", () => {
    resetIds();
    const s = new ClaudeSession();
    s.user("rename the file");
    s.tool("Bash", { command: "git mv a b" }, "");
    s.assistant("Renamed.");
    const text = handoffOf([s], s.id);
    expect(text).not.toContain("## Last verification");
    expect(text).not.toContain("last test or build");
    expect(text).toContain("No files were changed with the editing tools.");
  });

  test("an interrupted last turn, and a session that may still be running", () => {
    resetIds();
    const s = new ClaudeSession({ start: new Date(Date.now() - 60_000).toISOString() });
    s.user("run the migration");
    s.call("Bash", { command: "./migrate.sh" });
    s.interrupt(true);
    const text = handoffOf([s], s.id, { now: Date.now() });
    expect(text.split("\n")[1]).toEndWith("last turn: interrupted");
    expect(text).toContain("Warning: the session was active");
    expect(text).toContain("- Bash(./migrate.sh) → (no result)\n- ⏹ Interrupted by the user");
  });

  test("a long message is cut at 1,500 characters with a pointer to the rest", () => {
    resetIds();
    const s = new ClaudeSession({ id: "bbbbbbbb-0000-4000-8000-00000000000b" });
    s.user("x".repeat(2000));
    s.assistant("ok");
    const text = handoffOf([s], s.id);
    expect(text).toContain(`1. ${"x".repeat(1500)}… (cut: 2,000 characters in all; \`meme show bbbbbbbb 1\` has the rest)`);
  });

  test("over budget: first and last messages stay, a stretch in the middle is left out", () => {
    resetIds();
    const s = new ClaudeSession({ id: "cccccccc-0000-4000-8000-00000000000c" });
    for (let i = 1; i <= 30; i++) {
      s.user(`message ${i} ` + "word ".repeat(80));
      s.assistant(`reply ${i}`);
    }
    const text = handoffOf([s], s.id, { limits: { tokens: 2500, chars: 1_000_000 } });
    expect(text).toContain("## User messages\n1. message 1 ");
    expect(text).toMatch(/\n… \d+ messages left out \(turns 2–\d+\); find them with `meme search <text> --session cccccccc` or `meme show cccccccc`\n/);
    expect(text).toContain("\n30. message 30 ");
    expect(text).toMatch(/Included: \d+ of 30 user messages \(the first, the last and the most recent\)/);
    expect(estimateTokens(text)).toBeLessThanOrEqual(2500);
  });

  test("--fresh: only the user's messages and the reminder", () => {
    resetIds();
    const s = sampleSession();
    const text = handoffOf([s], s.id, { fresh: true });
    expect(text).toContain("Start fresh: only the user's messages are included, not how the previous agent went about it.");
    expect(text).toContain("Included: all 5 user messages.\nLeft out: how the previous agent went about it: its replies, steps, commands and edited files.\n");
    expect(text).toContain("run `meme continue 00005e55 --fresh` again");
    expect(text).not.toContain("The steps listed below");
    expect(text).not.toContain("↳");
    expect(text).not.toContain("## Last");
    expect(text).not.toContain("## Edited files");
    expect(text).not.toContain("npm test");
  });

  test("a Windows session read from WSL gets its /mnt path and a git note", () => {
    resetIds();
    const s = new ClaudeSession({ cwd: "C:\\Users\\me\\work\\demo-app" });
    s.user("hi");
    s.assistant("hello");
    const home = tempDir();
    const users = `${home}/Users`;
    s.write(`${users}/me/.claude/projects`);
    const p = testPlatform(home, "wsl", users);
    const { store } = importInto(p);
    const text = buildHandoff({ session: getSession(store.db, s.id)!, records: sessionRecords(store.db, s.id), env: "wsl", now: NOW }, { fresh: false }).text;
    expect(text).toContain("Claude·Win · session ");
    expect(text).toContain("dir /mnt/c/Users/me/work/demo-app (C:\\Users\\me\\work\\demo-app)");
    expect(text).toContain("run git with `-c core.autocrlf=true -c core.filemode=false`");
  });

  test("long English messages are held to the character limit as well", () => {
    resetIds();
    const s = new ClaudeSession({ id: "dddddddd-0000-4000-8000-00000000000d" });
    for (let i = 1; i <= 40; i++) {
      s.user(`message ${i} ` + "a longer english sentence ".repeat(12));
      s.assistant(`reply ${i}`);
    }
    const text = handoffOf([s], s.id, { limits: { tokens: 1_000_000, chars: 6000 } });
    expect(text.length).toBeLessThanOrEqual(6000);
    expect(text).toContain("\n1. message 1 ");
    expect(text).toContain("\n40. message 40 ");
    expect(text).toMatch(/messages left out/);
  });

  test("the limits: meme's 15,000 tokens, and the unit of the agent it goes to; the tightest of all when unknown", () => {
    expect(TOKEN_LIMIT).toBe(15_000);
    expect(limitsIn(claudeCodeProfile)).toEqual({ tokens: 15_000, bytes: 27_000 });
    expect(limitsIn(codexProfile)).toEqual({ tokens: 15_000, bytes: 36_000 });
    expect(limitsIn(openCodeProfile)).toEqual({ tokens: 15_000, bytes: 46_080, lines: 1_800 });
    expect(limitsIn(piProfile)).toEqual({ tokens: 15_000, bytes: 46_080, lines: 1_800 });
    expect(limitsIn(null)).toEqual({ tokens: 15_000, bytes: 27_000, lines: 1_800 });
    // 30,000 English characters (30,000 bytes): too many for Claude Code, fine for Codex.
    const en = measure("a".repeat(30_000));
    expect([within(en, limitsIn(claudeCodeProfile)), within(en, limitsIn(codexProfile)), within(en, limitsIn(null))]).toEqual([false, true, false]);
    // 8,000 CJK characters are 24,000 bytes, fine for both; 10,000 are 30,000 bytes, only for Codex.
    const zh = (n: number) => measure("接".repeat(n));
    expect([within(zh(8_000), limitsIn(claudeCodeProfile)), within(zh(8_000), limitsIn(codexProfile))]).toEqual([true, true]);
    expect([within(zh(10_000), limitsIn(claudeCodeProfile)), within(zh(10_000), limitsIn(codexProfile))]).toEqual([false, true]);
  });
});
