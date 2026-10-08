/**
 * Synthetic Claude Code sessions in the native JSONL format (2.1.27x–2.1.29x).
 * Only made-up content: real sessions never go into the repository.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

let counter = 0;

/** Deterministic UUIDs so test output is stable. */
export function fakeUuid(prefix = "0000"): string {
  counter++;
  return `${prefix.padStart(8, "0")}-0000-4000-8000-${counter.toString(16).padStart(12, "0")}`;
}

export function resetIds(): void {
  counter = 0;
}

type Line = Record<string, unknown>;

export interface SessionOptions {
  id?: string;
  cwd?: string;
  branch?: string;
  start?: string;
  version?: string;
}

export class ClaudeSession {
  readonly id: string;
  cwd: string;
  branch: string;
  readonly lines: Line[] = [];
  private clock: number;
  private parent: string | null = null;
  private readonly version: string;

  constructor(o: SessionOptions = {}) {
    this.id = o.id ?? fakeUuid("5e55");
    this.cwd = o.cwd ?? "/work/demo";
    this.branch = o.branch ?? "main";
    this.clock = Date.parse(o.start ?? "2026-09-30T09:08:00.000Z");
    this.version = o.version ?? "2.1.285";
  }

  private tick(): string {
    const t = new Date(this.clock).toISOString();
    this.clock += 1000;
    return t;
  }

  private base(type: string, extra: Line = {}): Line {
    const uuid = fakeUuid();
    const line: Line = {
      parentUuid: this.parent,
      isSidechain: false,
      type,
      uuid,
      timestamp: this.tick(),
      userType: "external",
      entrypoint: "cli",
      cwd: this.cwd,
      sessionId: this.id,
      version: this.version,
      gitBranch: this.branch,
      ...extra,
    };
    this.parent = uuid;
    return line;
  }

  private push(line: Line): string {
    this.lines.push(line);
    return line.uuid as string;
  }

  user(content: string | unknown[], extra: Line = {}): string {
    return this.push(this.base("user", { message: { role: "user", content }, ...extra }));
  }

  /** Harness text marked `isMeta`, e.g. an expanded skill or command prompt. */
  meta(text: string): string {
    return this.user(text, { isMeta: true });
  }

  compactSummary(text: string): string {
    return this.user(text, { isCompactSummary: true, isVisibleInTranscriptOnly: true });
  }

  reminder(text: string): string {
    return this.user(`<system-reminder>\n${text}\n</system-reminder>`);
  }

  taskNotification(text: string): string {
    return this.user(`<task-notification>\n<task-id>t1</task-id>\n<summary>${text}</summary>\n</task-notification>`);
  }

  /** A local command such as /model: the command line, then its output. */
  localCommand(name: string, output: string, form: "user" | "system" = "system", args = ""): void {
    const cmd = `<command-name>/${name}</command-name>\n            <command-message>${name}</command-message>\n            <command-args>${args}</command-args>`;
    const out = `<local-command-stdout>${output}</local-command-stdout>`;
    if (form === "user") {
      this.user(cmd);
      this.user(out);
    } else {
      this.push(this.base("system", { subtype: "local_command", content: cmd, level: "info", isMeta: false }));
      this.push(this.base("system", { subtype: "local_command", content: out, level: "info", isMeta: false, commandRun: { command: name, args } }));
    }
  }

  /** A prompt command such as /statusline: the command line, then its expanded prompt (isMeta). */
  promptCommand(name: string, expanded: string): void {
    this.user(`<command-message>${name}</command-message>\n<command-name>/${name}</command-name>`);
    this.meta(expanded);
  }

  bash(command: string, output: string): void {
    this.user(`<bash-input>${command}</bash-input>`);
    this.user(`<bash-stdout>${output}</bash-stdout><bash-stderr></bash-stderr>`);
  }

  interrupt(forTool = false): string {
    return this.user([{ type: "text", text: forTool ? "[Request interrupted by user for tool use]" : "[Request interrupted by user]" }]);
  }

  private assistantLine(block: Line): string {
    return this.push(
      this.base("assistant", {
        message: { model: "claude-opus-5", id: `msg_${counter}`, type: "message", role: "assistant", content: [block], stop_reason: null },
        requestId: `req_${counter}`,
      }),
    );
  }

  assistant(text: string): string {
    return this.assistantLine({ type: "text", text });
  }

  thinking(text: string): string {
    return this.assistantLine({ type: "thinking", thinking: text, signature: "sig" });
  }

  /** A tool call; returns its tool_use id for the result. */
  call(name: string, input: Record<string, unknown>): string {
    const id = `toolu_${String(counter + 1).padStart(6, "0")}`;
    this.assistantLine({ type: "tool_use", id, name, input });
    return id;
  }

  result(id: string, content: string, isError = false): string {
    return this.user([{ tool_use_id: id, type: "tool_result", content, is_error: isError }], { toolUseResult: { stdout: content } });
  }

  /** A call with its result in one go. */
  tool(name: string, input: Record<string, unknown>, output: string, isError = false): void {
    this.result(this.call(name, input), output, isError);
  }

  aiTitle(title: string): void {
    this.lines.push({ type: "ai-title", aiTitle: title, sessionId: this.id });
  }

  customTitle(title: string): void {
    this.lines.push({ type: "custom-title", customTitle: title, sessionId: this.id });
  }

  continuedIn(next: ClaudeSession): void {
    this.lines.push({ type: "continued-in", sessionId: this.id, continuedInSessionId: next.id, timestamp: this.tick() });
  }

  /** Transport noise Claude Code writes between messages. */
  noise(): void {
    this.lines.push({ type: "file-history-snapshot", messageId: fakeUuid(), snapshot: {}, isSnapshotUpdate: false });
    this.lines.push({ type: "last-prompt", lastPrompt: "x", leafUuid: this.parent, sessionId: this.id });
  }

  /**
   * What `claude --resume` does: the new session starts with a copy of every
   * conversational line of the old one, under the new session id.
   */
  resumeInto(next: ClaudeSession): void {
    for (const line of this.lines) {
      if (line.type !== "user" && line.type !== "assistant") continue;
      next.lines.push({ ...line, sessionId: next.id });
    }
    next.parent = this.parent;
    next.clock = Math.max(next.clock, this.clock + 60_000);
    this.continuedIn(next);
  }

  text(): string {
    return this.lines.map((l) => JSON.stringify(l)).join("\n") + "\n";
  }

  /** Write to `<projects>/<slug of cwd>/<id>.jsonl`; returns the file path. */
  write(projectsDir: string, text = this.text()): string {
    const dir = path.join(projectsDir, this.cwd.replace(/[^A-Za-z0-9]/g, "-"));
    mkdirSync(dir, { recursive: true });
    const file = path.join(dir, `${this.id}.jsonl`);
    writeFileSync(file, text);
    return file;
  }
}

/**
 * A small session covering the cases plan §5 lists: a prompt command, steps,
 * edits, a failed tool, an injected reminder, an interrupt and a local command.
 */
export function sampleSession(o: SessionOptions = {}): ClaudeSession {
  const s = new ClaudeSession(o);
  s.noise();
  s.promptCommand("statusline", "Set up the status line to match the shell prompt.");
  s.tool("Bash", { command: "cat ~/.bashrc", description: "Read bashrc" }, "PS1='\\u@\\h:\\w'");
  s.assistant("The status line now mirrors your shell prompt.");
  s.user("状态栏现在显示哪些内容？接力");
  s.thinking("Let me check the settings file.");
  s.tool("Read", { file_path: "/home/u/.claude/settings.json" }, "{\n  \"statusLine\": {}\n}");
  s.tool("Bash", { command: "npm test" }, "1 failing", true);
  s.reminder("The date is 2026-09-30.");
  s.assistant("It shows three items: user, host and directory.\nSecond line of the reply.");
  s.user("Make it colorful, use secure_delete style names");
  s.tool("Edit", { file_path: "/home/u/.claude/statusline.sh", old_string: "a", new_string: "b" }, "ok");
  s.tool("Write", { file_path: "/home/u/notes.md", content: "colors: green" }, "ok");
  s.interrupt(true);
  s.user("好的，换成彩色");
  s.assistant("Done: the status line now uses colors.");
  s.localCommand("model", "Kept model as `Opus`");
  s.aiTitle("Status line setup");
  return s;
}
