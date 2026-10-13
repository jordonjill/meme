/**
 * Synthetic OpenCode sessions in its native database (opencode.db, OpenCode 1.19),
 * with the tables and the JSON of its rows shaped like the trial sessions of plan
 * §6 ⑩. Only made-up content: real sessions never go into the repository.
 */
import { Database } from "bun:sqlite";
import { mkdirSync } from "node:fs";
import path from "node:path";

type Obj = Record<string, unknown>;

/** The tables meme reads, as OpenCode 1.19 creates them (and 2.0's `session_message`). */
const SCHEMA = `
CREATE TABLE project (id text PRIMARY KEY, worktree text NOT NULL, vcs text, name text, icon_url text, icon_url_override text, icon_color text,
  time_created integer NOT NULL, time_updated integer NOT NULL, time_initialized integer, sandboxes text NOT NULL, commands text);
CREATE TABLE session (id text PRIMARY KEY, project_id text NOT NULL, workspace_id text, parent_id text, slug text NOT NULL, directory text NOT NULL,
  path text, title text NOT NULL, version text NOT NULL, share_url text, summary_additions integer, summary_deletions integer, summary_files integer,
  summary_diffs text, metadata text, cost real DEFAULT 0 NOT NULL, tokens_input integer DEFAULT 0 NOT NULL, tokens_output integer DEFAULT 0 NOT NULL,
  tokens_reasoning integer DEFAULT 0 NOT NULL, tokens_cache_read integer DEFAULT 0 NOT NULL, tokens_cache_write integer DEFAULT 0 NOT NULL,
  revert text, permission text, agent text, model text, time_created integer NOT NULL, time_updated integer NOT NULL, time_compacting integer, time_archived integer,
  CONSTRAINT fk_session_project_id_project_id_fk FOREIGN KEY (project_id) REFERENCES project(id) ON DELETE CASCADE);
CREATE TABLE message (id text PRIMARY KEY, session_id text NOT NULL, time_created integer NOT NULL, time_updated integer NOT NULL, data text NOT NULL,
  CONSTRAINT fk_message_session_id_session_id_fk FOREIGN KEY (session_id) REFERENCES session(id) ON DELETE CASCADE);
CREATE TABLE part (id text PRIMARY KEY, message_id text NOT NULL, session_id text NOT NULL, time_created integer NOT NULL, time_updated integer NOT NULL, data text NOT NULL,
  CONSTRAINT fk_part_message_id_message_id_fk FOREIGN KEY (message_id) REFERENCES message(id) ON DELETE CASCADE);
CREATE INDEX part_session_idx ON part (session_id);
CREATE INDEX message_session_time_created_id_idx ON message (session_id, time_created, id);
CREATE TABLE session_message (id text PRIMARY KEY, session_id text NOT NULL, type text NOT NULL, seq integer NOT NULL, time_created integer NOT NULL, time_updated integer NOT NULL, data text NOT NULL);
`;

export const SHELL_MARK = "The following tool was executed by the user";

let counter = 0;
/** Ids that sort in the order they were made, as OpenCode's messages and parts do. */
const nextId = (prefix: string) => `${prefix}_${(++counter).toString(16).padStart(12, "0")}TestTestTest00`;

export interface OpenCodeOptions {
  /** OpenCode's own id, `ses_` and 26 more; meme's is this without `ses_`, in lower case. */
  id?: string;
  directory?: string;
  title?: string;
  parent?: string;
  start?: string;
}

export class OpenCodeDb {
  readonly db: Database;

  constructor(readonly file: string) {
    mkdirSync(path.dirname(file), { recursive: true });
    this.db = new Database(file, { create: true });
    this.db.exec("PRAGMA journal_mode = WAL;");
    this.db.exec(SCHEMA);
    this.db.run("INSERT INTO project (id, worktree, time_created, time_updated, sandboxes) VALUES ('global', '/', 0, 0, '[]')");
  }

  session(o: OpenCodeOptions = {}): OpenCodeSession {
    return new OpenCodeSession(this, o);
  }

  /** Close it, as OpenCode does when it quits: the write-ahead log is folded in and removed. */
  close(): void {
    this.db.exec("PRAGMA wal_checkpoint(TRUNCATE);");
    this.db.close();
  }
}

export class OpenCodeSession {
  readonly id: string;
  readonly directory: string;
  private clock: number;

  constructor(
    private readonly o: OpenCodeDb,
    opts: OpenCodeOptions,
  ) {
    this.id = opts.id ?? "ses_ecbbcc1dcffeAbCdEfGhIjKlMn";
    this.directory = opts.directory ?? "/work/demo";
    this.clock = Date.parse(opts.start ?? "2026-10-13T07:56:24.484Z");
    this.o.db.run(
      "INSERT INTO session (id, project_id, parent_id, slug, directory, path, title, version, agent, model, time_created, time_updated) VALUES (?, 'global', ?, 'curious-orchid', ?, ?, ?, '1.19.0', 'build', ?, ?, ?)",
      [this.id, opts.parent ?? null, this.directory, this.directory.replace(/^\//, ""), opts.title ?? `New session - ${new Date(this.clock).toISOString()}`, JSON.stringify({ id: "gpt-5.6-sol", providerID: "openai" }), this.clock, this.clock],
    );
  }

  private tick(): number {
    this.clock += 1000;
    this.o.db.run("UPDATE session SET time_updated = ? WHERE id = ?", [this.clock, this.id]);
    return this.clock;
  }

  private message(data: Obj, parts: Obj[]): string {
    const id = nextId("msg");
    const t = this.tick();
    this.o.db.run("INSERT INTO message (id, session_id, time_created, time_updated, data) VALUES (?, ?, ?, ?, ?)", [id, this.id, t, t, JSON.stringify({ ...data, time: { created: t, completed: t + 500 } })]);
    for (const p of parts) this.o.db.run("INSERT INTO part (id, message_id, session_id, time_created, time_updated, data) VALUES (?, ?, ?, ?, ?, ?)", [nextId("prt"), id, this.id, t, t, JSON.stringify(p)]);
    return id;
  }

  private user(parts: Obj[]): string {
    return this.message({ role: "user", agent: "build", model: { providerID: "openai", modelID: "gpt-5.6-sol" }, summary: { diffs: [] } }, parts);
  }

  private reply(parts: Obj[], extra: Obj = {}): string {
    return this.message(
      {
        parentID: "msg_parent",
        role: "assistant",
        mode: "build",
        agent: "build",
        path: { cwd: this.directory, root: "/" },
        cost: 0.05,
        tokens: { total: 13768, input: 13694, output: 74, reasoning: 0, cache: { write: 0, read: 0 } },
        modelID: "gpt-5.6-sol",
        providerID: "openai",
        ...extra,
      },
      parts,
    );
  }

  say(text: string): string {
    return this.user([{ type: "text", text }]);
  }

  /** Text OpenCode adds for the user (an attached file read for them). */
  harness(text: string): string {
    return this.user([{ type: "text", text, synthetic: true }]);
  }

  assistant(text: string, reasoning?: string): string {
    return this.reply(
      [{ type: "step-start" }, ...(reasoning ? [{ type: "reasoning", text: reasoning, time: { start: this.clock, end: this.clock + 1 } }] : []), { type: "text", text }, { type: "step-finish", reason: "stop", tokens: {}, cost: 0 }],
      { finish: "stop" },
    );
  }

  tool(tool: string, input: Obj, output: string, o: { status?: string; metadata?: Obj } = {}): string {
    const state = o.status === "error" ? { status: "error", input, error: output, metadata: o.metadata ?? {} } : { status: "completed", input, output, metadata: o.metadata ?? {}, title: tool };
    return this.reply([{ type: "step-start" }, { type: "tool", tool, callID: `call_${counter + 1}`, state: { ...state, time: { start: this.clock, end: this.clock + 1 } } }, { type: "step-finish", reason: "tool-calls" }], { finish: "tool-calls" });
  }

  /** A `!` command: OpenCode's marker message, then a bash call made for the user. */
  bang(command: string, output: string): string {
    const marker = this.user([{ type: "text", text: SHELL_MARK, synthetic: true }]);
    this.message(
      { parentID: marker, role: "assistant", mode: "build", agent: "build", path: { cwd: this.directory, root: "/" }, cost: 0, tokens: {}, modelID: "gpt-5.6-sol", providerID: "openai" },
      [{ type: "tool", tool: "bash", callID: `call_${counter + 1}`, state: { status: "completed", input: { command }, output, metadata: { output }, title: command, time: { start: this.clock, end: this.clock } } }],
    );
    return marker;
  }

  /** The user pressed Esc twice while a command ran. */
  stopped(command: string): string {
    return this.reply(
      [{ type: "step-start" }, { type: "tool", tool: "bash", callID: `call_${counter + 1}`, state: { status: "completed", input: { command }, output: "(no output)\n\n<shell_metadata>\nUser aborted the command\n</shell_metadata>", metadata: {}, time: { start: this.clock, end: this.clock } } }],
      { error: { name: "MessageAbortedError", data: { message: "Aborted" } } },
    );
  }

  /** `/compact`: a user message with a compaction part, then the summary. */
  compact(summary: string, tailStart: string): string {
    this.user([{ type: "compaction", auto: false, tail_start_id: tailStart }]);
    return this.reply([{ type: "step-start" }, { type: "text", text: summary }, { type: "step-finish", reason: "stop" }], { mode: "compaction", agent: "compaction", summary: true, finish: "stop" });
  }

  /** `/undo` back to this message: it and what follows are undone. */
  undoFrom(messageId: string): void {
    this.o.db.run("UPDATE session SET revert = ? WHERE id = ?", [JSON.stringify({ messageID: messageId }), this.id]);
  }

  part(messageId: string, part: Obj): void {
    this.o.db.run("INSERT INTO part (id, message_id, session_id, time_created, time_updated, data) VALUES (?, ?, ?, ?, ?, ?)", [nextId("prt"), messageId, this.id, this.clock, this.clock, JSON.stringify(part)]);
  }
}

export function resetOpenCodeIds(): void {
  counter = 0;
}

/** The trial run of plan §6 ⑩ in small: a file made, a command, an edit, `!`, a stop, a compaction. */
export function sampleOpenCode(db: OpenCodeDb, o: OpenCodeOptions = {}): OpenCodeSession {
  const s = db.session(o);
  s.say("Create notes.md with one line: hello");
  s.tool("apply_patch", { patchText: "*** Begin Patch\n*** Add File: notes.md\n+hello\n*** End Patch" }, "Success. Updated the following files:\nA notes.md");
  s.assistant("Created notes.md.", "**Writing the file**");
  s.say("Run the tests");
  s.tool("bash", { command: "bun test", timeout: 120000 }, "3 pass\n0 fail\n", { metadata: { output: "3 pass\n0 fail\n", exit: 0 } });
  s.assistant("All 3 tests pass.");
  s.say("Change hello to hi");
  s.tool("edit", { filePath: path.join(s.directory, "notes.md"), oldString: "hello", newString: "hi" }, "Edit applied successfully.");
  const tail = s.assistant("Changed it.");
  s.bang("git status --short", " M notes.md\n");
  s.say("Wait for the build");
  s.stopped("sleep 60 && make");
  s.say("Skip the build; check the zebra config instead");
  s.tool("read", { filePath: path.join(s.directory, "zebra.toml") }, "<content>\nstripes = 12\n</content>");
  s.assistant("The zebra config has 12 stripes.");
  s.compact("## Objective\n- Keep notes.md and check the zebra config.\n## Done\n- notes.md says hi.", tail);
  s.say("What does notes.md say now?");
  s.tool("read", { filePath: path.join(s.directory, "notes.md") }, "<content>\nhi\n</content>");
  s.assistant("It says hi.");
  return s;
}
