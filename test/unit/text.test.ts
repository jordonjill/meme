import { describe, expect, test } from "bun:test";
import { displayPath, pathKey, samePath, winToWsl } from "../../src/platform/paths";
import { ago, shortPath, size, span, truncate, visible, width, wrap } from "../../src/render/text";
import { parseKeys } from "../../src/tui/keys";
import { clip } from "../../src/tui/screen";

describe("text widths", () => {
  test("CJK characters take two columns", () => {
    expect(width("接力ab")).toBe(6);
    expect(truncate("接力内容很长", 7)).toBe("接力内…");
    expect(width(truncate("接力内容很长", 7))).toBeLessThanOrEqual(7);
    expect(truncate("short", 10)).toBe("short");
    expect(wrap("接力接力接力", 5)).toEqual(["接力", "接力", "接力"]);
  });

  test("clip keeps escape codes and cuts by columns", () => {
    expect(clip("\x1b[1mab接力\x1b[22m", 4)).toBe("\x1b[1mab接");
    expect(clip("abc", 10)).toBe("abc");
  });

  test("control characters are made visible", () => {
    expect(visible("a\x1b[31mb\x07")).toBe("a^[[31mb^G");
  });

  test("sizes and times", () => {
    expect(size(360448)).toBe("352KB");
    expect(size(1_048_576)).toBe("1.0MB");
    expect(size(512)).toBe("512B");
    const now = Date.parse("2026-10-08T12:00:00Z");
    expect(ago("2026-10-08T10:00:00Z", now)).toBe("2h ago");
    expect(ago("2026-09-30T12:00:00Z", now)).toBe("1w ago");
    expect(ago("2026-10-08T11:59:40Z", now, true)).toBe("20 seconds ago");
    const n = new Date("2026-10-08T12:00:00Z");
    expect(span("2026-09-30T09:08:00Z", "2026-09-30T09:12:00Z", n)).toBe("09-30 09:08 → 09:12");
    expect(span("2026-09-18T14:56:00Z", "2026-09-21T10:12:00Z", n)).toBe("09-18 14:56 → 09-21 10:12");
    expect(span("2025-09-18T14:56:00Z", "2025-09-18T15:00:00Z", n)).toBe("2025-09-18 14:56 → 15:00");
  });
});

describe("paths", () => {
  test("Windows paths seen from WSL", () => {
    expect(winToWsl("C:\\Users\\me\\work\\demo-app")).toBe("/mnt/c/Users/me/work/demo-app");
    expect(winToWsl("D:\\")).toBe("/mnt/d");
    expect(winToWsl("/home/me")).toBe("/home/me");
  });
  test("Windows drives compare without case, the rest exactly", () => {
    expect(samePath("/mnt/c/Users/Me/x", "/mnt/c/users/me/x/")).toBe(true);
    expect(samePath("C:\\Users\\Me", "c:/users/me")).toBe(true);
    expect(samePath("/home/Me", "/home/me")).toBe(false);
    expect(pathKey("/home/me/")).toBe("/home/me");
  });
  test("home shows as ~", () => {
    expect(displayPath("/home/me/work/x", "/home/me")).toBe("~/work/x");
    expect(displayPath("/home/me", "/home/me")).toBe("~");
    expect(displayPath("/home/meme/x", "/home/me")).toBe("/home/meme/x");
    expect(displayPath("C:\\Users\\me\\work", "C:\\Users\\me")).toBe("~\\work");
  });
});

describe("keys", () => {
  test("arrows, paging, enter, esc, tab, ctrl, text", () => {
    expect(parseKeys("\x1b[A\x1b[B\x1bOA\x1b[5~\x1b[6~").map((k) => k.name)).toEqual(["up", "down", "up", "pageup", "pagedown"]);
    expect(parseKeys("\r")).toEqual([{ name: "enter" }]);
    expect(parseKeys("\x1b")).toEqual([{ name: "esc" }]);
    expect(parseKeys("\t\x1b[Z")).toEqual([{ name: "tab" }, { name: "backtab" }]);
    expect(parseKeys("\x01\x03")).toEqual([{ name: "ctrl", ch: "a" }, { name: "ctrl", ch: "c" }]);
    expect(parseKeys("接力 x")).toEqual([{ name: "char", ch: "接" }, { name: "char", ch: "力" }, { name: "space" }, { name: "char", ch: "x" }]);
    expect(parseKeys("\x7f")).toEqual([{ name: "backspace" }]);
    // Modified arrows (Ctrl+Up) still move; unknown sequences are dropped.
    expect(parseKeys("\x1b[1;5A\x1b[200~")).toEqual([{ name: "up" }]);
  });
});

describe("shortPath", () => {
  test("keeps the start and the last folders, losing the middle", () => {
    const win = "~\\AppData\\Roaming\\Cindy\\owners\\8abfb6a6ce34715bea84\\bots\\cindy\\default-workspace";
    expect(shortPath(win, 40)).toBe("~\\AppData\\…\\bots\\cindy\\default-workspace");
    expect(shortPath("/home/jihd/work/private/docs/meme/design/notes", 30)).toBe("/home/…/docs/meme/design/notes");
    expect(shortPath("/home/jihd/work/private/docs/meme/design/notes", 36)).toBe("/home/jihd/…/docs/meme/design/notes");
    expect(shortPath("~/work/meme", 40)).toBe("~/work/meme");
    expect(width(shortPath(win, 40))).toBeLessThanOrEqual(40);
  });
  test("a last folder too long for the room is cut at its end", () => {
    expect(shortPath("~/work/a-folder-name-that-is-far-too-long-to-fit", 20)).toBe("~/…/a-folder-name-t…");
  });
});

