/**
 * Synthetic Codex rollout files in the 0.161/0.162 format (sessions.md §7.1):
 * `session_meta`, messages, the `exec` code-mode tool, `!` shell commands,
 * forks and rollbacks with `history_base`. Only made-up content.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { zstdCompressSync } from "node:zlib";
import { fakeUuid } from "./gen-claude";

type Line = Record<string, unknown>;

export interface CodexOptions {
  id?: string;
  cwd?: string;
  branch?: string;
  start?: string;
  /** Fork of this session, taking its lines before line index `cutLine`. */
  forkOf?: { parent: CodexSession; cutLine: number };
  /** A rollback's later file of `same`: the session goes on from `cutLine` of that file. */
  rollbackOf?: { file: CodexSession; cutLine: number };
}

let calls = 0;

export class CodexSession {
  readonly id: string;
  /** The second id in a rollback file's name. */
  readonly tag: string | null;
  readonly cwd: string;
  readonly lines: Line[] = [];
  private clock: number;
  private readonly startIso: string;

  constructor(o: CodexOptions = {}) {
    this.id = o.rollbackOf?.file.id ?? o.id ?? fakeUuid("c0de");
    this.tag = o.rollbackOf ? fakeUuid("f11e") : null;
    this.cwd = o.cwd ?? "/work/codex-demo";
    this.clock = Date.parse(o.start ?? "2026-10-10T06:51:44.000Z");
    this.startIso = new Date(this.clock).toISOString();
    const meta: Line = {
      session_id: this.id,
      id: this.id,
      timestamp: this.startIso,
      cwd: this.cwd,
      originator: "codex_exec",
      cli_version: "0.162.0",
      source: "exec",
      thread_source: "user",
      model_provider: "custom",
      history_mode: "paginated",
      git: { branch: o.branch ?? "master", commit_hash: "0".repeat(40) },
    };
    if (o.forkOf) {
      meta.forked_from_id = o.forkOf.parent.id;
      meta.forked_from_ordinal_exclusive = o.forkOf.cutLine;
      meta.history_base = { thread_id: o.forkOf.parent.id, end_ordinal_exclusive: o.forkOf.cutLine, end_byte_offset: o.forkOf.parent.bytesBefore(o.forkOf.cutLine) };
    }
    if (o.rollbackOf) {
      meta.history_base = { thread_id: this.id, end_ordinal_exclusive: o.rollbackOf.cutLine, end_byte_offset: o.rollbackOf.file.bytesBefore(o.rollbackOf.cutLine) };
    }
    this.push("session_meta", meta);
  }

  private push(type: string, payload: Line): number {
    this.lines.push({ timestamp: new Date(this.clock).toISOString(), type, payload, ordinal: this.lines.length });
    this.clock += 1000;
    return this.lines.length - 1;
  }

  private message(role: string, text: string, phase?: string): number {
    return this.push("response_item", { type: "message", role, content: [{ type: role === "assistant" ? "output_text" : "input_text", text }], ...(phase ? { phase } : {}) });
  }

  /** A user turn: task_started, the message; returns the line index the turn starts at. */
  user(text: string): number {
    const at = this.push("event_msg", { type: "task_started", turn_id: fakeUuid() });
    this.message("user", text);
    return at;
  }

  developer(text: string): void {
    this.message("developer", text);
  }

  environment(): void {
    this.message("user", `<environment_context>\n  <cwd>${this.cwd}</cwd>\n  <shell>bash</shell>\n</environment_context>`);
  }

  assistant(text: string): void {
    this.message("assistant", text, "final_answer");
    this.push("event_msg", { type: "task_complete", turn_id: fakeUuid(), last_agent_message: text });
  }

  /** A note before a step ("I will check…"), which Codex marks `commentary`. */
  commentary(text: string): void {
    this.message("assistant", text, "commentary");
  }

  /**
   * `/compact` as Codex 0.161 writes it (handoff.md §7.8): a turn with no user
   * message; the summary as an ordinary AI message, then a `compacted` item with
   * the summary behind Codex's prefix and the history it kept. A server-side
   * compaction is encrypted: no AI message, an empty `message`.
   */
  compact(summary: string, o: { encrypted?: boolean } = {}): void {
    this.push("event_msg", { type: "task_started", turn_id: fakeUuid() });
    if (!o.encrypted) this.message("assistant", summary, "final_answer");
    const prefix =
      "Another language model started to solve this problem and produced a summary of its thinking process. You also have access to the state of the tools that were used by that language model. Use this to build on the work that has already been done and avoid duplicating work. Here is the summary produced by the other language model, use the information in this summary to assist with your own analysis:\n";
    const kept = this.lines.filter((l) => l.type === "response_item" && (l.payload as Line).type === "message" && (l.payload as Line).role === "user").map((l) => l.payload);
    this.push("compacted", {
      message: o.encrypted ? "" : prefix + summary,
      replacement_history: [...kept, o.encrypted ? { type: "compaction", encrypted_content: "gAAAA" + "x".repeat(40) } : { type: "message", role: "user", content: [{ type: "input_text", text: prefix + summary }] }],
      window_number: 1,
    });
    this.push("event_msg", { type: "item_completed", item: { type: "ContextCompaction", id: fakeUuid() } });
    this.push("event_msg", { type: "task_complete", turn_id: fakeUuid(), last_agent_message: null });
  }

  /** The `exec` code-mode tool with a script, then its output. */
  exec(script: string, output: string, header = "Script completed\nWall time 0.1 seconds\nOutput:\n"): void {
    const callId = `call_${++calls}`;
    this.push("response_item", { type: "custom_tool_call", status: "completed", call_id: callId, name: "exec", input: script });
    this.push("response_item", { type: "custom_tool_call_output", call_id: callId, output: [{ type: "input_text", text: header }, { type: "input_text", text: output }] });
  }

  command(cmd: string, output: string): void {
    this.exec(`const r = await tools.exec_command(${JSON.stringify({ cmd, shell: "bash", max_output_tokens: 2000 })}); text(r.output);\n`, output);
  }

  patch(changes: { add?: string; update?: string }[]): void {
    const body = changes.map((c) => (c.add ? `*** Add File: ${c.add}\n+x\n` : `*** Update File: ${c.update}\n@@\n-a\n+b\n`)).join("");
    this.exec(`const patch = ${JSON.stringify(`*** Begin Patch\n${body}*** End Patch\n`)};\nawait tools.apply_patch(patch);\n`, "{}");
  }

  /** A `!` command typed in the Codex UI: recorded with its output, no model turn. */
  shell(cmd: string, output: string): void {
    this.push("event_msg", { type: "task_started", turn_id: fakeUuid() });
    this.message("user", `<user_shell_command>\n<command>\n${cmd}\n</command>\n<result>\nExit code: 0\nDuration: 0.1 seconds\nOutput:\n${output}\n</result>\n</user_shell_command>`);
    this.push("event_msg", { type: "task_complete", turn_id: fakeUuid(), last_agent_message: null });
  }

  /**
   * The user stops a turn (Codex 0.162): a `turn_aborted` event, and a user message
   * in `<turn_aborted>` telling the model so, as in Codex's source.
   */
  aborted(): void {
    this.push("event_msg", { type: "turn_aborted", reason: "interrupted", turn_id: fakeUuid() });
    this.message(
      "user",
      "<turn_aborted>\nThe user interrupted the previous turn on purpose. Any running unified exec processes may still be running in the background. If any tools/commands were aborted, they may have partially executed.\n</turn_aborted>",
    );
  }

  /** Housekeeping Codex appends to old files when it starts: not activity. */
  settingsApplied(at: string): void {
    this.lines.push({ timestamp: at, type: "event_msg", payload: { type: "thread_settings_applied", thread_id: this.id }, ordinal: this.lines.length });
  }

  text(): string {
    return this.lines.map((l) => JSON.stringify(l)).join("\n") + "\n";
  }

  /** UTF-8 bytes before line `n`: a `history_base.end_byte_offset`. */
  bytesBefore(n: number): number {
    return Buffer.byteLength(this.lines.slice(0, n).map((l) => JSON.stringify(l) + "\n").join(""), "utf8");
  }

  fileName(zst = false): string {
    const t = this.startIso.slice(0, 19).replace(/:/g, "-");
    return `rollout-${t}-${this.id}${this.tag ? "_" + this.tag : ""}.jsonl${zst ? ".zst" : ""}`;
  }

  /** Write under `<codexHome>/sessions/2026/10/10/` or `archived_sessions/`; returns the path. */
  write(codexHome: string, o: { archived?: boolean; zst?: boolean; text?: string } = {}): string {
    const dir = o.archived ? path.join(codexHome, "archived_sessions") : path.join(codexHome, "sessions", "2026", "10", "10");
    mkdirSync(dir, { recursive: true });
    const file = path.join(dir, this.fileName(o.zst));
    const text = o.text ?? this.text();
    writeFileSync(file, o.zst ? zstdCompressSync(Buffer.from(text)) : text);
    return file;
  }
}

/** `session_index.jsonl`: one line per rename, the last one wins. */
export function writeIndex(codexHome: string, names: [id: string, name: string][]): void {
  mkdirSync(codexHome, { recursive: true });
  writeFileSync(path.join(codexHome, "session_index.jsonl"), names.map(([id, name]) => JSON.stringify({ id, thread_name: name, updated_at: "2026-10-10T07:00:00Z" })).join("\n") + "\n");
}

/** A small session: an injected context, two turns with commands, a patch and a test run. */
export function sampleCodex(o: CodexOptions = {}): CodexSession {
  const s = new CodexSession(o);
  s.developer("You are Codex. Follow the repository instructions.");
  s.environment();
  s.user("Make add() take any number of arguments and run the tests.");
  s.assistant("I will update add() and run the tests.");
  s.command("sed -n '1,40p' add.js", "function add(a, b) {\n  return a + b;\n}");
  s.patch([{ update: `${s.cwd}/add.js` }, { update: `${s.cwd}/test.js` }]);
  s.command("node test.js", "all tests passed");
  s.assistant("add() now takes any number of arguments; node test.js passes.");
  s.user("Now add subtract(a, b) in subtract.js with a test.");
  s.patch([{ add: `${s.cwd}/subtract.js` }, { update: `${s.cwd}/test.js` }]);
  s.command("node test.js", "all tests passed");
  s.assistant("Added subtract(a, b); the tests pass.");
  return s;
}

/**
 * The 10-12 manual compaction test (handoff.md §7.8 point 6) in Codex's format,
 * with made-up content: three turns, `/compact`, one more turn, `/compact` again.
 */
export function compactedCodex(o: CodexOptions = {}): CodexSession {
  const s = new CodexSession({ cwd: "/work/compact-lab", ...o });
  s.developer("You are Codex.");
  s.environment();
  s.user("Create hello.py that prints hello");
  s.commentary("I will create hello.py, then run it.");
  s.patch([{ add: "hello.py" }]);
  s.command("python hello.py", "/bin/bash: line 1: python: command not found");
  s.commentary("There is no python here; trying python3.");
  s.command("python3 hello.py", "hello");
  s.assistant("Created hello.py; running it prints hello.");
  s.user("Run it");
  s.commentary("Running it with python3.");
  s.command("python3 hello.py", "hello");
  s.assistant("It ran and printed hello.");
  s.user("Print the current time instead, and run it again");
  s.commentary("I will change the script and run it.");
  s.patch([{ update: "hello.py" }]);
  s.command("python3 hello.py", "2026-10-12 11:35:39.453748");
  s.assistant("Updated hello.py; it printed 2026-10-12 11:35:39.453748.");
  s.compact("## Handoff Summary\n\n- Workspace: `/work/compact-lab`\n- hello.py prints the current time.\n- Use python3, not python.");
  s.user("Add a --name option");
  s.commentary("I will look at the script first.");
  s.command("pwd && rg --files", "/work/compact-lab\nhello.py");
  s.commentary("Making --name optional.");
  s.patch([{ update: "/work/compact-lab/hello.py" }]);
  s.command("python3 hello.py --name Codex", "Codex, current time is 2026-10-12 11:36:28.933977");
  s.assistant("Added --name; it printed: Codex, current time is 2026-10-12 11:36:28.933977.");
  s.compact("## Handoff Summary\n\n- Workspace: `/work/compact-lab`\n- hello.py takes an optional --name.\n- Verified with python3 hello.py --name Codex.");
  return s;
}
