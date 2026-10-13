/**
 * OpenCode's profile (arch.md §6.1): what meme knows about it besides reading its
 * database. Data and small pure functions only, so every layer can read it.
 */
import { patchFiles } from "./codex.profile";
import type { Formats, Profile } from "./types";

const str = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v : null);

/** What a user record says when the user stopped a turn: OpenCode only marks the AI's message as aborted. */
export const OPENCODE_INTERRUPT = "[OpenCode: the user stopped this turn]";

/** The text OpenCode puts before a `!` command, which it keeps as a tool call made for the user (1.19). */
export const OPENCODE_SHELL_MARK = "The following tool was executed by the user";

/** A `!` command with its output, as meme writes it in one user record. */
export function openCodeShellText(command: string, output: string): string {
  return `<opencode_shell_command>\n<command>\n${command}\n</command>\n<result>\n${output}\n</result>\n</opencode_shell_command>`;
}

const formats: Formats = {
  injected: [],
  interrupt: /^\[OpenCode: the user stopped this turn\]/,
  shellInput: /^\s*<opencode_shell_command>\s*<command>\n?([\s\S]*?)\n?<\/command>/,
  shellOutput: /<result>\n?([\s\S]*?)\n?<\/result>\s*<\/opencode_shell_command>\s*$/,
  // Its bash tool keeps the end of a long output and says so first (1.19).
  longOutput: /^\.\.\.output truncated\.\.\.\n\nFull output saved to: [^\n]*\n\n/,
};

function edited(name: string, a: Record<string, unknown>): string[] {
  if ((name === "edit" || name === "write") && typeof a.filePath === "string") return [a.filePath];
  if ((name === "apply_patch" || name === "patch") && typeof a.patchText === "string") return patchFiles(a.patchText);
  return [];
}

/**
 * Why a part of a conversation type may become no record (1.19, checked on the
 * trial sessions of plan §6 ⑩). The part comes with its message's `role`.
 */
function expectedDrop(part: Record<string, unknown>): string | null {
  const text = typeof part.text === "string" ? part.text : null;
  if ((part.type === "text" || part.type === "reasoning") && !text?.trim()) return "empty";
  if (part.type === "text" && part.role !== "user" && part.role !== "assistant") return "neither the user's nor the AI's";
  return null;
}

export const openCodeProfile: Profile = {
  agent: "opencode",
  name: "OpenCode",
  short: "OpenCode",
  color: 114,
  aliases: ["opencode"],
  command: "opencode",
  homeDir: ".local/share/opencode",
  homeVar: "OPENCODE_DB",
  instructionFile: "AGENTS.md",
  // It sets these for everything it starts, its bash tool and `!` alike; no session id (1.19).
  inside: (v) => v.OPENCODE === "1",
  // Started inside another agent, it sees that one's variables too; it is the one running meme.
  nesting: 2,
  // Its bash tool keeps the last 2000 lines or 51,200 bytes of a command's output,
  // whichever comes first, and drops the start; a `!` command's output reaches the
  // model whole (1.19, plan §6 ⑩). 10% is left for the lines around the handoff.
  outputLimit: { bytes: 46_080, lines: 1_800 },
  bangReachesModel: true,
  webTools: ["webfetch", "websearch"],
  firstMessage: (command) => `Continue an earlier session: run \`${command}\` exactly as written, with no pipe or other command around it, and follow the instructions at the top of its output.`,
  // `!` switches its input to shell mode; the rest of the line is the command.
  howToContinue: ["the same two commands as in Claude Code"],
  forgetHelp:
    "OpenCode: meme runs `opencode session delete <id>` with the opencode of the side\nthe session is on, and deletes the full output of long commands OpenCode saved\nfor it. OpenCode keeps what you typed in its own prompt history.",
  keepsForkParents: false,
  compaction: {
    keepsRecords: true,
    summary: "readable",
    recognizedBy: "a user message with a compaction part, then an AI message marked summary that holds it",
  },
  formats,
  tools: {
    command: (name, a) => (name === "bash" ? str(a.command) : null),
    edited,
    describe(name, a) {
      if (name === "apply_patch" || name === "patch") return { name, summary: edited(name, a).join(", ") };
      return null;
    },
  },
  recordTypes: {
    "message/user": "read: what the user sent",
    "message/assistant": "read: what the AI did",
    "part/text": "read: the user's or the AI's words (the harness's when marked synthetic)",
    "part/reasoning": "read: reasoning",
    "part/tool": "read: a tool call and its result; a `!` command when the user ran it",
    "part/compaction": "known: where it compacted; the AI message after it holds the summary",
    "part/step-start": "skipped: a step began",
    "part/step-finish": "skipped: a step ended, with token counts",
    "part/file": "skipped: a file the user attached",
    "part/patch": "skipped: the files a step changed, as a snapshot",
    "part/snapshot": "skipped: a snapshot id",
    "part/subtask": "skipped: a subagent's task",
    "part/agent": "skipped: an agent the user mentioned",
    "part/retry": "skipped: a retried request",
  },
  conversation: ["part/text", "part/reasoning", "part/tool"],
  expectedDrop,
};
