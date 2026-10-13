/**
 * Plan §6 ⑩: OpenCode and Pi, read from synthetic sessions shaped like the trial
 * run's (sessions 447d4e32 and ses_ecbbcc1d): a file made, a command, an edit, `!`,
 * a stop, a compaction; then what only these two do.
 */
import { describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { openCode } from "../../src/adapters/opencode";
import { openCodeProfile } from "../../src/adapters/opencode.profile";
import { pi, piFolder } from "../../src/adapters/pi";
import { piProfile } from "../../src/adapters/pi.profile";
import { runningAgent } from "../../src/adapters/profiles";
import { openCheck } from "../../src/cli/open";
import { limitsIn, measure, within } from "../../src/handoff/budget";
import { buildHandoff } from "../../src/handoff/build";
import { messagesOf } from "../../src/handoff/chain";
import { promptText, shellOutput } from "../../src/model/record";
import { endingOf, groupTurns } from "../../src/model/turns";
import { nullLogger } from "../../src/platform/log";
import type { Platform } from "../../src/platform/paths";
import { openStore } from "../../src/store/db";
import { importAll } from "../../src/store/import";
import { getSession, handedOver, sessionRecords, unknownTypes } from "../../src/store/queries";
import { OpenCodeDb, resetOpenCodeIds, sampleOpenCode } from "../fixtures/gen-opencode";
import { PiSession, samplePi } from "../fixtures/gen-pi";
import { tempDir, testPlatform } from "../helpers";

const PI = "9a9a9a9a-0000-4000-8000-000000000001";
const OC = "ses_ecbbcc1dcffeAbCdEfGhIjKlMn";
/** meme's id for it: without `ses_`, in lower case. */
const OC_ID = "ecbbcc1dcffeabcdefghijklmn";

const piSessions = (home: string) => path.join(home, ".pi", "agent", "sessions");
const openCodeDb = (home: string) => path.join(home, ".local", "share", "opencode", "opencode.db");

/** A home with these sessions, mirrored. */
function mirror(write: (home: string) => void, platform?: (home: string) => Platform) {
  resetOpenCodeIds();
  const home = tempDir();
  write(home);
  const p = platform?.(home) ?? testPlatform(home);
  const store = openStore(p.dataDir);
  const again = () => importAll(store, p, [openCode, pi], nullLogger);
  again();
  const records = (id: string) => sessionRecords(store.db, id);
  return {
    home,
    p,
    db: store.db,
    again,
    records,
    messages: (id: string) => messagesOf(records(id)).map((m) => m.text),
    turns: (id: string) => groupTurns(records(id)).turns,
    unknown: () => unknownTypes(store.db, "unknown").map((u) => `${u.type} ${u.version}`),
    unread: () => unknownTypes(store.db, "unread").map((u) => u.type),
    handoff: (id: string, limits = limitsIn(null)) =>
      buildHandoff(
        { session: getSession(store.db, id)!, records: records(id), env: "linux", now: Date.parse("2026-10-14T00:00:00Z"), lookup: (ref, before) => handedOver(store.db, ref, before), current: new Set() },
        { fresh: false, limits },
      ),
  };
}

const userTexts = (records: ReturnType<typeof sessionRecords>) =>
  records.filter((r) => r.role === "user" && !r.injected).map((r) => promptText((r.body as { content: string }).content));

describe("Pi (session format 3, 1.2.0)", () => {
  test("a session of the trial run: prompts, `!` and `!!` with their output, a stop, the compaction summary, the files edited", () => {
    const m = mirror((home) => samplePi().write(piSessions(home)));
    expect(m.unknown()).toEqual([]);
    expect(m.unread()).toEqual([]);
    const s = getSession(m.db, PI)!;
    expect([s.agent, s.project, s.title]).toEqual(["pi", "/work/demo", "Create notes.md with one line: hello"]);
    expect(userTexts(m.records(PI))).toEqual([
      "Create notes.md with one line: hello",
      "Run the tests",
      "Change hello to hi",
      "! git status --short",
      "! echo private-123",
      "Wait for the build",
      "[Pi: the user stopped this turn]",
      "Skip the build; check the zebra config instead",
      "What does notes.md say now?",
    ]);
    const bang = m.records(PI).find((r) => promptText((r.body as { content: string }).content ?? "") === "! git status --short")!;
    expect(shellOutput((bang.body as { content: string }).content)).toBe(" M notes.md\n");
    const turns = m.turns(PI);
    expect(turns.map((t) => t.n)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(turns.find((t) => t.interrupted)?.n).toBe(6);
    expect(turns.flatMap((t) => t.edited)).toEqual(["notes.md", "notes.md"]);
    expect(turns[1]!.commands).toBe(1);
    const summary = m.records(PI).filter((r) => r.injected === "compact_summary");
    expect(summary.map((r) => (r.body as { content: string }).content.split("\n")[0])).toEqual(["## Goal"]);
    expect(endingOf(m.records(PI))).toBe("finished");
  });

  test("the name the user gave is the title", () => {
    const m = mirror((home) => {
      const s = samplePi();
      s.name("Notes and zebras");
      s.write(piSessions(home));
    });
    expect(getSession(m.db, PI)!.title).toBe("Notes and zebras");
  });

  test("a branch the user left with /tree is not part of the session; its summary is the harness's", () => {
    const m = mirror((home) => {
      const s = new PiSession();
      s.user("Set up the project");
      const before = s.assistant("Set up.");
      s.user("Rename everything to camelCase");
      s.tool("edit", { path: "src/x.ts", edits: [] }, "ok");
      const left = s.assistant("Renamed everything.");
      s.backTo(before);
      s.branchSummary("Tried renaming everything; dropped it.", left);
      s.user("Rename only the public API");
      s.assistant("Renamed the public API.");
      s.write(piSessions(home));
    });
    expect(userTexts(m.records(PI))).toEqual(["Set up the project", "Rename only the public API"]);
    expect(m.turns(PI).flatMap((t) => t.edited)).toEqual([]);
    expect(m.records(PI).filter((r) => r.injected === "harness").length).toBe(1);
    expect(m.unread()).toEqual([]);
  });

  test("the alarm: a type it does not list, a compaction with nothing in it, no start directory", () => {
    const m = mirror((home) => {
      const s = new PiSession();
      s.user("Start");
      s.raw({ type: "frobnicate", id: "ffff0001", parentId: null, timestamp: "2026-10-13T08:10:00.000Z" });
      const a = s.assistant("Started.");
      s.compaction("", a);
      s.write(piSessions(home));
      const t = new PiSession({ id: "9a9a9a9a-0000-4000-8000-000000000002" });
      t.lines[0] = { type: "session", version: 3, id: t.id, timestamp: "2026-10-13T08:03:09.735Z" };
      t.user("No directory");
      t.write(piSessions(home));
    });
    expect(m.unknown()).toEqual(["frobnicate session format 3"]);
    expect(m.unread().sort()).toEqual(["compaction", "start directory"]);
  });

  test("forget: the session file, and the full output of its long commands; nothing else in the temporary folder", () => {
    const tmp = tempDir();
    const kept = path.join(tmp, "pi-bash-notpi.txt");
    const full = path.join(tmp, "pi-bash-a9e6218e2211c086.log");
    writeFileSync(full, "Z0001\n");
    writeFileSync(kept, "other\n");
    let file = "";
    const m = mirror((home) => {
      const s = samplePi();
      s.bash("sh gen.sh zh", "Z0275", { truncated: true, fullOutputPath: full });
      s.bash("cat other", "other", { truncated: true, fullOutputPath: kept });
      file = s.write(piSessions(home));
    });
    const plan = pi.forgetPlan({ id: PI, env: "linux", files: [file] }, m.p);
    expect(plan.steps.map((s) => (s.kind === "remove" ? [s.path, s.what] : s.kind))).toEqual([
      [full, "the full output of a long command"],
      [file, "the session"],
    ]);
    expect(plan.gone).toEqual([file]);
  });

  test("its sessions of a folder; how it starts; what its tools did", () => {
    let file = "";
    const m = mirror((home) => (file = samplePi({ cwd: "/home/u/work/demo" }).write(piSessions(home))));
    expect(path.basename(path.dirname(file))).toBe(piFolder("/home/u/work/demo"));
    expect(piFolder("C:\\Users\\me\\app")).toBe("--C--Users-me-app--");
    const root = pi.roots(m.p)[0]!;
    expect(pi.openByFolder!.sessionsIn(root, "/home/u/work/demo")).toEqual([PI]);
    expect(pi.openByFolder!.sessionsIn(root, "/home/u/work")).toEqual([]);
    expect(pi.launch("-x first")).toEqual({ cmd: "pi", args: ["--", "-x first"] });
    expect(piProfile.tools.command("bash", { command: "ls" })).toBe("ls");
    expect(piProfile.tools.edited("write", { path: "a.md", content: "" })).toEqual(["a.md"]);
  });
});

describe("OpenCode (opencode.db, 1.19)", () => {
  test("a session of the trial run: prompts, `!` with its output, a stop, the compaction summary, the files edited", () => {
    const m = mirror((home) => {
      const db = new OpenCodeDb(openCodeDb(home));
      sampleOpenCode(db);
      db.close();
    });
    expect(m.unknown()).toEqual([]);
    expect(m.unread()).toEqual([]);
    const s = getSession(m.db, OC_ID)!;
    expect([s.agent, s.project, s.title]).toEqual(["opencode", "/work/demo", "Create notes.md with one line: hello"]);
    expect(userTexts(m.records(OC_ID))).toEqual([
      "Create notes.md with one line: hello",
      "Run the tests",
      "Change hello to hi",
      "! git status --short",
      "Wait for the build",
      "[OpenCode: the user stopped this turn]",
      "Skip the build; check the zebra config instead",
      "What does notes.md say now?",
    ]);
    const bang = m.records(OC_ID).find((r) => promptText((r.body as { content: string }).content ?? "") === "! git status --short")!;
    expect(shellOutput((bang.body as { content: string }).content)).toBe(" M notes.md");
    const turns = m.turns(OC_ID);
    expect(turns.find((t) => t.interrupted)?.n).toBe(5);
    expect(turns.flatMap((t) => t.edited)).toEqual(["notes.md", "/work/demo/notes.md"]);
    const summary = m.records(OC_ID).filter((r) => r.injected === "compact_summary");
    expect(summary.map((r) => r.role)).toEqual(["assistant"]);
    expect(groupTurns(m.records(OC_ID)).turns.find((t) => t.compactions.length)?.n).toBe(6);
  });

  test("its ids, sizes and times; a subagent's session is not a session of its own", () => {
    const m = mirror((home) => {
      const db = new OpenCodeDb(openCodeDb(home));
      sampleOpenCode(db);
      db.session({ id: "ses_eaaa00000000ChildChildChil", parent: OC, title: "Look around (@explore subagent)" }).say("look");
      db.close();
    });
    const files = openCode.listFiles(openCode.roots(m.p)[0]!);
    expect(files).toEqual([`${openCodeDb(m.home)}#${OC}`]);
    expect(openCode.sessionId(files[0]!)).toBe(OC_ID);
    const st = openCode.stat!(files[0]!);
    expect(st.size).toBeGreaterThan(3000);
    // When it last changed: its last message, not when it started.
    expect(st.mtime).toBeGreaterThan(Date.parse("2026-10-13T07:56:24.484Z") + 20_000);
  });

  test("what the user undid is left out; text OpenCode adds for the user is the harness's; its own title", () => {
    const m = mirror((home) => {
      const db = new OpenCodeDb(openCodeDb(home));
      const s = db.session({ title: "Fix the zebra parser" });
      s.say("Fix the zebra parser");
      s.harness("Called the Read tool with the following input: zebra.ts");
      s.assistant("Fixed.");
      const undone = s.say("Now delete the tests");
      s.assistant("Deleted the tests.");
      s.undoFrom(undone);
      db.close();
    });
    expect(userTexts(m.records(OC_ID))).toEqual(["Fix the zebra parser"]);
    expect(m.records(OC_ID).filter((r) => r.injected === "harness").length).toBe(1);
    expect(getSession(m.db, OC_ID)!.title).toBe("Fix the zebra parser");
  });

  test("the alarm: a part type it does not list, and a session OpenCode 2.0 wrote", () => {
    const m = mirror((home) => {
      const db = new OpenCodeDb(openCodeDb(home));
      const s = db.session();
      const said = s.say("Start");
      s.part(said, { type: "mystery", data: 1 });
      s.assistant("Started.");
      db.session({ id: "ses_ebbb00000000NextNextNextNe" });
      db.db.run("INSERT INTO session_message (id, session_id, type, seq, time_created, time_updated, data) VALUES ('m1', 'ses_ebbb00000000NextNextNextNe', 'user', 1, 0, 0, '{}')");
      db.close();
    });
    expect(m.unknown()).toEqual(["part/mystery 1.19.0"]);
    expect(m.unread()).toEqual(["session_message (OpenCode 2.0)"]);
  });

  test("its database is read where it is and never written: with OpenCode closed, SQLite makes no file next to it", () => {
    let dir = "";
    const m = mirror((home) => {
      const db = new OpenCodeDb(openCodeDb(home));
      sampleOpenCode(db);
      db.close();
      dir = path.dirname(openCodeDb(home));
    });
    expect(readdirSync(dir)).toEqual(["opencode.db"]);
    expect(m.records(OC_ID).length).toBeGreaterThan(20);
  });

  test("with OpenCode open (a write-ahead log next to it), what it has not folded in yet is read too", () => {
    const home = tempDir();
    const db = new OpenCodeDb(openCodeDb(home));
    const s = sampleOpenCode(db);
    s.say("One more thing");
    expect(existsSync(openCodeDb(home) + "-wal")).toBe(true);
    const m = mirror(() => {}, () => testPlatform(home));
    expect(userTexts(m.records(OC_ID)).at(-1)).toBe("One more thing");
    db.close();
  });

  test("forget: `opencode session delete` with its own id, after the full output it saved; its prompt history is said", () => {
    let full = "";
    const m = mirror((home) => {
      const db = new OpenCodeDb(openCodeDb(home));
      const s = sampleOpenCode(db);
      full = path.join(path.dirname(openCodeDb(home)), "tool-output", "tool_134448f4c001k2Vvrmng3vBEt0");
      mkdirSync(path.dirname(full), { recursive: true });
      writeFileSync(full, "Z0001\n");
      s.tool("bash", { command: "sh gen.sh zh" }, "...output truncated...", { metadata: { outputPath: full, truncated: true } });
      db.close();
    });
    const bin = path.join(m.home, "bin");
    mkdirSync(bin);
    writeFileSync(path.join(bin, "opencode"), '#!/bin/sh\n[ "$3" = "--help" ] && echo "delete a session"\nexit 0\n', { mode: 0o755 });
    const p = { ...m.p, vars: { PATH: bin } };
    const file = `${openCodeDb(m.home)}#${OC}`;
    const plan = openCode.forgetPlan({ id: OC_ID, env: "linux", files: [file] }, p);
    expect(plan.blocked).toBeUndefined();
    expect(plan.steps.map((s) => (s.kind === "remove" ? s.path : s.cmd.slice(1).join(" ")))).toEqual([full, `session delete ${OC}`]);
    expect(plan.notes).toEqual(["OpenCode keeps what you typed in its own prompt history (~/.local/state/opencode/prompt-history.jsonl)."]);
    // Its state folder moved: the history is there.
    const moved = openCode.forgetPlan({ id: OC_ID, env: "linux", files: [file] }, { ...p, vars: { PATH: bin, XDG_STATE_HOME: "/data/state" } });
    expect(moved.notes).toEqual(["OpenCode keeps what you typed in its own prompt history (/data/state/opencode/prompt-history.jsonl)."]);
    // Without opencode here it says where to delete it instead.
    expect(openCode.forgetPlan({ id: OC_ID, env: "linux", files: [file] }, { ...m.p, vars: { PATH: "/nonexistent" } }).blocked).toStartWith("`opencode` is not available here; delete it in OpenCode");
  });

  test("its sessions of a folder; how it starts; what its tools did", () => {
    const m = mirror((home) => {
      const db = new OpenCodeDb(openCodeDb(home));
      sampleOpenCode(db, { directory: "/home/u/work/demo" });
      db.close();
    });
    const root = openCode.roots(m.p)[0]!;
    expect(openCode.openByFolder!.sessionsIn(root, "/home/u/work/demo")).toEqual([OC_ID]);
    expect(openCode.launch("first")).toEqual({ cmd: "opencode", args: ["--prompt", "first"] });
    expect(openCodeProfile.tools.edited("apply_patch", { patchText: "*** Begin Patch\n*** Update File: src/a.ts\n@@\n*** End Patch" })).toEqual(["src/a.ts"]);
    expect(openCodeProfile.tools.command("bash", { command: "ls" })).toBe("ls");
  });
});

describe("both", () => {
  test("which agent runs meme, from the variables they set; started inside another, theirs win", () => {
    expect(runningAgent({ OPENCODE: "1", AGENT: "1" })?.agent).toBe("opencode");
    expect(runningAgent({ PI_CODING_AGENT: "true" })?.agent).toBe("pi");
    expect(runningAgent({ PI_SESSION_ID: "x", CLAUDECODE: "1" })?.agent).toBe("pi");
    expect(runningAgent({ OPENCODE: "1", CLAUDECODE: "1" })?.agent).toBe("opencode");
  });

  test("a handoff stays within their limits, lines too: they keep the end of a long output and would drop its start", () => {
    const m = mirror((home) => {
      const s = new PiSession();
      for (let i = 0; i < 4; i++) {
        s.user(Array.from({ length: 900 }, (_, j) => `line ${j}`).join("\n"));
        s.assistant("ok");
      }
      s.write(piSessions(home));
    });
    for (const limits of [limitsIn(piProfile), limitsIn(openCodeProfile), limitsIn(null)]) {
      const text = m.handoff(PI, limits).text;
      expect(within(measure(text), limits)).toBe(true);
      expect(measure(text).lines).toBeLessThanOrEqual(1_800);
      expect(text).toStartWith("# Handoff: ");
    }
  });

  test("a session may be open where its agent runs: from the folder of each process, also in WSL seen from Windows", () => {
    const distro = tempDir();
    const proc = (pid: number, cmdline: string, pwd: string) => {
      const dir = path.join(distro, "proc", String(pid));
      mkdirSync(dir, { recursive: true });
      writeFileSync(path.join(dir, "cmdline"), cmdline);
      writeFileSync(path.join(dir, "stat"), `${pid} (x) S ${"0 ".repeat(18)}777 0 0\n`);
      writeFileSync(path.join(dir, "environ"), `HOME=/home/u\0PWD=${pwd}\0`);
    };
    proc(4242, "pi\0", "/home/u/work/demo");
    proc(4343, "opencode\0--prompt\0hi\0", "/home/u/work/demo");
    proc(4444, "vim\0notes.md\0", "/home/u/work/other");
    const linux = (p: string) => path.join(distro, ...p.split("/").filter(Boolean));
    samplePi({ cwd: "/home/u/work/demo" }).write(linux("/home/u/.pi/agent/sessions"));
    new PiSession({ id: "9a9a9a9a-0000-4000-8000-000000000003", cwd: "/home/u/work/other" }).write(linux("/home/u/.pi/agent/sessions"));
    resetOpenCodeIds();
    const db = new OpenCodeDb(linux("/home/u/.local/share/opencode/opencode.db"));
    sampleOpenCode(db, { directory: "/home/u/work/demo" });
    db.close();
    const home = tempDir();
    const p: Platform = { env: "win", home, dataDir: path.join(home, ".meme"), windowsUsersDir: null, wsl: [{ distro: "Ubuntu", root: distro, home: "/home/u" }], vars: {} };
    const check = openCheck(p);
    expect(check.open.get(PI)).toEqual({ agent: "pi", pid: 4242, where: "WSL: Ubuntu", maybe: true });
    expect(check.open.get(OC_ID)).toEqual({ agent: "opencode", pid: 4343, where: "WSL: Ubuntu", maybe: true });
    // In none of the folders they run in, and every folder is known: closed (plan §6 ⑩.1).
    const other = "9a9a9a9a-0000-4000-8000-000000000003";
    const files = [linux("/home/u/.pi/agent/sessions/x.jsonl")];
    expect(check.open.has(other)).toBe(false);
    expect(check.stateOf(other, files)).toBe("closed");
    // A process of Pi whose folder meme cannot see: it cannot tell.
    proc(4545, "pi\0", "");
    writeFileSync(path.join(distro, "proc", "4545", "environ"), "HOME=/home/u\0");
    expect(openCheck(p).stateOf(other, files)).toBe("unknown");
    // No process of Pi at all: closed.
    for (const pid of [4242, 4545]) rmSync(path.join(distro, "proc", String(pid)), { recursive: true });
    expect(openCheck(p).stateOf(PI, files)).toBe("closed");
  });
});
