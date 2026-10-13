/**
 * Pi's profile (arch.md §6.1): what meme knows about it besides reading its
 * files. Data and small pure functions only, so every layer can read it.
 */
import type { Formats, Profile } from "./types";

const str = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v : null);

/** What a user record says when the user stopped a turn: Pi only marks the AI's reply as aborted. */
export const PI_INTERRUPT = "[Pi: the user stopped this turn]";

/** A command the user ran with `!` or `!!`, as Pi passes it to the model (its `bashExecutionToText`, 1.2.0). */
export function piShellText(m: { command?: unknown; output?: unknown; exitCode?: unknown; cancelled?: unknown; truncated?: unknown; fullOutputPath?: unknown }): string {
  let text = `Ran \`${typeof m.command === "string" ? m.command : ""}\`\n`;
  text += typeof m.output === "string" && m.output ? `\`\`\`\n${m.output}\n\`\`\`` : "(no output)";
  if (m.cancelled === true) text += "\n\n(command cancelled)";
  else if (typeof m.exitCode === "number" && m.exitCode !== 0) text += `\n\nCommand exited with code ${m.exitCode}`;
  if (m.truncated === true && typeof m.fullOutputPath === "string") text += `\n\n[Output truncated. Full output: ${m.fullOutputPath}]`;
  return text;
}

const formats: Formats = {
  injected: [],
  interrupt: /^\[Pi: the user stopped this turn\]/,
  shellInput: /^Ran `([\s\S]*?)`\n(?:```\n|\(no output\))/,
  shellOutput: /^Ran `[\s\S]*?`\n```\n([\s\S]*?)\n```/,
  exitCode: /^Command exited with code (-?\d+)/m,
};

const textOf = (content: unknown): string => {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content.map((b) => (b && typeof b === "object" && typeof (b as { text?: unknown }).text === "string" ? (b as { text: string }).text : "")).join("");
};

/** Why a conversation line may become no record (1.2.0, checked on the trial sessions of plan §6 ⑩). */
function expectedDrop(line: Record<string, unknown>): string | null {
  const m = (line.message ?? {}) as { role?: unknown; content?: unknown; stopReason?: unknown };
  if (m.role === "user" && !textOf(m.content).trim()) return "no text in it (an image)";
  if (m.role === "assistant" && Array.isArray(m.content)) {
    const said = m.content.some((b) => {
      const { type, text, thinking } = (b ?? {}) as { type?: unknown; text?: unknown; thinking?: unknown };
      return type === "toolCall" || (type === "text" && typeof text === "string" && text.trim()) || (type === "thinking" && typeof thinking === "string" && thinking.trim());
    });
    if (!said) return m.stopReason === "aborted" || m.stopReason === "error" ? "a reply that stopped before saying anything" : "nothing in it";
  }
  return null;
}

export const piProfile: Profile = {
  agent: "pi",
  name: "Pi",
  short: "Pi",
  color: 177,
  aliases: ["pi"],
  command: "pi",
  homeDir: ".pi",
  homeVar: "PI_CODING_AGENT_DIR",
  instructionFile: "AGENTS.md",
  // Its bash tool sees both; a `!` command only the first (1.2.0).
  inside: (v) => v.PI_CODING_AGENT === "true" || Boolean(v.PI_SESSION_ID),
  sessionVar: "PI_SESSION_ID",
  // Started inside another agent, it sees that one's variables too; it is the one running meme.
  nesting: 2,
  // Its bash tool and `!` keep the last 2000 lines or 50 KB of a command's output,
  // whichever comes first, and drop the start (1.2.0, plan §6 ⑩); 10% is left for
  // the lines around the handoff.
  outputLimit: { bytes: 46_080, lines: 1_800 },
  bangReachesModel: true,
  // No tool of its own reads the web (1.2.0); extensions may add some.
  webTools: [],
  firstMessage: (command) => `Continue an earlier session: run \`${command}\` exactly as written, with no pipe or other command around it, and follow the instructions at the top of its output.`,
  howToContinue: ["the same two commands as in Claude Code"],
  forgetHelp: "Pi: meme deletes the session file (Pi has no delete command; its /resume list\nwith Ctrl+D does the same), and the full output of long commands Pi saved for it.",
  keepsForkParents: false,
  compaction: {
    keepsRecords: true,
    summary: "readable",
    recognizedBy: "a compaction entry, which holds the summary; the entries before it stay in the file",
  },
  formats,
  tools: {
    command: (name, a) => (name === "bash" || name === "powershell" ? str(a.command) : null),
    edited: (name, a) => ((name === "edit" || name === "write") && typeof a.path === "string" ? [a.path] : []),
  },
  recordTypes: {
    session: "read: id, start directory, when it started",
    "message/user": "read: the user's messages",
    "message/assistant": "read: the AI's text, tool calls and reasoning",
    "message/toolResult": "read: tool results",
    "message/bashExecution": "read: a command the user ran with ! (or !!, which the model does not see)",
    "message/system": "skipped: the system prompt",
    "message/custom": "skipped: text an extension added",
    compaction: "read: where it compacted, and the summary",
    branch_summary: "read: its summary of a branch the user left, as the harness's text",
    session_info: "read: the name the user gave",
    model_change: "skipped: model changes",
    thinking_level_change: "skipped: settings",
    usage: "skipped: token counts",
    context_edit: "skipped: changes what the model sees, not the history",
    custom: "skipped: an extension's data",
    custom_message: "skipped: text an extension added for the model",
    label: "skipped: a bookmark",
  },
  conversation: ["message/user", "message/assistant", "message/toolResult", "message/bashExecution", "compaction"],
  expectedDrop,
};
