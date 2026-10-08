/** Tool calls as shown to people: one short line per call. */

export interface ParsedCall {
  id: string;
  name: string;
  args: Record<string, unknown>;
}

export function parseArgs(args: string): Record<string, unknown> {
  try {
    const v = JSON.parse(args);
    return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : { value: v };
  } catch {
    return { value: args };
  }
}

const COMMAND_TOOLS = new Set(["Bash", "PowerShell", "exec_command", "shell", "local_shell", "unified_exec"]);
const EDIT_TOOLS = new Set(["Edit", "Write", "MultiEdit", "NotebookEdit"]);

export function isCommandTool(name: string): boolean {
  return COMMAND_TOOLS.has(name);
}

/** Files changed through an editing tool (plan §4.5: Claude Code's Edit/Write/MultiEdit/NotebookEdit). */
export function editedFile(call: ParsedCall): string | null {
  if (!EDIT_TOOLS.has(call.name)) return null;
  const p = call.args.file_path ?? call.args.notebook_path;
  return typeof p === "string" ? p : null;
}

const SUMMARY_KEYS = [
  "command", "cmd", "file_path", "notebook_path", "path", "pattern", "url", "query",
  "description", "prompt", "skill", "subject", "taskId", "name",
];

/** The one argument that says what a call did, e.g. the command of a Bash call. */
export function callSummary(call: ParsedCall): string {
  for (const key of SUMMARY_KEYS) {
    const v = call.args[key];
    if (typeof v === "string" && v.trim()) return oneLine(v);
    if (Array.isArray(v) && v.every((x) => typeof x === "string")) return oneLine(v.join(" "));
  }
  for (const v of Object.values(call.args)) if (typeof v === "string" && v.trim()) return oneLine(v);
  const json = JSON.stringify(call.args);
  return json === "{}" ? "" : oneLine(json);
}

export function oneLine(s: string): string {
  return s.replace(/\s+/g, " ").replace(/[\x00-\x1f\x7f]/g, (c) => "^" + String.fromCharCode((c.charCodeAt(0) + 64) & 127)).trim();
}

/** Plain text of a call for searching: the tool name, then each argument value on its own line. */
export function callText(call: ParsedCall): string {
  const parts = [call.name];
  for (const v of Object.values(call.args)) parts.push(typeof v === "string" ? v : JSON.stringify(v));
  return parts.join("\n");
}
