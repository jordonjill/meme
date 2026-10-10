import { describe, expect, test } from "bun:test";
import type { Context, Output } from "../../src/cli/context";
import { makeStyle } from "../../src/render/labels";
import type { SessionRow } from "../../src/store/queries";
import { ChoiceView } from "../../src/tui/choose";
import { PickerView } from "../../src/tui/picker";
import { Tui } from "../../src/tui/screen";
import { resetIds, sampleSession } from "../fixtures/gen-claude";
import { importInto, projectsDir, tempDir, testPlatform } from "../helpers";

const st = makeStyle(false);
const out: Output = { interactive: true, st, width: 80 };

describe("choosing in a terminal (meme continue)", () => {
  test("the agent choice starts on the default and reports what was chosen", () => {
    const tui = new Tui();
    const chosen: number[] = [];
    const view = new ChoiceView(tui, st, [" Continue in which agent?"], [{ label: "Claude Code" }, { label: "Codex" }], 1, (i) => chosen.push(i));
    expect(view.render(10).filter((l) => l.includes("❯"))).toEqual([" ❯ Codex"]);
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
    const ctx = { platform: p, store, log: { info() {}, error() {} }, imported: null, project: "/work/demo", current: null, now: Date.now() } as Context;
    const picked: SessionRow[] = [];
    const view = new PickerView(new Tui(), ctx, out, { all: false, project: "/work/demo" }, (row) => picked.push(row));
    const screen = view.render(12, 80);
    expect(screen[0]).toContain("Continue which session?");
    // Nothing in other projects: no hint above the keys.
    expect(screen.some((l) => l.includes("in other projects"))).toBe(false);
    view.key({ name: "enter" });
    expect(picked.map((r) => r.id)).toEqual([s.id]);
  });

  test("showing only this project, the list says how many sessions other projects have", () => {
    resetIds();
    const home = tempDir();
    const p = testPlatform(home);
    sampleSession({ cwd: "/work/demo" }).write(projectsDir(home));
    sampleSession({ id: "99999999-0000-4000-8000-000000000001", cwd: "/work/other" }).write(projectsDir(home));
    sampleSession({ id: "99999999-0000-4000-8000-000000000002", cwd: "/work/third" }).write(projectsDir(home));
    const { store } = importInto(p);
    const ctx = { platform: p, store, log: { info() {}, error() {} }, imported: null, project: "/work/demo", current: null, now: Date.now() } as Context;
    const view = new PickerView(new Tui(), ctx, out, { all: false, project: "/work/demo" });
    const screen = view.render(14, 80);
    expect(screen[12]).toBe(" +2 sessions in other projects (Ctrl+A)");
    expect(screen[13]).toStartWith("↑↓ select");
    view.key({ name: "ctrl", ch: "a" });
    expect(view.render(14, 80).some((l) => l.includes("in other projects"))).toBe(false);
  });
});
