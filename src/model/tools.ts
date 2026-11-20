/** Tool calls as shown to people: one short line per call. */
import { EXIT_CODES, FAILED, firstMatch, RESULT_HEADERS, toolBookkeeping, toolCommand, toolDescription, toolEdits } from "./formats";

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

/** The shell command a call ran, or null when it is not a command tool (the agents' profiles know their tools). */
export function commandOf(call: ParsedCall): string | null {
  return toolCommand(call.name, call.args);
}

/** Files changed through an editing tool or a patch (plan §4.5). */
export function editedFiles(call: ParsedCall): string[] {
  return toolEdits(call.name, call.args);
}

/** A call that keeps the agent's own lists or screens (its task list, its app's recap), not the work. */
export function isBookkeeping(call: ParsedCall): boolean {
  return toolBookkeeping(call.name);
}

/** How a step reads in a list: a tool name and its one important argument. */
export function describeCall(call: ParsedCall): { name: string; summary: string } {
  const command = commandOf(call);
  const special = toolDescription(call.name, call.args, command);
  if (special) return { name: special.name, summary: oneLine(special.summary) };
  if (command) return { name: call.name, summary: oneLine(command) };
  return { name: call.name, summary: callSummary(call) };
}

/** A tool result without the lines some agents put before the output ("Wall time", "Output:"). */
export function resultText(content: string): string {
  const m = firstMatch(RESULT_HEADERS, content);
  return m && m.index === 0 ? content.slice(m[0].length) : content;
}

/** The exit code a tool result reports, if any. */
export function exitCodeOf(content: string): number | null {
  const m = firstMatch(EXIT_CODES, content.slice(0, 600));
  return m ? Number(m[1]) : null;
}

/** Did the step fail? The source's own flag, else a non-zero exit code or a result that says it failed. */
export function resultFailed(ok: boolean | undefined, content: string): boolean {
  if (ok === false) return true;
  if (ok === true) return false;
  const code = exitCodeOf(content);
  return (code !== null && code !== 0) || FAILED.some((re) => re.test(content));
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
