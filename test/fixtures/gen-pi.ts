/**
 * Synthetic Pi sessions in its native JSONL (session format 3, Pi 1.2.0), shaped
 * like the trial sessions of plan §6 ⑩. Only made-up content: real sessions
 * never go into the repository.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

type Line = Record<string, unknown>;

export interface PiOptions {
  id?: string;
  cwd?: string;
  start?: string;
  model?: string;
}

/** The folder Pi keeps a directory's sessions in. */
export function piFolderOf(dir: string): string {
  return `--${dir.replace(/^[/\\]/, "").replace(/[/\\:]/g, "-")}--`;
}

export class PiSession {
  readonly id: string;
  readonly cwd: string;
  readonly lines: Line[] = [];
  private readonly model: string;
  private readonly start: number;
  private clock: number;
  private parent: string | null = null;
  private n = 0;

  constructor(o: PiOptions = {}) {
    this.id = o.id ?? "9a9a9a9a-0000-4000-8000-000000000001";
    this.cwd = o.cwd ?? "/work/demo";
    this.model = o.model ?? "gpt-5.6-sol";
    this.start = this.clock = Date.parse(o.start ?? "2026-10-13T08:03:09.735Z");
    this.lines.push({ type: "session", version: 3, id: this.id, timestamp: new Date(this.clock).toISOString(), cwd: this.cwd });
    this.entry("model_change", { provider: "openai", modelId: this.model });
    this.entry("thinking_level_change", { thinkingLevel: "medium" });
    this.message({ role: "system", content: "", sections: { preamble: "You are an expert coding assistant." }, toolsAdded: [{ name: "bash" }] });
  }

  private tick(): number {
    this.clock += 1000;
    return this.clock;
  }

  /** Pi's entry ids are 8 hex digits. */
  private entry(type: string, extra: Line): string {
    const id = (++this.n).toString(16).padStart(8, "0");
    const ms = this.tick();
    this.lines.push({ type, id, parentId: this.parent, timestamp: new Date(ms).toISOString(), ...extra });
    this.parent = id;
    return id;
  }

  private message(m: Line): string {
    return this.entry("message", { message: { ...m, timestamp: this.clock + 1000 } });
  }

  user(text: string): string {
    return this.message({ role: "user", content: [{ type: "text", text }] });
  }

  private reply(content: Line[], stopReason: string, extra: Line = {}): string {
    return this.message({
      role: "assistant",
      content,
      api: "openai-responses",
      provider: "openai",
      model: this.model,
      usage: { input: 5573, output: 95, cacheRead: 0, cacheWrite: 0, totalTokens: 5668 },
      stopReason,
      ...extra,
    });
  }

  assistant(text: string, thinking?: string): string {
    return this.reply([...(thinking ? [{ type: "thinking", thinking }] : []), { type: "text", text }], "stop");
  }

  /** A tool call and its result. */
  tool(name: string, args: Line, result: string, o: { isError?: boolean; details?: Line } = {}): string {
    const callId = `call_${(this.n + 1).toString(16)}`;
    this.reply([{ type: "toolCall", id: callId, name, arguments: args }], "toolUse");
    return this.message({ role: "toolResult", toolCallId: callId, toolName: name, content: [{ type: "text", text: result }], isError: o.isError ?? false, ...(o.details ? { details: o.details } : {}) });
  }

  /** A command the user ran with `!` (or `!!`, `exclude`). */
  bash(command: string, output: string, o: { exclude?: boolean; exitCode?: number; truncated?: boolean; fullOutputPath?: string } = {}): string {
    return this.message({
      role: "bashExecution",
      command,
      output,
      exitCode: o.exitCode ?? 0,
      cancelled: false,
      truncated: o.truncated ?? false,
      ...(o.fullOutputPath ? { fullOutputPath: o.fullOutputPath } : {}),
      excludeFromContext: o.exclude ?? false,
    });
  }

  /** The user pressed Esc while a command ran: the command is aborted, then the reply. */
  stopped(command: string): string {
    this.tool("bash", { command }, "Command aborted", { isError: true });
    return this.reply([], "error", { errorMessage: "This operation was aborted" });
  }

  compaction(summary: string, firstKept: string): string {
    return this.entry("compaction", { summary, firstKeptEntryId: firstKept, tokensBefore: 42422, details: { readFiles: [], modifiedFiles: [] }, fromHook: false });
  }

  name(name: string): string {
    return this.entry("session_info", { name });
  }

  /** `/tree`: go back to an earlier entry; what follows starts another branch there. */
  backTo(entry: string): void {
    this.parent = entry;
  }

  branchSummary(summary: string, fromId: string): string {
    return this.entry("branch_summary", { fromId, summary });
  }

  raw(line: Line): void {
    this.lines.push(line);
  }

  text(): string {
    return this.lines.map((l) => JSON.stringify(l)).join("\n") + "\n";
  }

  /** `<sessions>/--<cwd>--/<time>_<id>.jsonl`, like Pi; the file's path. */
  write(sessionsDir: string): string {
    const dir = path.join(sessionsDir, piFolderOf(this.cwd));
    mkdirSync(dir, { recursive: true });
    const stamp = new Date(this.start).toISOString().replace(/[:.]/g, "-");
    const file = path.join(dir, `${stamp}_${this.id}.jsonl`);
    writeFileSync(file, this.text());
    return file;
  }
}

/** The trial run of plan §6 ⑩ in small: a file made, a command, an edit, `!`, `!!`, a stop, a compaction. */
export function samplePi(o: PiOptions = {}): PiSession {
  const s = new PiSession(o);
  s.user("Create notes.md with one line: hello");
  s.tool("write", { path: "notes.md", content: "hello\n" }, "Successfully wrote to notes.md");
  s.assistant("Created notes.md.", "Writing the file");
  s.user("Run the tests");
  s.tool("bash", { command: "bun test", timeout: 120 }, "3 pass\n0 fail\n");
  s.assistant("All 3 tests pass.");
  s.user("Change hello to hi");
  s.tool("edit", { path: "notes.md", edits: [{ oldText: "hello", newText: "hi" }] }, "Successfully replaced 1 block(s) in notes.md.");
  const done = s.assistant("Changed it.");
  s.bash("git status --short", " M notes.md\n");
  s.bash("echo private-123", "private-123\n", { exclude: true });
  s.user("Wait for the build");
  s.stopped("sleep 60 && make");
  s.user("Skip the build; check the zebra config instead");
  s.tool("read", { path: "zebra.toml" }, "stripes = 12\n");
  s.assistant("The zebra config has 12 stripes.");
  s.compaction("## Goal\n- Keep notes.md and check the zebra config.\n## Done\n- notes.md says hi.", done);
  s.user("What does notes.md say now?");
  s.tool("read", { path: "notes.md" }, "hi\n");
  s.assistant("It says hi.");
  return s;
}
