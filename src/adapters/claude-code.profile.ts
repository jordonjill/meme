/**
 * Claude Code's profile (arch.md §6.1): what meme knows about it besides reading
 * its files. Data and small pure functions only, so every layer can read it.
 */
import type { Profile } from "./types";

const str = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v : null);
const EDIT_TOOLS = new Set(["Edit", "Write", "MultiEdit", "NotebookEdit"]);

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
  // It keeps 30,000 characters of a command's output, for `!` and its Bash tool alike;
  // meme's own 25,000 already stays under that.
  outputLimit: {},
  bangReachesModel: true,
  firstMessage: (command) => `Continue an earlier session: run \`${command}\` and follow the instructions at the top of its output.`,
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
  formats: {
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
  },
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
    attachment: "skipped: files and hook output attached to a message",
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
  },
};
