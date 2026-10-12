import { describe, expect, test } from "bun:test";
import { makeStyle } from "../../src/render/labels";
import { listed, listing, lsText } from "../../src/render/ls";
import { searchText } from "../../src/render/search";
import { buildShow, showText, type ShowOptions } from "../../src/render/show";
import { allSessions, getSession, resolveSession, shortest, LookupError } from "../../src/store/queries";
import { compile, groupByChain, PatternError, search } from "../../src/store/search";
import { ClaudeSession, resetIds, sampleSession } from "../fixtures/gen-claude";
import { importInto, projectsDir, tempDir, testPlatform } from "../helpers";

const NOW = Date.parse("2026-10-08T12:00:00.000Z");
const plain = makeStyle(false);

/** Two projects; in the first, session A continued in B. */
function world() {
  resetIds();
  const home = tempDir();
  const p = testPlatform(home);
  const projects = projectsDir(home);
  const a = sampleSession({ id: "aaaaaaaa-0000-4000-8000-00000000000a", cwd: "/work/demo" });
  const b = new ClaudeSession({ id: "bbbbbbbb-0000-4000-8000-00000000000b", cwd: "/work/demo", start: "2026-10-01T10:00:00.000Z" });
  a.resumeInto(b);
  b.aiTitle("Status line setup");
  b.user("接力 in the new session");
  b.tool("Bash", { command: "grep -r 接力 docs" }, "docs/a.md: 接力 here\ndocs/b.md: 接力 there");
  b.assistant("Found two files about 接力.");
  const c = new ClaudeSession({ id: "cccccccc-0000-4000-8000-00000000000c", cwd: "/work/other", start: "2026-09-01T08:00:00.000Z" });
  c.user("unrelated: secure-delete and secure_delete");
  c.assistant("Both spellings exist.");
  for (const s of [a, b, c]) s.write(projects);
  const { store } = importInto(p);
  return { p, store, a, b, c };
}

describe("search (plan §4.6.5)", () => {
  test("Chinese two-character words are found; copied records count once", () => {
    const { store, a, b } = world();
    const hits = search(store.db, { pattern: "接力", fixed: false, ignoreCase: false, context: 0, sessions: null });
    // A's own prompt, and B's prompt, call, two output lines and reply; B's copy of A's prompt is skipped.
    const where = hits.map((h) => `${h.session.slice(0, 1)}:${h.role}${h.call ? ":call" : ""}`);
    expect(where).toEqual(["a:user", "b:user", "b:assistant:call", "b:tool", "b:tool", "b:assistant"]);
    const groups = groupByChain(store.db, hits, new Map(allSessions(store.db).map((s) => [s.id, s])));
    expect(groups).toHaveLength(1);
    expect(groups[0]!.head.id).toBe(b.id);
    // A's hit opens in B, at the same record's turn there.
    expect(groups[0]!.turnInHead.get(groups[0]!.hits[0]!)).toBe(2);
    void a;
  });

  test("-F matches `_` literally; regex and -i work", () => {
    const { store } = world();
    const run = (pattern: string, fixed: boolean, ignoreCase = false) =>
      search(store.db, { pattern, fixed, ignoreCase, context: 0, sessions: null }).map((h) => h.line);
    expect(run("secure_delete", true)).toEqual(["Make it colorful, use secure_delete style names", "unrelated: secure-delete and secure_delete"]);
    expect(run("secure.delete", false)).toHaveLength(2);
    expect(run("SECURE_DELETE", true)).toHaveLength(0);
    expect(run("SECURE_DELETE", true, true)).toHaveLength(2);
    expect(run("^Both", false)).toEqual(["Both spellings exist."]);
  });

  test("injected messages and reasoning are not searched", () => {
    const { store } = world();
    const run = (pattern: string) => search(store.db, { pattern, fixed: true, ignoreCase: false, context: 0, sessions: null });
    expect(run("The date is 2026-09-30")).toHaveLength(0);
    expect(run("Set up the status line to match")).toHaveLength(0);
    expect(run("Let me check the settings file")).toHaveLength(0);
  });

  test("scope: only the given sessions", () => {
    const { store, c } = world();
    const hits = search(store.db, { pattern: "secure", fixed: true, ignoreCase: false, context: 0, sessions: [c.id] });
    expect(new Set(hits.map((h) => h.session))).toEqual(new Set([c.id]));
    expect(search(store.db, { pattern: "x", fixed: true, ignoreCase: false, context: 0, sessions: [] })).toEqual([]);
  });

  test("a bad regex is reported", () => {
    expect(() => compile({ pattern: "(", fixed: false, ignoreCase: false })).toThrow(PatternError);
    expect(compile({ pattern: "a.b(", fixed: true, ignoreCase: false }).test("xa.b(y")).toBe(true);
  });

  test("text output groups by session and hides tool output unless --all", () => {
    const { store } = world();
    const hits = search(store.db, { pattern: "接力", fixed: false, ignoreCase: false, context: 0, sessions: null });
    const groups = groupByChain(store.db, hits, new Map(allSessions(store.db).map((s) => [s.id, s])));
    const out = searchText(groups, { st: plain, width: 100, now: NOW, all: false, perSession: 3 });
    expect(out).toBe(
      [
        "3 matches in 1 session (+1 in tool calls, +2 in tool output; use --all)",
        "",
        "Status line setup  [Claude·Linux]  10-01  3 matches",
        "  turn   2  You:  状态栏现在显示哪些内容？接力",
        "  turn   5  You:  接力 in the new session",
        "  turn   5  AI:   Found two files about 接力.",
        "  → meme show bbbbbbbb 2",
        "",
      ].join("\n"),
    );
    const all = searchText(groups, { st: plain, width: 100, now: NOW, all: true, perSession: Infinity });
    expect(all).toContain("6 matches in 1 session\n");
    expect(all).toContain("Call: grep -r 接力 docs");
    expect(all).toContain("Tool: docs/a.md: 接力 here");
    expect(searchText([], { st: plain, width: 100, now: NOW, all: false, perSession: 3 })).toBe("No matches.\n");
    // Only tool hits: nothing listed, the counts still say where to look.
    const onlyTools = groupByChain(store.db, hits.filter((h) => h.call || h.toolOutput), new Map(allSessions(store.db).map((s) => [s.id, s])));
    expect(searchText(onlyTools, { st: plain, width: 100, now: NOW, all: false, perSession: 3 })).toBe(
      "No matches in what was said (+1 in tool calls, +2 in tool output; use --all)\n",
    );
  });
});

describe("ls", () => {
  test("current project, chain shown once, newest first", () => {
    const { store, b, c } = world();
    const rows = allSessions(store.db);
    const mine = listed(rows, { all: false, project: "/work/demo" });
    expect(mine.map((r) => r.id)).toEqual([b.id]);
    expect(listed(rows, { all: true, project: "/x" }).map((r) => r.id)).toEqual([b.id, c.id]);
    expect(listed(rows, { all: true, project: "/x", env: "win" })).toEqual([]);
    const text = lsText(listing(rows, { all: false, project: "/work/demo" }), { home: "/home/u", now: NOW, st: plain, width: 100 });
    expect(text).toBe(
      [
        "Sessions in /work/demo (newest first):",
        `  bbbbbbbb  Claude·Linux  1w ago  main  ${mine[0]!.size >= 1024 ? Math.round(mine[0]!.size / 1024) + "KB" : mine[0]!.size + "B"}  Status line setup`,
        "+1 session in other projects (use -a)",
        "Run `meme continue <id>` to continue one.",
        "",
      ].join("\n"),
    );
  });

  test("a project without sessions falls back to all projects", () => {
    const { store, b, c } = world();
    const rows = allSessions(store.db);
    const l = listing(rows, { all: false, project: "/home/u" });
    expect([l.fellBack, l.filter.all, l.rows.map((r) => r.id)]).toEqual([true, true, [b.id, c.id]]);
    const text = lsText(l, { home: "/home/u", now: NOW, st: plain, width: 120 }).split("\n");
    expect(text[0]).toBe("No sessions in ~ — showing all projects");
    expect(text[1]).toMatch(/^ {2}bbbbbbbb {2}Claude·Linux .* \/work\/demo +Status line setup$/);
    expect(text[3]).toBe("Run `meme continue <id>` to continue one.");
    expect(lsText(listing([], { all: false, project: "/x" }), { home: "/home/u", now: NOW, st: plain, width: 100 })).toBe("No sessions found.\n");
  });

  test("session ids resolve from a unique prefix", () => {
    const { store, b } = world();
    expect(resolveSession(store.db, "BBBB").id).toBe(b.id);
    expect(() => resolveSession(store.db, "dddd")).toThrow(LookupError);
    expect(() => resolveSession(store.db, "not-hex!")).toThrow(LookupError);
  });

  test("a short id is 8 characters, more when another id starts the same way", () => {
    expect(shortest("019dc1a2-5b2c-7e01-9a3f-1c2d3e4f5a6b", [null, "1111aaaa-0000-4000-8000-000000000001"])).toBe("019dc1a2");
    // uuid v7 made within a minute: the '-' is shared, so the first difference comes after it.
    expect(shortest("019dc1a2-5b2c-7e01-9a3f-1c2d3e4f5a6b", ["019dc1a2-5a00-7000-8000-000000000000", "019dc1a2-7d10-7c44-8b1e-2f3a4b5c6d7e"])).toBe("019dc1a2-5b");
    expect(shortest("abc", ["abd"])).toBe("abc");
  });
});

describe("show", () => {
  const opts = (o: Partial<ShowOptions> = {}): ShowOptions => ({ st: plain, width: 100, home: "/home/u", now: NOW, full: false, all: false, wrap: false, ...o });

  test("one line per turn, with a separator where the session was continued", () => {
    const { store, b } = world();
    const out = showText(buildShow(store.db, getSession(store.db, b.id)!), opts(), "none");
    expect(out.split("\n").slice(0, 21)).toEqual([
      "Status line setup  [Claude·Linux]",
      expect.stringMatching(/^\/work\/demo · main · 09-30 09:08 → 10-01 10:0\d · 5 turns · \d+KB$/),
      "  1 ❯ /statusline",
      "      ▸ 1 step · 1 command",
      "      ● The status line now mirrors your shell prompt.",
      "  2 ❯ 状态栏现在显示哪些内容？接力",
      "      ▸ 2 steps · 1 command · 1 failed",
      "      ● It shows three items: user, host and directory.…",
      "  3 ❯ Make it colorful, use secure_delete style names",
      "      ▸ 2 steps · edited 2 files · interrupted",
      "  4 ❯ 好的，换成彩色",
      "      ● Done: the status line now uses colors.",
      "  ── continued from aaaaaaaa ──",
      "  5 ❯ 接力 in the new session",
      "      ▸ 1 step · 1 command",
      "      ● Found two files about 接力.",
      "Last turn finished.",
      "Run `meme show bbbbbbbb <turn>` to expand a turn, or `meme show bbbbbbbb --full` for everything.",
      "",
    ].slice(0, 21));
  });

  test("an expanded turn: every step, three result lines, failures, injected and interrupts", () => {
    const { store, a } = world();
    const m = buildShow(store.db, getSession(store.db, a.id)!);
    expect(showText(m, opts(), 2).split("\n").slice(2)).toEqual([
      "  2 ❯ 状态栏现在显示哪些内容？接力",
      "      ● Read  /home/u/.claude/settings.json",
      "      ⎿ {",
      '          "statusLine": {}',
      "        }",
      "      ✗ Bash  npm test",
      "      ⎿ 1 failing",
      "      ⚙ injected message (hidden)",
      "      ● It shows three items: user, host and directory.",
      "        Second line of the reply.",
      "",
    ]);
    expect(showText(m, opts(), 3)).toContain("      ⏹ [Request interrupted by user for tool use]\n");
    const all = showText(m, opts({ all: true }), 2);
    expect(all).toContain("∴ Let me check the settings file.");
    expect(all).toContain("⚙ <system-reminder>");
    expect(() => showText(m, opts(), 9)).toThrow(RangeError);
    expect(showText(m, opts(), "none")).toContain("── continued in bbbbbbbb: run `meme show bbbbbbbb` ──");
  });
});
