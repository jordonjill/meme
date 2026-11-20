import { describe, expect, test } from "bun:test";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { formatShelf, parseShelf, preambleFor, shelfFile } from "../../src/memory/entries";
import { appended, dayAndTime, parseDay, without } from "../../src/memory/evidence";
import { memoryProject, normalizeRemote, projectRef } from "../../src/memory/projects";
import { normalize, type Entry, type Evidence } from "../../src/memory/types";
import { tempDir } from "../helpers";

const piece = (over: Partial<Evidence> = {}): Evidence => ({
  id: "e-00000001",
  kind: "fact",
  tier: "stated",
  speaker: "user",
  scope: "user",
  source: "cli",
  day: "2026-11-17",
  time: "14:32",
  label: "meme remember",
  content: "Reply in Chinese.",
  ...over,
});

describe("evidence files (plan-m2 F2)", () => {
  test("a day's file reads back as what was written, quotes and all", () => {
    const items = [piece(), piece({ id: "e-00000002", kind: "experience", tier: "observed", speaker: "tool", scope: "project:demo-1a2b3c4d", source: "session:3f2a#412", time: "14:40", label: "Claude Code · demo", content: "Start the database before the api tests.", quote: "connect ECONNREFUSED 127.0.0.1:5432" })];
    const text = appended(null, items);
    expect(text).toBe(
      [
        "# 2026-11-17",
        "",
        "## 14:32 · meme remember",
        "- e-00000001 · fact · stated · user · user · cli",
        "  Reply in Chinese.",
        "",
        "## 14:40 · Claude Code · demo",
        "- e-00000002 · experience · observed · tool · project:demo-1a2b3c4d · session:3f2a#412",
        "  Start the database before the api tests.",
        "  > connect ECONNREFUSED 127.0.0.1:5432",
        "",
      ].join("\n"),
    );
    expect(parseDay(text, "2026-11-17")).toEqual(items);
  });

  test("more evidence of the same minute and origin goes under the last heading; anything else gets its own", () => {
    const first = appended(null, [piece()]);
    const same = appended(first, [piece({ id: "e-00000002", content: "Do not push unless asked." })]);
    expect(same).toBe("- e-00000002 · fact · stated · user · user · cli\n  Do not push unless asked.\n");
    const later = appended(first + same, [piece({ id: "e-00000003", time: "15:01", content: "Use pnpm." })]);
    expect(later).toStartWith("\n## 15:01 · meme remember\n");
    expect(parseDay(first + same + later, "2026-11-17").map((e) => [e.id, e.time])).toEqual([
      ["e-00000001", "14:32"],
      ["e-00000002", "14:32"],
      ["e-00000003", "15:01"],
    ]);
  });

  test("lines that are not evidence are passed over", () => {
    const text = appended(null, [piece()]) + "\nsomeone's note\n- not · evidence\n  stray\n";
    expect(parseDay(text, "2026-11-17").map((e) => e.id)).toEqual(["e-00000001"]);
  });

  test("taking evidence out removes its lines and a heading left with nothing; nothing left means no file", () => {
    const text = appended(null, [piece(), piece({ id: "e-00000002", time: "15:01", content: "Use pnpm.", quote: "always pnpm" }), piece({ id: "e-00000003", time: "15:01", content: "No force pushes." })]);
    const rest = without(text, new Set(["e-00000001", "e-00000002"]))!;
    expect(rest).toBe(["# 2026-11-17", "", "## 15:01 · meme remember", "- e-00000003 · fact · stated · user · user · cli", "  No force pushes.", ""].join("\n"));
    expect(rest).not.toContain("pnpm");
    expect(without(text, new Set(["e-00000001", "e-00000002", "e-00000003"]))).toBeNull();
  });

  test("the day is the machine's own, to the minute", () => {
    expect(dayAndTime(new Date(2026, 10, 7, 9, 5, 59))).toEqual({ day: "2026-11-07", time: "09:05" });
  });
});

describe("conclusion files (plan-m2 F2)", () => {
  const entry = (over: Partial<Entry> = {}): Entry => ({ id: "m-0000000a", text: "Install with pnpm, not npm.", kind: "fact", agents: "all", basis: "stated", status: "active", evidence: ["e-00000001"], ...over });

  test("a file reads back as what was written", () => {
    const shelf = { level: "project" as const, project: "demo-1a2b3c4d", file: "MEMORY" as const };
    const entries = [entry({ why: "the repository has pnpm-lock.yaml", replaces: "m-0000000b" }), entry({ id: "m-0000000c", text: "Start the database before the api tests.", kind: "experience", agents: "codex", basis: "observed", status: "candidate", when: "running the api tests", evidence: ["e-00000002", "e-00000003"], replacedBy: "m-0000000d" })];
    const text = formatShelf({ preamble: preambleFor(shelf, "github.com/me/demo"), entries });
    expect(text).toContain("# Project memory\n\nProject: github.com/me/demo\n");
    expect(text).toContain("## m-0000000a Install with pnpm, not npm.\n- kind: fact · agents: all · basis: stated · status: active\n- why: the repository has pnpm-lock.yaml\n- evidence: e-00000001\n- replaces: m-0000000b\n");
    expect(parseShelf(text).entries).toEqual(entries);
    expect(formatShelf(parseShelf(text))).toBe(text);
  });

  test("what a person wrote into the file stays: the first lines, and lines under an entry", () => {
    const text = ["# Rules", "", "My own note at the top.", "", "## m-0000000a Install with pnpm, not npm.", "- kind: fact · agents: all · basis: stated · status: active", "- evidence: e-00000001", "- see also the wiki", "a loose line", ""].join("\n");
    const parsed = parseShelf(text);
    expect(parsed.preamble).toBe("# Rules\n\nMy own note at the top.\n");
    expect(parsed.entries[0]!.extra).toEqual(["- see also the wiki", "a loose line"]);
    expect(formatShelf(parsed)).toBe(text);
  });

  test("where each file is", () => {
    expect(shelfFile("/m", { level: "user", file: "RULES" })).toBe(path.join("/m", "RULES.md"));
    expect(shelfFile("/m", { level: "project", project: "demo-1a2b3c4d", file: "EXPERIENCE" })).toBe(path.join("/m", "projects", "demo-1a2b3c4d", "EXPERIENCE.md"));
  });

  test("two wordings of one sentence compare equal", () => {
    expect(normalize("回复用中文；仓库里的东西全部用英文")).toBe(normalize("回复用中文;  仓库里的东西全部用英文。"));
    expect(normalize("Do NOT push, unless asked!")).toBe(normalize("do not push unless asked"));
    expect(normalize("use pnpm")).not.toBe(normalize("use npm"));
  });
});

describe("a project as memory knows it (plan-m2 F2)", () => {
  test("one remote, however it is written, is one place", () => {
    const same = ["git@github.com:Me/Demo.git", "https://github.com/Me/Demo", "https://user:token@GitHub.com/Me/Demo.git/", "ssh://git@github.com/Me/Demo.git"];
    expect(new Set(same.map(normalizeRemote))).toEqual(new Set(["github.com/Me/Demo"]));
    expect(normalizeRemote("/srv/git/demo.git")).toBe("/srv/git/demo");
  });

  test("a repository is known by its remote, so a WSL path and a Windows path of it are one project", () => {
    const [a, b] = [tempDir(), tempDir()].map((dir) => {
      mkdirSync(path.join(dir, ".git"));
      writeFileSync(path.join(dir, ".git", "config"), '[core]\n\tbare = false\n[remote "upstream"]\n\turl = https://example.com/other/demo.git\n[remote "origin"]\n\turl = git@github.com:me/My Demo!.git\n\tfetch = +refs/heads/*\n');
      return projectRef(dir);
    });
    expect(a).toEqual(b);
    expect(a!.identity).toBe("github.com/me/My Demo!");
    expect(a!.key).toMatch(/^my-demo-[0-9a-f]{8}$/);
  });

  test("without a remote it is known by its path; the key is a legal folder name on Windows too", () => {
    const dir = tempDir();
    const ref = projectRef(dir);
    expect(ref.identity).toBe(dir);
    expect(ref.key).toMatch(/^[a-z0-9._-]+-[0-9a-f]{8}$/);
    expect(projectRef("C:\\Users\\me\\work\\CON").key).toMatch(/^con-[0-9a-f]{8}$/);
    expect(projectRef("/").key).toMatch(/^project-[0-9a-f]{8}$/);
  });

  test("for memory a project is a git repository: a home folder, or a folder with no .git, is in no project (plan-m2 F12)", () => {
    const repo = tempDir();
    mkdirSync(path.join(repo, ".git"));
    expect(memoryProject(repo)).toEqual(projectRef(repo));
    const worktree = tempDir();
    writeFileSync(path.join(worktree, ".git"), "gitdir: /elsewhere/.git/worktrees/x\n");
    expect(memoryProject(worktree)).not.toBeNull();
    expect(memoryProject(tempDir())).toBeNull();
    for (const home of ["/home/me", "/home/me/", "/root", "/Users/me", "C:\\Users\\me", "/mnt/c/Users/me"]) expect(memoryProject(home)).toBeNull();
    expect(memoryProject(null)).toBeNull();
    // A folder that cannot be looked into from here, a WSL path read on Windows, is taken to be a project.
    expect(memoryProject("/nowhere/here/work/tool")).not.toBeNull();
  });
});
