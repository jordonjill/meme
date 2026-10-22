/**
 * Plan §6 ⑩ end to end: OpenCode and Pi sessions in the list, shown, searched,
 * handed over from and pushed into, and deleted, through the command line.
 */
import { describe, expect, test } from "bun:test";
import { chmodSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { ClaudeSession } from "../fixtures/gen-claude";
import { OpenCodeDb, resetOpenCodeIds, sampleOpenCode } from "../fixtures/gen-opencode";
import { samplePi } from "../fixtures/gen-pi";
import { run, world, type World } from "./world";

const PI = "9a9a9a9a";
const OC = "ecbbcc1d";
const MINIMAL_PATH = "/usr/bin:/bin";

/** The world, with a Pi and an OpenCode session that started in ~/work/demo. */
function withBoth() {
  const w = world();
  resetOpenCodeIds();
  const demo = path.join(w.home, "work", "demo");
  mkdirSync(demo, { recursive: true });
  const piFile = samplePi({ cwd: demo }).write(path.join(w.home, ".pi", "agent", "sessions"));
  const db = new OpenCodeDb(path.join(w.home, ".local", "share", "opencode", "opencode.db"));
  sampleOpenCode(db, { directory: demo });
  db.close();
  return { w, demo, piFile };
}

/** A fake agent command that records where it started and its arguments; `extra` runs first. */
function fakeAgent(w: World, name: string, extra = "") {
  const bin = path.join(w.home, "fake-bin");
  mkdirSync(bin, { recursive: true });
  const record = path.join(w.home, `${name}-was-called`);
  writeFileSync(path.join(bin, name), `#!/bin/sh\n${extra}\npwd > "${record}.cwd"\nfor a in "$@"; do printf '%s\\n' "$a"; done > "${record}.args"\nexit 7\n`);
  chmodSync(path.join(bin, name), 0o755);
  const read = (ext: string) => readFileSync(`${record}.${ext}`, "utf8");
  return { bin, cwd: () => read("cwd").trim(), args: () => read("args").trimEnd().split("\n"), called: () => existsSync(`${record}.args`) };
}

describe("OpenCode and Pi through the command line (plan §6 ⑩)", () => {
  test("ls lists them with their labels; status names their sources", () => {
    const { w } = withBoth();
    const ls = run(w, ["ls", "-a"]).out;
    expect(ls).toMatch(new RegExp(`  ${PI}  Pi·WSL +\\S.* ~/work/demo +Create notes.md with one line: hello\\n`));
    expect(ls).toMatch(new RegExp(`  ${OC}  OpenCode·WSL +\\S.* ~/work/demo +Create notes.md with one line: hello\\n`));
    expect(run(w, ["ls", "-a", "--agent", "pi"]).out).not.toContain("OpenCode");
    const status = run(w, ["status"]).out;
    expect(status).toMatch(/ {2}OpenCode·WSL +~\/\.local\/share\/opencode\/opencode\.db +readable +1 session\n/);
    expect(status).toMatch(/ {2}Pi·WSL +~\/\.pi\/agent\/sessions +readable +1 session\n/);
    expect(status).toContain("Record types: all known and read\n");
  });

  test("show reads `!`, the stop and the compaction; search finds both", () => {
    const { w } = withBoth();
    for (const id of [PI, OC]) {
      const show = run(w, ["show", id]).out;
      expect(show).toContain("❯ ! git status --short");
      expect(show).toContain("interrupted");
    }
    expect(run(w, ["show", PI]).out).toContain("── compacted here ──");
    expect(run(w, ["show", OC]).out).toContain("── compacted here ──");
    const found = run(w, ["search", "zebra"]).out;
    expect(found).toContain("Pi·WSL");
    expect(found).toContain("OpenCode·WSL");
  });

  test("a handoff printed inside them: their sessions, and each agent's limits", () => {
    const { w } = withBoth();
    const inOpenCode = run(w, ["continue", PI], { env: { OPENCODE: "1" } }).out;
    expect(inOpenCode).toStartWith("# Handoff: Create notes.md with one line: hello\nSource: Pi·WSL · session 9a9a9a9a");
    expect(inOpenCode).toContain("## Summary written by the source agent (Pi compacted its context");
    const inPi = run(w, ["continue", OC], { env: { PI_CODING_AGENT: "true" } }).out;
    expect(inPi).toStartWith("# Handoff: Create notes.md with one line: hello\nSource: OpenCode·WSL · session ecbbcc1d");
    expect(inPi).toContain("! git status --short");
  });

  test("pushed into Pi: started in the session's folder, the message after `--`", () => {
    const { w, demo } = withBoth();
    const agent = fakeAgent(w, "pi");
    const r = run(w, ["continue", OC, "--in", "pi"], { env: { PATH: `${agent.bin}:${MINIMAL_PATH}`, MEME_TERMINAL: "1" } });
    expect(r.code).toBe(7);
    expect(r.out).toBe("Continuing ecbbcc1d (Create notes.md with one line: hello) in Pi, in ~/work/demo\n");
    expect(agent.cwd()).toBe(demo);
    expect(agent.args()).toEqual(["--", "Continue an earlier session: run `meme continue ecbbcc1d` exactly as written, with no pipe or other command around it, and follow the instructions at the top of its output."]);
  });

  test("pushed into OpenCode: the message as its --prompt", () => {
    const { w, demo } = withBoth();
    const agent = fakeAgent(w, "opencode");
    const r = run(w, ["continue", PI, "--in", "opencode"], { env: { PATH: `${agent.bin}:${MINIMAL_PATH}`, MEME_TERMINAL: "1" } });
    expect(r.code).toBe(7);
    expect(agent.cwd()).toBe(demo);
    expect(agent.args()).toEqual(["--prompt", "Continue an earlier session: run `meme continue 9a9a9a9a` exactly as written, with no pipe or other command around it, and follow the instructions at the top of its output."]);
  });

  test("forget deletes a Pi session's file itself, and an OpenCode session with `opencode session delete`", () => {
    const { w, piFile } = withBoth();
    const pi = run(w, ["forget", PI, "--yes"]);
    expect(pi.out).toContain("the session");
    expect(pi.out).toContain(`✓ ${PI} deleted`);
    expect(existsSync(piFile)).toBe(false);
    expect(run(w, ["ls", "-a"]).out).not.toContain("Pi·WSL");

    const opencode = fakeAgent(w, "opencode", '[ "$3" = "--help" ] && { echo "delete a session"; exit 0; }');
    const r = run(w, ["forget", OC, "--yes"], { env: { PATH: `${opencode.bin}:${MINIMAL_PATH}` } });
    // The fake one records the command and fails, as a missing session would: nothing of meme's goes.
    expect(opencode.args()).toEqual(["session", "delete", "ses_ecbbcc1dcffeAbCdEfGhIjKlMn"]);
    expect(r.out).toContain("runs: opencode session delete ses_ecbbcc1dcffeAbCdEfGhIjKlMn");
    expect(r.out).toContain("OpenCode keeps what you typed in its own prompt history (~/.local/state/opencode/prompt-history.jsonl).");
    expect(r.out).toContain(`✗ ${OC}: \`session delete ses_ecbbcc1dcffeAbCdEfGhIjKlMn\` failed`);
    expect(run(w, ["ls", "-a"]).out).toContain("OpenCode·WSL");
  });

  test("from Windows: their sessions in a running WSL distribution; OpenCode's database is read from a copy, and nothing is written next to it", () => {
    const w = world();
    resetOpenCodeIds();
    const ubuntu = path.join(w.home, "wsl", "Ubuntu");
    const linux = (p: string) => path.join(ubuntu, ...p.split("/").filter(Boolean));
    samplePi({ cwd: "/home/u/work/app" }).write(linux("/home/u/.pi/agent/sessions"));
    const db = new OpenCodeDb(linux("/home/u/.local/share/opencode/opencode.db"));
    sampleOpenCode(db, { directory: "/home/u/work/app" });
    db.close();
    const tmp = path.join(w.home, "tmp");
    mkdirSync(tmp);
    const env = { MEME_ENV: "win", MEME_WSL_DIR: path.join(w.home, "wsl"), MEME_WSL_RUNNING: "Ubuntu", TMPDIR: tmp };
    const ls = run(w, ["ls", "-a"], { env }).out;
    expect(ls).toMatch(new RegExp(`  ${PI}  Pi·WSL +.* /home/u/work/app `));
    expect(ls).toMatch(new RegExp(`  ${OC}  OpenCode·WSL +.* /home/u/work/app `));
    expect(readdirSync(linux("/home/u/.local/share/opencode"))).toEqual(["opencode.db"]);
    // The copy is in meme's own folder, which `meme uninstall` removes; none in the temporary folder (plan §6 ⑩.1).
    expect(readdirSync(tmp)).toEqual([]);
    const cache = path.join(w.home, ".meme", "cache", "opencode");
    const copies = readdirSync(cache);
    expect(copies.length).toBe(1);
    // The next run uses the copy again: the database did not change.
    const copy = path.join(cache, copies[0]!, "opencode.db");
    const before = statSync(copy).mtimeMs;
    expect(run(w, ["show", OC], { env }).out).toContain("❯ ! git status --short");
    expect(statSync(copy).mtimeMs).toBe(before);
  });
});

describe("step 11 (plan §6 ⑪)", () => {
  test("F4: OpenCode sessions started in the same millisecond: a short id past 12 characters is named like any other", () => {
    const w = world();
    resetOpenCodeIds();
    const demo = path.join(w.home, "work", "demo");
    mkdirSync(demo, { recursive: true });
    const db = new OpenCodeDb(path.join(w.home, ".local", "share", "opencode", "opencode.db"));
    for (const [id, text] of [["ses_ecbbcc1dcffeZpypkWJpAl7rdU", "first"], ["ses_ecbbcc1dcffeAbCdEfGhIjKlMn", "second"]] as const) {
      const s = db.session({ id, directory: demo, start: "2026-10-01T00:00:00.000Z" });
      s.say(`say ${text}`);
      s.assistant(`ok ${text}`);
    }
    db.close();
    expect(run(w, ["ls", "-a"]).out).toMatch(/ ecbbcc1dcffez +OpenCode·WSL .*say first/);
    expect(run(w, ["show", "ecbbcc1dcffez"]).out).toContain("❯ say first");
    const handoff = run(w, ["continue", "ecbbcc1dcffez"]);
    expect(handoff.code).toBe(0);
    expect(handoff.out).toContain("session ecbbcc1dcffez ·");
    // Pulled into a Claude Code session, the handoff is known again as this session's.
    const c = new ClaudeSession({ id: "c1c1c1c1-0000-4000-8000-000000000001", cwd: demo, start: "2026-10-02T00:00:00.000Z" });
    c.bash("meme continue ecbbcc1dcffez", handoff.out);
    c.user("go on");
    c.assistant("ok");
    c.write(path.join(w.home, ".claude", "projects"));
    expect(run(w, ["continue", "c1c1c1c1"]).out).toContain("## Earlier session ecbbcc1dcffez (handed over into this one)");
    const fake = fakeAgent(w, "opencode", '[ "$3" = "--help" ] && { echo "delete a session"; exit 0; }');
    const gone = run(w, ["forget", "ecbbcc1dcffez", "--yes"], { env: { PATH: `${fake.bin}:${MINIMAL_PATH}` } });
    expect(gone.err).not.toContain("forget takes session ids");
  });
});

describe("step 11 (plan §6 ⑪): OpenCode's delete command", () => {
  const opencode = (w: World, deleting: string) => {
    const seen = path.join(w.home, "opencode-env");
    const { bin } = fakeAgent(w, "opencode", `printf '%s\\n' "$OPENCODE_DISABLE_AUTOUPDATE" >> "${seen}"\n[ "$3" = "--help" ] && { echo "delete a session"; exit 0; }\n${deleting}`);
    return { bin, seen };
  };

  test("F12: one that does not finish is stopped, and the session kept", () => {
    const { w } = withBoth();
    const { bin } = opencode(w, "sleep 10; exit 0");
    const r = run(w, ["forget", OC, "--yes"], { env: { PATH: `${bin}:${MINIMAL_PATH}`, MEME_DELETE_TIMEOUT_MS: "1000" } });
    expect(r.code).toBe(1);
    expect(r.out).toContain(`✗ ${OC}: \`session delete ses_ecbbcc1dcffeAbCdEfGhIjKlMn\` did not finish within 1 second. meme's copy is kept.`);
    expect(run(w, ["ls", "-a"]).out).toContain(OC);
  });

  test("F5: when it fails after the full outputs went, it says they did", () => {
    const w = world();
    resetOpenCodeIds();
    const data = path.join(w.home, ".local", "share", "opencode");
    const db = new OpenCodeDb(path.join(data, "opencode.db"));
    const s = db.session({ id: "ses_ecbbcc1dcffeAbCdEfGhIjKlMn", directory: path.join(w.home, "work", "demo"), start: "2026-10-01T00:00:00.000Z" });
    s.say("build it");
    const out = path.join(data, "tool-output", "tool_abc123");
    mkdirSync(path.dirname(out), { recursive: true });
    writeFileSync(out, "very long output\n");
    s.tool("bash", { command: "make" }, "...output truncated...", { metadata: { output: "x", exit: 0, outputPath: out } });
    s.assistant("done");
    db.close();
    const { bin } = opencode(w, 'echo "database is locked" >&2; exit 1');
    const r = run(w, ["forget", OC, "--yes"], { env: { PATH: `${bin}:${MINIMAL_PATH}` } });
    expect(r.out).toContain(`✗ ${OC}: \`session delete ses_ecbbcc1dcffeAbCdEfGhIjKlMn\` failed: database is locked. Already deleted: the full output of a long command. meme's copy is kept.`);
  });

  test("F23: it runs with OpenCode's updates turned off, as the check before it does", () => {
    const { w } = withBoth();
    const { bin, seen } = opencode(w, "exit 0");
    expect(run(w, ["forget", OC, "--yes"], { env: { PATH: `${bin}:${MINIMAL_PATH}` } }).out).toContain(`✓ ${OC} deleted`);
    expect(readFileSync(seen, "utf8")).toBe("1\n1\n");
  });
});
