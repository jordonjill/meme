import { describe, expect, test } from "bun:test";
import path from "node:path";
import { apply, type NewEvidence, type Op } from "../../src/memory/apply";
import { buildContext, contextText, NOTICE, recall, type Scope } from "../../src/memory/context";
import { closest, pieces } from "../../src/memory/match";
import { memoryPaths } from "../../src/memory/store";
import type { Entry, Shelf } from "../../src/memory/types";
import { tempDir } from "../helpers";

const entry = (text: string, over: Partial<Entry> = {}): Entry => ({ id: "m-00000000", text, kind: "fact", agents: "all", basis: "stated", status: "active", evidence: [], ...over });

describe("matching without a model (plan-m2 F3)", () => {
  test("words of letters and digits; paths, commands and identifiers fall apart at punctuation", () => {
    expect([...pieces("Bump SCHEMA_VERSION in src/store/db.ts, then run `bun test`")].sort()).toEqual(["bump", "bun", "db", "run", "schema", "src", "store", "test", "ts", "version"]);
  });

  test("Chinese is compared by every two neighbouring characters", () => {
    expect([...pieces("给登录接口加限流")]).toEqual(["给登", "登录", "录接", "接口", "口加", "加限", "限流"]);
    expect([...pieces("用 pnpm 装依赖")].sort()).toEqual(["pnpm", "依赖", "用", "装依"]);
  });

  test("a two-character Chinese word in a task finds the entry that has it", () => {
    const entries = [entry("登录接口要限流，每分钟 60 次"), entry("回复用中文"), entry("不要自动 push")];
    expect(closest("帮我给登录接口加限流", entries, (e) => e).map((m) => m.item.text)).toEqual(["登录接口要限流，每分钟 60 次"]);
  });

  test("close enough: a shared word of three letters, or two pieces, or all there is to look for", () => {
    const entries = [entry("Install with pnpm, not npm."), entry("改表结构要升版本号"), entry("会议定在周五")];
    expect(closest("pnpm", entries, (e) => e).map((m) => m.item.text)).toEqual(["Install with pnpm, not npm."]);
    // Someone looking for one two-character word finds it.
    expect(closest("结构", entries, (e) => e).map((m) => m.item.text)).toEqual(["改表结构要升版本号"]);
    expect(closest("表结构", entries, (e) => e).map((m) => m.item.text)).toEqual(["改表结构要升版本号"]);
    // One two-character piece out of a longer text is chance.
    expect(closest("这个组织结构不太好", entries, (e) => e)).toEqual([]);
    expect(closest("it is on the", entries, (e) => e)).toEqual([]);
  });

  test("the closest first: a piece counts for more the fewer entries have it", () => {
    const entries = [entry("Run the tests with bun test."), entry("Run the api tests only after the database is up."), entry("Database migrations live in db/migrate.")];
    const found = closest("the api tests fail without the database", entries, (e) => e).map((m) => m.item.text);
    // Three shared words, one of them in no other entry; the others share one common word each.
    expect(found[0]).toBe("Run the api tests only after the database is up.");
    expect(found.length).toBe(3);
  });

  test("when and why count too", () => {
    const entries = [entry("Start the database first.", { kind: "experience", when: "running the api tests", why: "ECONNREFUSED otherwise" })];
    expect(closest("ECONNREFUSED", entries, (e) => e).length).toBe(1);
    expect(closest("api", entries, (e) => e).length).toBe(1);
  });
});

describe("what an agent is given (plan-m2 F3)", () => {
  const AT = new Date(2026, 10, 17, 14, 32);
  const RULES: Shelf = { level: "user", file: "RULES" };
  const USER: Shelf = { level: "user", file: "USER" };
  const HERE = { key: "tool-1a2b3c4d", identity: "github.com/me/tool" };
  const mine: Shelf = { level: "project", project: HERE.key, file: "MEMORY" };
  const theirs: Shelf = { level: "project", project: "other-99999999", file: "MEMORY" };
  const learned: Shelf = { level: "project", project: HERE.key, file: "EXPERIENCE" };

  async function memory(items: [shelf: Shelf, text: string, over?: Partial<Op>][]) {
    const dataDir = path.join(tempDir(), ".meme");
    const said = (content: string): NewEvidence => ({ kind: "fact", tier: "stated", speaker: "user", scope: "user", source: "cli", content, at: AT, label: "meme remember" });
    await apply(dataDir, { origin: "user", evidence: items.map(([, text]) => said(text)), ops: items.map(([shelf, text, over], i) => ({ op: "add", shelf, text, kind: "fact", evidence: [i], ...over }) as Op) });
    const scope: Scope = { memoryDir: memoryPaths(dataDir).memory, project: HERE, agent: null };
    return { dataDir, scope };
  }

  test("the rules, facts about the user, and this project's facts; never another project's", async () => {
    const { scope } = await memory([
      [RULES, "Reply in Chinese."],
      [USER, "Works in WSL and on Windows."],
      [mine, "Tests need the database running."],
      [theirs, "Uses yarn."],
    ]);
    const text = contextText(buildContext(scope));
    expect(text.split("\n")).toEqual([NOTICE, "", "Rules", expect.stringMatching(/^- \[m-[0-9a-f]{8}\] Reply in Chinese\.$/), "", "About you", expect.stringMatching(/^- \[m-[0-9a-f]{8}\] Works in WSL and on Windows\.$/), "", "This project (tool)", expect.stringMatching(/^- \[m-[0-9a-f]{8}\] Tests need the database running\.$/), ""]);
    expect(text).not.toContain("yarn");
    // In another project: the user's own only.
    expect(contextText(buildContext({ ...scope, project: { key: "x-00000000", identity: "/somewhere/x" } }))).not.toContain("This project");
  });

  test("what holds beyond one project is given in every project, and in none (plan-m2 F12)", async () => {
    const GENERAL: Shelf = { level: "user", file: "MEMORY" };
    const { scope } = await memory([
      [USER, "Works in WSL and on Windows."],
      [mine, "Tests need the database running."],
      [GENERAL, "The team's model gateway is at https://llm.example.com/v1."],
    ]);
    const lines = (s: Scope) => contextText(buildContext(s)).split("\n").map((l) => l.replace(/m-[0-9a-f]{8}/, "ID"));
    expect(lines(scope)).toEqual([NOTICE, "", "About you", "- [ID] Works in WSL and on Windows.", "", "This project (tool)", "- [ID] Tests need the database running.", "", "Memory", "- [ID] The team's model gateway is at https://llm.example.com/v1.", ""]);
    expect(lines({ ...scope, project: null })).toEqual([NOTICE, "", "About you", "- [ID] Works in WSL and on Windows.", "", "Memory", "- [ID] The team's model gateway is at https://llm.example.com/v1.", ""]);
  });

  test("nothing in memory for here is no text at all", async () => {
    const { scope } = await memory([[theirs, "Uses yarn."]]);
    expect(contextText(buildContext(scope))).toBe("");
  });

  test("experience is given only when it has to do with the task, and says when it applies", async () => {
    const { scope } = await memory([
      [RULES, "Reply in Chinese."],
      [learned, "Start the database before the api tests.", { kind: "experience", when: "running the api tests" }],
      [learned, "Bump SCHEMA_VERSION when a table changes.", { kind: "experience" }],
    ]);
    const idle = buildContext(scope);
    expect(idle.sections.map((s) => s.title)).toEqual(["Rules"]);
    expect(idle.left).toBe(2);
    expect(contextText(idle)).toEndWith("\n\n2 more in memory for here: `meme recall <words>` finds them.\n");
    const busy = buildContext(scope, { task: "the api tests fail on CI" });
    expect(busy.sections.map((s) => s.title)).toEqual(["Rules", "May apply to this task"]);
    expect(contextText(busy)).toContain("] Start the database before the api tests. (when: running the api tests)\n");
    expect(contextText(busy)).not.toContain("SCHEMA_VERSION");
    // A task nothing has to do with adds nothing.
    expect(buildContext(scope, { task: "write the release notes" }).sections.map((s) => s.title)).toEqual(["Rules"]);
  });

  test("only what is in force, and only what is for this agent", async () => {
    const { dataDir, scope } = await memory([
      [RULES, "Install with npm."],
      [RULES, "Read a file before patching it.", { agents: "codex" }],
    ]);
    const [old] = buildContext(scope).sections[0]!.entries;
    await apply(dataDir, { origin: "user", evidence: [{ kind: "fact", tier: "stated", speaker: "user", scope: "user", source: "cli", content: "Install with pnpm.", at: AT, label: "meme remember" }], ops: [{ op: "replace", id: old!.id, shelf: RULES, text: "Install with pnpm.", kind: "fact", evidence: [0] }] });
    expect(buildContext(scope).sections[0]!.entries.map((e) => e.text)).toEqual(["Install with pnpm."]);
    expect(buildContext({ ...scope, agent: "codex" }).sections[0]!.entries.map((e) => e.text)).toEqual(["Read a file before patching it.", "Install with pnpm."]);
    expect(buildContext({ ...scope, agent: "claude-code" }).sections[0]!.entries.map((e) => e.text)).toEqual(["Install with pnpm."]);
  });

  test("what the project's own instruction file already says is not said again", async () => {
    const { scope } = await memory([
      [RULES, "Reply in Chinese."],
      [mine, "Bun is at ~/tools/bun/bin/bun."],
    ]);
    const ctx = buildContext(scope, { instructions: ["# demo\n\n- On this machine, Bun is at `~/tools/bun/bin/bun`!\n"] });
    expect(ctx.sections.map((s) => s.title)).toEqual(["Rules"]);
    expect(ctx.left).toBe(0);
  });

  test("it stays under its length: what does not fit is counted, not cut in the middle", async () => {
    const many: [Shelf, string][] = Array.from({ length: 40 }, (_, i) => [RULES, `Rule number ${i}: ${"word ".repeat(55)}`]);
    const { scope } = await memory(many);
    const ctx = buildContext(scope);
    const shown = ctx.sections[0]!.entries.length;
    expect(shown).toBeLessThan(30);
    expect(ctx.left).toBe(40 - shown);
    expect(contextText(ctx)).toEndWith(`\n\n${40 - shown} more in memory for here: \`meme recall <words>\` finds them.\n`);
  });

  test("recall finds entries here by their words, the closest first; other projects only when asked", async () => {
    const { scope } = await memory([
      [RULES, "Install with pnpm, not npm."],
      [mine, "CI runs pnpm test on every push."],
      [theirs, "pnpm workspaces are not used."],
    ]);
    expect(recall(scope, "pnpm test").map((p) => p.entry.text)).toEqual(["CI runs pnpm test on every push.", "Install with pnpm, not npm."]);
    expect(recall(scope, "pnpm", true).length).toBe(3);
    expect(recall(scope, "kubernetes")).toEqual([]);
  });
});
