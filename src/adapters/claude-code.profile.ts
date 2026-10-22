/**
 * Claude Code's profile (arch.md §6.1): what meme knows about it besides reading
 * its files. Data and small pure functions only, so every layer can read it.
 */
import type { Formats, Profile } from "./types";

const str = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v : null);
const EDIT_TOOLS = new Set(["Edit", "Write", "MultiEdit", "NotebookEdit"]);

const formats: Formats = {
  injected: [/^(?:\s*<system-reminder>[\s\S]*?<\/system-reminder>)+\s*$/, /^<(?:task-notification|local-command-caveat)[\s>]/],
  interrupt: /^\[Request interrupted by user/,
  output: /^<(?:bash-stdout|bash-stderr|local-command-stdout|local-command-stderr)>/,
  shellInput: /^\s*<bash-input>([\s\S]*?)<\/bash-input>\s*$/,
  shellOutput: /^<bash-stdout>([\s\S]*?)<\/bash-stdout>/,
  longOutput: /^<persisted-output>[\s\S]*?\nPreview[^\n]*\n/,
  exitCode: /^Exit code:?\s*(-?\d+)/m,
  summaryPrefix: /^\s*This session is being continued from a previous conversation[^\n]*\n(?:[^\n]*\n){0,3}?\s*Summary:[ \t]*\n/,
  summaryClosing: [
    "If you need specific details from before compaction",
    "Continue the conversation from where it left off",
    "Please continue the conversation from where",
    "The messages after this summary are the most recent messages",
    "Recent messages are preserved verbatim",
  ],
};

/** Blocks with nothing written in them: thinking it did not write down (the usual case), empty text. */
const EMPTY_BLOCK = (b: unknown): boolean => {
  if (!b || typeof b !== "object") return false;
  const { type, text, thinking } = b as { type?: unknown; text?: unknown; thinking?: unknown };
  if (type === "thinking" || type === "redacted_thinking") return typeof thinking !== "string" || !thinking.trim();
  return type === "text" && typeof text === "string" && !text.trim();
};

/**
 * Why a user, assistant or local command line may become no record (2026-10-12,
 * checked on the author's sessions): see plan §6 ⑦.1.
 */
function expectedDrop(line: Record<string, unknown>): string | null {
  // An attachment is the user's only as a queued message from a human (plan §6 ⑨, R1);
  // one from a sender meme does not know is reported.
  if (line.type === "attachment") {
    const a = line.attachment as { type?: unknown; origin?: { kind?: unknown }; prompt?: unknown } | undefined;
    if (a?.type !== "queued_command") return "an attachment: files, hook output, notices";
    const origin = a.origin?.kind;
    if (origin === "task-notification" || origin === "peer") return "a queued message from a background task or another session";
    // No origin before 2.1.296: a notice reads as the harness's text.
    if (origin === undefined && typeof a.prompt === "string" && formats.injected.some((re) => re.test(a.prompt as string))) return "a notice queued by the harness";
    return null;
  }
  const content = line.type === "system" ? line.content : (line.message as { content?: unknown } | undefined)?.content;
  if (typeof content === "string") {
    const t = content.trimStart();
    if (!t) return "empty";
    if (line.type === "system") return t.includes("<command-name>") ? null : "the output of a local command";
    if (formats.injected.some((re) => re.test(t)) || formats.output!.test(t)) return "the harness's text or a local command's output";
    return null;
  }
  if (Array.isArray(content) && content.every(EMPTY_BLOCK)) return "nothing written in it (thinking it did not write down, empty text)";
  return null;
}

export const claudeCodeProfile: Profile = {
  agent: "claude-code",
  name: "Claude Code",
  short: "Claude",
  color: 209,
  aliases: ["claude", "cc", "claude-code"],
  command: "claude",
  homeDir: ".claude",
  homeVar: "CLAUDE_CONFIG_DIR",
  instructionFile: "CLAUDE.md",
  inside: (v) => v.CLAUDECODE === "1" || Boolean(v.CLAUDE_CODE_SESSION_ID),
  sessionVar: "CLAUDE_CODE_SESSION_ID",
  nesting: 0,
  // An output over about 30,000 bytes, of `!` and its Bash tool alike, is saved to a
  // file and the model sees its first 2KB (2.1.280–2.1.296, plan §6 ⑤); 27,000 leaves
  // room for the lines around the handoff.
  outputLimit: { bytes: 27_000 },
  bangReachesModel: true,
  webTools: ["WebFetch", "WebSearch"],
  // As written: a pipe or another command around it hides the handoff from the relay chain (plan §6 ⑧.3).
  firstMessage: (command) => `Continue an earlier session: run \`${command}\` exactly as written, with no pipe or other command around it, and follow the instructions at the top of its output.`,
  howToContinue: [
    "! meme continue        see the numbered list",
    "! meme continue <n>    hand over number n (or: last, codex, win, an id,",
    "                       a word from the title); it sums up where things",
    "                       stand and waits for your go-ahead",
  ],
  forgetHelp: "Claude Code: meme deletes the session file and its folders (subagents and large\ntool output, file-history backups, session-env).",
  keepsForkParents: false,
  compaction: {
    keepsRecords: true,
    summary: "readable",
    recognizedBy: "a user line marked isCompactSummary after a compact_boundary line; /compact is written once as typed and once as a command",
  },
  formats,
  tools: {
    command: (name, a) => (name === "Bash" || name === "PowerShell" ? str(a.command) : null),
    edited(name, a) {
      if (!EDIT_TOOLS.has(name)) return [];
      const p = a.file_path ?? a.notebook_path;
      return typeof p === "string" ? [p] : [];
    },
  },
  recordTypes: {
    user: "read: the user's messages and tool results",
    assistant: "read: the AI's text, tool calls and reasoning",
    "system/local_command": "read: a local command such as /model, put back as a user message",
    "system/compact_boundary": "known: where it compacted; the summary after it is read",
    "continued-in": "read: the session this one was continued in",
    "custom-title": "read: the title the user gave",
    "ai-title": "read: the title it generated",
    attachment: "read: what the user sent while the agent worked (queued_command from a human); skipped: files, hook output, notices",
    "file-history-snapshot": "skipped: backups of edited files",
    "file-history-delta": "skipped: backups of edited files",
    "last-prompt": "skipped: bookkeeping",
    mode: "skipped: bookkeeping",
    "permission-mode": "skipped: bookkeeping",
    "atis-latch": "skipped: bookkeeping",
    "cost-state": "skipped: bookkeeping",
    "queue-operation": "skipped: bookkeeping of messages typed while it worked",
    "agent-name": "skipped: bookkeeping",
    "frame-link": "skipped: bookkeeping",
    "artifact-autoreact-ledger": "skipped: bookkeeping",
    "artifact-comment-monitor": "skipped: bookkeeping",
    "system/turn_duration": "skipped: how long a turn took",
    "system/away_summary": "skipped: its recap for the user after a break",
    "system/informational": "skipped: a notice to the user",
    "system/stop_hook_summary": "skipped: hook output",
    summary: "skipped: older versions' session summaries",
    // From 2.1.304 (seen up to 2.1.308, 2026-10-22, plan §6 ⑪, F25): what it sent to the model, which the conversation holds too.
    "api-request": "skipped: a log of each request to the model",
    "api-request-blob": "skipped: the messages of those requests",
    "api-request-shape": "skipped: the system prompt and tools of those requests",
  },
  conversation: ["user", "assistant", "system/local_command", "attachment"],
  expectedDrop,
};
