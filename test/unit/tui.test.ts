import { describe, expect, test } from "bun:test";
import type { Context, Output } from "../../src/cli/context";
import { makeStyle } from "../../src/render/labels";
import type { SessionRow } from "../../src/store/queries";
import { ChoiceView } from "../../src/tui/choose";
import { PickerView } from "../../src/tui/picker";
import { Tui } from "../../src/tui/screen";
import { resetIds, sampleSession } from "../fixtures/gen-claude";
import { importInto, projectsDir, tempDir, testPlatform } from "../helpers";
import path from "node:path";
import { claudeCode } from "../../src/adapters/claude-code";
import { codex } from "../../src/adapters/codex";
import { nullLogger } from "../../src/platform/log";
import { openStore } from "../../src/store/db";
import { importAll } from "../../src/store/import";
import { sampleCodex } from "../fixtures/gen-codex";

const st = makeStyle(false);
const out: Output = { interactive: true, st, width: 80 };

describe("choosing in a terminal (meme continue)", () => {
  test("the agent choice starts on the default and reports what was chosen", () => {
    const tui = new Tui();
    const chosen: number[] = [];
    const view = new ChoiceView(tui, st, [" Continue in which agent?"], [{ label: "Claude Code" }, { label: "Codex" }], 1, (i) => chosen.push(i));
    expect(view.render(10, 80).filter((l) => l.includes("❯"))).toEqual([" ❯ Codex"]);
    view.key({ name: "up" });
    view.key({ name: "enter" });
    expect(chosen).toEqual([0]);
  });

  test("in pick mode, Enter in the session list picks the session", () => {
    resetIds();
    const home = tempDir();
    const p = testPlatform(home);
    const s = sampleSession({ cwd: "/work/demo" });
    s.write(projectsDir(home));
    const { store } = importInto(p);
    const ctx = { platform: p, store, log: { info() {}, error() {} }, imported: null, project: "/work/demo", current: new Set<string>(), wslStopped: [], now: Date.now() } as Context;
    const picked: SessionRow[] = [];
    const view = new PickerView(new Tui(), ctx, out, { all: false, project: "/work/demo" }, { title: "Continue which session?", verb: "continue", onPick: (row) => picked.push(row) });
    const screen = view.render(12, 80);
    expect(screen[0]).toContain("Continue which session?");
    // Nothing in other projects: no hint above the keys.
    expect(screen.some((l) => l.includes("in other projects"))).toBe(false);
    view.key({ name: "enter" });
    expect(picked.map((r) => r.id)).toEqual([s.id]);
  });

  test("each session's second line ends with its id, even when the line is cut", () => {
    resetIds();
    const home = tempDir();
    const p = testPlatform(home);
    const s = sampleSession({ cwd: "/work/demo", branch: "feature/a-branch-name-that-goes-on-and-on" });
    s.write(projectsDir(home));
    const { store } = importInto(p);
    // A fixed clock: the label below says how long ago the session was.
    const ctx = { platform: p, store, log: { info() {}, error() {} }, imported: null, project: "/work/demo", current: new Set<string>(), wslStopped: [], now: Date.parse("2026-10-08T12:00:00.000Z") } as Context;
    const view = new PickerView(new Tui(), ctx, out, { all: false, project: "/work/demo" }, { title: "Delete which session?", verb: "choose", onPick() {} });
    const wide = view.render(12, 120);
    expect(wide[0]).toContain("Delete which session?");
    // Short time, then the facts; the id at the right edge, under the label.
    expect(wide.find((l) => l.includes("feature/"))).toMatch(new RegExp(`^  1w ago · feature/a-branch-name-that-goes-on-and-on · 12KB {2,}${s.id.slice(0, 8)}$`));
    // The id ends where the label above it ends.
    const at = wide.findIndex((l) => l.includes("feature/"));
    expect(wide[at]!.length).toBe(wide[at - 1]!.length);
    expect(wide.at(-1)).toStartWith("↑↓ select · Enter choose · Space preview");
    const narrow = view.render(12, 40).find((l) => l.includes("feature/"))!;
    expect(narrow).toEndWith(`…  ${s.id.slice(0, 8)}`);
    expect(narrow.length).toBeLessThanOrEqual(40);
  });

  test("showing only this project, the list says how many sessions other projects have", () => {
    resetIds();
    const home = tempDir();
    const p = testPlatform(home);
    sampleSession({ cwd: "/work/demo" }).write(projectsDir(home));
    sampleSession({ id: "99999999-0000-4000-8000-000000000001", cwd: "/work/other" }).write(projectsDir(home));
    sampleSession({ id: "99999999-0000-4000-8000-000000000002", cwd: "/work/third" }).write(projectsDir(home));
    const { store } = importInto(p);
    const ctx = { platform: p, store, log: { info() {}, error() {} }, imported: null, project: "/work/demo", current: new Set<string>(), wslStopped: [], now: Date.now() } as Context;
    const view = new PickerView(new Tui(), ctx, out, { all: false, project: "/work/demo" });
    const screen = view.render(14, 80);
    expect(screen[12]).toBe(" +2 sessions in other projects (Ctrl+A)");
    expect(screen[13]).toStartWith("↑↓ select");
    view.key({ name: "ctrl", ch: "a" });
    expect(view.render(14, 80).some((l) => l.includes("in other projects"))).toBe(false);
  });
});

describe("the list's filter rows (plan §3.1)", () => {
  /** WSL and Windows sessions from Claude Code, and a WSL one from Codex. */
  function mixed() {
    resetIds();
    const home = tempDir();
    const users = path.join(home, "Users");
    const p = testPlatform(home, "wsl", users);
    sampleSession({ id: "aaaaaaaa-0000-4000-8000-000000000001", cwd: "/work/demo", start: "2026-10-09T08:00:00.000Z" }).write(projectsDir(home));
    sampleSession({ id: "bbbbbbbb-0000-4000-8000-000000000002", cwd: "C:\\work\\demo", start: "2026-10-09T10:00:00.000Z" }).write(path.join(users, "me", ".claude", "projects"));
    sampleCodex({ id: "cccccccc-0000-4000-8000-000000000003", cwd: "/work/demo", start: "2026-10-09T09:00:00.000Z" }).write(path.join(home, ".codex"));
    const store = openStore(p.dataDir);
    importAll(store, p, [claudeCode, codex], nullLogger);
    const ctx = { platform: p, store, log: { info() {}, error() {} }, imported: null, project: "/work/demo", current: new Set<string>(), wslStopped: [], now: Date.now() } as Context;
    return new PickerView(new Tui(), ctx, out, { all: true, project: "/work/demo" });
  }
  const sessions = (screen: string[]) => screen.filter((l) => /^(❯ | {2})\S/.test(l) && !l.includes(" · ")).map((l) => l.trim().replace(/^❯ /, ""));

  test("a platform row and an agent row; with all platforms the list is grouped by platform, newest group first", () => {
    const screen = mixed().render(30, 100);
    // Columns line up across the rows: WSL is padded to Claude's width.
    expect(screen[1]).toBe(" Platform   ● All    ○ WSL       ○ Win");
    expect(screen[2]).toBe(" Agent      ● All    ○ Claude    ○ Codex");
    expect(screen.filter((l) => /^ ── .+ ──$/.test(l))).toEqual([" ── Win (1) ──", " ── WSL (2) ──"]);
    expect(sessions(screen).map((l) => l.split("  ").at(-1))).toEqual(["Claude·Win", "Codex·WSL", "Claude·WSL"]);
    // The keys wrap between items instead of running off the edge.
    expect(screen.slice(-2)).toEqual(["↑↓ select · Enter open · Space preview · ←→ filter · Tab platform/agent · Ctrl+A this project", "Esc quit"]);
  });

  test("←→ change the row in focus and Tab moves the focus; one platform: no groups", () => {
    const view = mixed();
    view.key({ name: "right" });
    let screen = view.render(30, 100);
    expect(screen.filter((l) => /^ ── .+ ──$/.test(l))).toEqual([]);
    expect(sessions(screen).map((l) => l.split("  ").at(-1))).toEqual(["Codex·WSL", "Claude·WSL"]);
    view.key({ name: "tab" });
    view.key({ name: "left" });
    screen = view.render(30, 100);
    expect(screen[1]).toBe(" Platform   ○ All    ● WSL       ○ Win");
    expect(screen[2]).toBe(" Agent      ○ All    ○ Claude    ● Codex");
    expect(sessions(screen).map((l) => l.split("  ").at(-1))).toEqual(["Codex·WSL"]);
  });

  test("a stopped WSL distribution is said at the top", () => {
    resetIds();
    const home = tempDir();
    const p = testPlatform(home, "win");
    sampleSession({ cwd: "/work/demo" }).write(projectsDir(home));
    const { store } = importInto(p);
    const ctx = { platform: p, store, log: { info() {}, error() {} }, imported: null, project: "/work/demo", current: new Set<string>(), wslStopped: [{ distro: "Ubuntu", asOf: "2026-10-10T08:52:00.000Z" }], now: Date.parse("2026-10-10T09:00:00.000Z") } as Context;
    const screen = new PickerView(new Tui(), ctx, out, { all: false, project: "/work/demo" }).render(12, 100);
    expect(screen[0]).toMatch(/^ WSL \(Ubuntu\) is not running; its sessions are as of 10-10 \d\d:52$/);
  });

  test("text that does not fit is wrapped, not cut: the agent screen's explanation, styles carried over", () => {
    const st = makeStyle(true);
    const head = [" " + st.dim("meme starts the agent in WSL (Ubuntu), in the directory the session started in; its first message asks it to run `meme continue` for this session.")];
    const view = new ChoiceView(new Tui(), st, head, [{ label: "Claude Code" }], 0, () => {});
    const screen = view.render(12, 40).map((l) => l.replace(/\x1b\[[0-9;]*m/g, "|"));
    expect(screen.slice(0, 6)).toEqual([
      " |meme starts the agent in WSL",
      "| (Ubuntu), in the directory the",
      "| session started in; its first message",
      "| asks it to run `meme continue` for",
      "| this session.|",
      "",
    ]);
  });
});

describe("step 9 (plan §6 ⑨)", () => {
  /** A session of five turns in a mirror, and a context to show it with. */
  function fiveTurns(elsewhere = false) {
    resetIds();
    const home = tempDir();
    const p = testPlatform(home);
    const { ClaudeSession } = require("../fixtures/gen-claude") as typeof import("../fixtures/gen-claude");
    if (elsewhere) sampleSession({ id: "e5e5e5e5-0000-4000-8000-000000000001", cwd: "/work/other" }).write(projectsDir(home));
    const s = new ClaudeSession({ id: "f1f1f1f1-0000-4000-8000-000000000001", cwd: "/work/demo" });
    for (const [q, a] of [["set up the parser", "Parser set up."], ["add tests", "Added tests."], ["fix the tokenizer bug", "Fixed the tokenizer."], ["rename files", "Renamed."], ["update the docs", "Docs updated."]]) {
      s.user(q!);
      s.tool("Bash", { command: "bun test" }, "ok");
      s.assistant(a!);
    }
    s.write(projectsDir(home));
    const { store } = importInto(p);
    const ctx = { platform: p, store, log: { info() {}, error() {} }, imported: null, project: "/work/demo", current: new Set<string>(), wslStopped: [], now: Date.now() } as Context;
    return { ctx, store, id: s.id };
  }
  const stackOf = (tui: Tui) => (tui as unknown as { stack: unknown[] }).stack;

  test("in the list, Space previews the session and Enter opens it", () => {
    const { ctx } = fiveTurns();
    const { PreviewView } = require("../../src/tui/picker") as typeof import("../../src/tui/picker");
    const { SessionView } = require("../../src/tui/viewer") as typeof import("../../src/tui/viewer");
    const tui = new Tui();
    const view = new PickerView(tui, ctx, out, { all: false, project: "/work/demo" });
    tui.push(view);
    view.render(20, 80);
    view.key({ name: "space" });
    expect(stackOf(tui).at(-1)).toBeInstanceOf(PreviewView);
    tui.pop();
    view.key({ name: "enter" });
    expect(stackOf(tui).at(-1)).toBeInstanceOf(SessionView);
  });

  test("the session viewer: starts at the end, Enter expands a turn, / finds a turn and n goes on", () => {
    const { ctx, store, id } = fiveTurns();
    const { SessionView } = require("../../src/tui/viewer") as typeof import("../../src/tui/viewer");
    const { buildShow } = require("../../src/render/show") as typeof import("../../src/render/show");
    const { getSession } = require("../../src/store/queries") as typeof import("../../src/store/queries");
    const tui = new Tui();
    const m = buildShow(store.db, getSession(store.db, id)!, ctx.now);
    const view = new SessionView(tui, m, { st, home: "/home/u", now: ctx.now, full: false, hidden: false });
    let screen = view.render(20, 80);
    // Where the session stopped is in view, and no turn is open yet.
    expect(screen.join("\n")).toContain("update the docs");
    expect(screen.join("\n")).not.toContain("bun test");
    view.key({ name: "up" });
    view.key({ name: "enter" });
    screen = view.render(20, 80);
    // Turn 4 expanded: its step, with the command.
    expect(screen.join("\n")).toMatch(/Bash +bun test/);
    for (const k of [{ name: "char", ch: "/" }, ..."tokenizer".split("").map((ch) => ({ name: "char", ch })), { name: "enter" }] as Parameters<typeof view.key>[0][]) view.key(k);
    screen = view.render(20, 80);
    expect(screen.join("\n")).toContain('"tokenizer" in turn 3');
    view.key({ name: "char", ch: "/" });
    for (const ch of "nothing like this") view.key(ch === " " ? { name: "space" } : { name: "char", ch });
    view.key({ name: "enter" });
    expect(view.render(20, 80).join("\n")).toContain('no match for "nothing like this"');
  });

  test("R14: a view that fails gives the terminal back, and the error reaches the caller", async () => {
    const written: string[] = [];
    const raw: boolean[] = [];
    const listeners: Record<string, unknown> = {};
    const fakeOut = { rows: 5, columns: 20, write: (s: string) => written.push(s), on: (e: string, f: unknown) => (listeners[e] = f), off() {} } as unknown as NodeJS.WriteStream;
    const fakeIn = { setRawMode: (b: boolean) => raw.push(b), setEncoding() {}, on() {}, off() {}, resume() {}, pause() {} } as unknown as NodeJS.ReadStream;
    const tui = new Tui(fakeOut, fakeIn);
    const failing = { render(): string[] { throw new RangeError("Invalid array length"); }, key() {} };
    expect(tui.run(failing)).rejects.toThrow("Invalid array length");
    expect(raw).toEqual([true, false]);
    expect(written.at(-1)).toContain("\x1b[?1049l");
  });

  test("R14: the list in a window five rows high, with the other projects' line above the keys", () => {
    const { ctx } = fiveTurns(true);
    const view = new PickerView(new Tui(), ctx, out, { all: false, project: "/work/demo" });
    expect(() => view.render(5, 20)).not.toThrow();
  });

  test("R15: an emoji with a variation selector is two columns when cutting and wrapping", () => {
    const { clip, wrapLine } = require("../../src/tui/screen") as typeof import("../../src/tui/screen");
    const { truncate, width, wrap } = require("../../src/render/text") as typeof import("../../src/render/text");
    const s = "yes ⚠️ no ⚠️ maybe ✔️ ok";
    for (const n of [5, 6, 7, 9, 12]) {
      expect(width(clip(s, n)), `clip ${n}`).toBeLessThanOrEqual(n);
      expect(width(truncate(s, n)), `truncate ${n}`).toBeLessThanOrEqual(n);
      for (const l of wrap(s, n)) expect(width(l), `wrap ${n}`).toBeLessThanOrEqual(n);
      for (const l of wrapLine(s, n)) expect(width(l), `wrapLine ${n}`).toBeLessThanOrEqual(n);
    }
    expect(clip("⚠️⚠️⚠️", 4)).toBe("⚠️⚠️");
  });
});
