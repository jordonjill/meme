/**
 * Codex's profile (arch.md §6.1): what meme knows about it besides reading its
 * files. Data and small pure functions only, so every layer can read it.
 */
import type { Profile } from "./types";

const str = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v : null);
const SHELL_TOOLS = new Set(["shell", "local_shell", "container.exec", "unified_exec"]);

/** A JavaScript string literal's value (double, single or backtick quotes). */
function unquote(literal: string): string {
  const q = literal[0];
  const body = literal.slice(1, -1);
  if (q === '"') {
    try {
      return JSON.parse(literal);
    } catch {}
  }
  return body.replace(/\\(n|t|r|\\|'|"|`)/g, (_m, c: string) => ({ n: "\n", t: "\t", r: "\r" })[c] ?? c);
}

/**
 * Codex 0.161+ "code mode": the model calls one tool, `exec`, with a small
 * script that calls `tools.exec_command({cmd: "…"})` or applies a patch.
 * These are the shell commands such a script runs.
 */
export function codeModeCommands(script: string): string[] {
  const out: string[] = [];
  const re = /exec_command\(\s*\{[^]*?["']?\bcmd["']?\s*:\s*("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)/g;
  for (const m of script.matchAll(re)) out.push(unquote(m[1]!));
  return out;
}

/** Files named in an apply_patch text: `*** Add/Update/Delete File: <path>`. */
export function patchFiles(text: string): string[] {
  const out = new Set<string>();
  for (const m of text.matchAll(/\*\*\* (?:Add|Update|Delete) File: ([^\n\\"'`]+)/g)) out.add(m[1]!.trim());
  return [...out];
}

function command(name: string, a: Record<string, unknown>): string | null {
  if (name === "exec_command") return str(a.cmd) ?? str(a.command);
  if (SHELL_TOOLS.has(name)) {
    const c = a.command ?? a.cmd;
    if (Array.isArray(c)) {
      const parts = c.filter((x): x is string => typeof x === "string");
      // ["bash", "-lc", "<script>"]: the script is what ran.
      return parts.length >= 3 && /^-l?c$/.test(parts[1]!) ? parts.slice(2).join(" ") : parts.join(" ") || null;
    }
    return str(c);
  }
  if (name === "exec" && typeof a.input === "string") {
    const cmds = codeModeCommands(a.input);
    return cmds.length ? cmds.join(" ; ") : null;
  }
  return null;
}

function edited(name: string, a: Record<string, unknown>): string[] {
  const text = [a.input, a.patch, a.value].find((v): v is string => typeof v === "string") ?? "";
  if (name === "apply_patch" || (name === "exec" && text.includes("*** Begin Patch"))) return patchFiles(text);
  return [];
}

/**
 * Why a conversation line may become no record (2026-10-12, checked on the
 * author's sessions): see plan §6 ⑦.1.
 */
function expectedDrop(line: Record<string, unknown>): string | null {
  const p = (line.payload ?? {}) as { type?: unknown; role?: unknown; content?: unknown; text?: unknown };
  if (p.type === "message") {
    if (p.role === "developer") return "instructions to the model (developer role)";
    // Empty only when the content is there and has nothing in it; content somewhere else is not empty.
    const empty = Array.isArray(p.content) && p.content.every((b) => {
      const { type, text } = (b ?? {}) as { type?: unknown; text?: unknown };
      return (type === "input_text" || type === "output_text") && typeof text === "string" && !text.trim();
    });
    if (empty) return "empty";
  }
  if (p.type === "agent_reasoning" && (typeof p.text !== "string" || !p.text.trim())) return "empty";
  return null;
}

export const codexProfile: Profile = {
  agent: "codex",
  name: "Codex",
  short: "Codex",
  color: 75,
  aliases: ["codex"],
  command: "codex",
  homeDir: ".codex",
  homeVar: "CODEX_HOME",
  archivedDir: "archived_sessions",
  instructionFile: "AGENTS.md",
  inside: (v) => Boolean(v.CODEX_THREAD_ID) || Object.keys(v).some((k) => k.startsWith("CODEX_SANDBOX")),
  sessionVar: "CODEX_THREAD_ID",
  // Started inside Claude Code, Codex sees Claude Code's variables too; it is the one running meme.
  nesting: 1,
  // It keeps 10,000 of its tokens of a command's output and counts a token as 4
  // bytes, so 40,000 bytes; 10% is left for the lines around the handoff (sessions.md §7.1).
  outputLimit: { bytes: 36_000 },
  // A `!` command's output stays in the conversation but reaches the model only with the next message.
  bangReachesModel: false,
  // Codex's own web search (0.162: "web_search"); its tool calls carry that name.
  webTools: ["web_search"],
  // Its model sets how much command output it keeps; ask for enough (sessions.md §7.1).
  firstMessage: (command) => `Continue an earlier session: run \`${command}\` exactly as written, with no pipe or other command around it (its output can be up to 10,000 tokens; allow that much), and follow the instructions at the top of its output.`,
  howToContinue: [
    'the same two commands, then say "continue": Codex keeps the output',
    "of a ! command but does not pass it to the model by itself",
  ],
  mcpConnect: "codex mcp add meme -- meme mcp",
  forgetHelp:
    "Codex: meme runs `codex delete --force <id>` with the codex of the side the\nsession is on: here, in WSL (from Windows), or on Windows (from WSL). Codex\nwill not delete a session while a fork of it exists: name the fork too, and meme\ndeletes it first. Codex keeps what you typed in its own input history.",
  keepsForkParents: true,
  compaction: {
    keepsRecords: true,
    summary: "readable unless encrypted",
    recognizedBy: "a compacted line; the AI message before it with the same text is the summary",
  },
  formats: {
    injected: [/^<(?:environment_context|user_instructions|permissions instructions|turn_context)[\s>]/, /^# AGENTS\.md instructions\b/],
    // What Codex 0.162 tells the model after the user stopped a turn (its source: `<turn_aborted>…</turn_aborted>`).
    interrupt: /^<turn_aborted>/,
    shellInput: /^\s*<user_shell_command>\s*<command>\n?([\s\S]*?)\n?<\/command>/,
    shellOutput: /<result>\n?([\s\S]*?)\n?<\/result>\s*<\/user_shell_command>\s*$/,
    resultHeader: /^(?:Script (?:completed|failed)[^\n]*\n|Chunk ID:[^\n]*\n|Wall time:?[^\n]*\n|Process exited with code[^\n]*\n|Exit code:?[^\n]*\n|Original token count:[^\n]*\n|Duration:?[^\n]*\n)+Output:\n\n?/,
    exitCode: /^(?:Process exited with code|Exit code:?)\s*(-?\d+)/m,
    failed: /^Script failed/,
    summaryPrefix: /^\s*Another language model started to solve this problem[\s\S]*?use the information in this summary to assist with your own analysis:\s*/,
  },
  tools: {
    command,
    edited,
    describe(name, a, cmd) {
      if (name === "exec" && typeof a.input === "string") {
        if (cmd) return { name: "exec_command", summary: cmd };
        const files = edited(name, a);
        if (files.length) return { name: "apply_patch", summary: files.join(", ") };
        return { name: "exec", summary: a.input.split("\n").find((l) => l.trim()) ?? "" };
      }
      if (name === "apply_patch") return { name, summary: edited(name, a).join(", ") };
      return null;
    },
    // Its plan, shown to the user as a checklist.
    bookkeeping: /^update_plan$/,
  },
  recordTypes: {
    session_meta: "read: id, start directory, version, fork and rollback base",
    turn_context: "read: directory and model",
    compacted: "read: where it compacted, and the summary",
    world_state: "skipped: settings snapshot",
    token_usage_record: "skipped: token counts",
    "response_item/message": "read: user, AI and developer messages",
    "response_item/reasoning": "skipped: encrypted reasoning",
    "response_item/function_call": "read: a tool call",
    "response_item/function_call_output": "read: its result",
    "response_item/custom_tool_call": "read: a tool call (the exec code-mode script)",
    "response_item/custom_tool_call_output": "read: its result",
    "response_item/web_search_call": "read: a web search",
    "response_item/tool_search_call": "read: a tool search",
    "response_item/tool_search_output": "read: its result",
    "event_msg/agent_reasoning": "read: reasoning summary",
    "event_msg/task_started": "known: a turn started; marks activity",
    "event_msg/task_complete": "known: a turn ended; marks activity",
    "event_msg/turn_aborted": "known: a turn was stopped; marks activity",
    "event_msg/user_message": "skipped: the interface's copy of a user message",
    "event_msg/agent_message": "skipped: the interface's copy of an AI message",
    "event_msg/token_count": "skipped: token counts",
    "event_msg/item_completed": "skipped: interface progress",
    "event_msg/thread_settings_applied": "skipped: settings",
  },
  conversation: [
    "response_item/message",
    "response_item/function_call",
    "response_item/function_call_output",
    "response_item/custom_tool_call",
    "response_item/custom_tool_call_output",
    "response_item/web_search_call",
    "response_item/tool_search_call",
    "response_item/tool_search_output",
    "event_msg/agent_reasoning",
  ],
  expectedDrop,
};
