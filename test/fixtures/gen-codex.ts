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

  private message(role: string, text: string): number {
    return this.push("response_item", { type: "message", role, content: [{ type: role === "assistant" ? "output_text" : "input_text", text }] });
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
    this.message("assistant", text);
    this.push("event_msg", { type: "task_complete", turn_id: fakeUuid(), last_agent_message: text });
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
