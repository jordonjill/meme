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

const EDIT_TOOLS = new Set(["Edit", "Write", "MultiEdit", "NotebookEdit"]);
const SHELL_TOOLS = new Set(["shell", "local_shell", "container.exec", "unified_exec"]);

const str = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v : null);

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

/** The shell command a call ran, or null when it is not a command tool. */
export function commandOf(call: ParsedCall): string | null {
  const a = call.args;
  if (call.name === "Bash" || call.name === "PowerShell") return str(a.command);
  if (call.name === "exec_command") return str(a.cmd) ?? str(a.command);
  if (SHELL_TOOLS.has(call.name)) {
    const c = a.command ?? a.cmd;
    if (Array.isArray(c)) {
      const parts = c.filter((x): x is string => typeof x === "string");
      // ["bash", "-lc", "<script>"]: the script is what ran.
      return parts.length >= 3 && /^-l?c$/.test(parts[1]!) ? parts.slice(2).join(" ") : parts.join(" ") || null;
    }
    return str(c);
  }
  if (call.name === "exec" && typeof a.input === "string") {
    const cmds = codeModeCommands(a.input);
    return cmds.length ? cmds.join(" ; ") : null;
  }
  return null;
}

/** Files changed through an editing tool or a patch (plan §4.5). */
export function editedFiles(call: ParsedCall): string[] {
  if (EDIT_TOOLS.has(call.name)) {
    const p = call.args.file_path ?? call.args.notebook_path;
    return typeof p === "string" ? [p] : [];
  }
  const text = [call.args.input, call.args.patch, call.args.value].find((v): v is string => typeof v === "string") ?? "";
  if (call.name === "apply_patch" || (call.name === "exec" && text.includes("*** Begin Patch"))) return patchFiles(text);
  return [];
}

/** How a step reads in a list: a tool name and its one important argument. */
export function describeCall(call: ParsedCall): { name: string; summary: string } {
  const command = commandOf(call);
  if (call.name === "exec" && typeof call.args.input === "string") {
    if (command) return { name: "exec_command", summary: oneLine(command) };
    const files = editedFiles(call);
    if (files.length) return { name: "apply_patch", summary: files.join(", ") };
    return { name: "exec", summary: oneLine(call.args.input.split("\n").find((l) => l.trim()) ?? "") };
  }
  if (call.name === "apply_patch") return { name: call.name, summary: editedFiles(call).join(", ") };
  if (command) return { name: call.name, summary: oneLine(command) };
  return { name: call.name, summary: callSummary(call) };
}

/** Header lines Codex puts before a tool's output ("Script completed", "Wall time", "Exit code", "Output:"). */
const RESULT_HEADER = /^(?:Script (?:completed|failed)[^\n]*\n|Chunk ID:[^\n]*\n|Wall time:?[^\n]*\n|Process exited with code[^\n]*\n|Exit code:?[^\n]*\n|Original token count:[^\n]*\n|Duration:?[^\n]*\n)+Output:\n\n?/;

/** A tool result without Codex's header lines. */
export function resultText(content: string): string {
  const m = RESULT_HEADER.exec(content);
  return m ? content.slice(m[0].length) : content;
}

/** The exit code a tool result reports, if any. */
export function exitCodeOf(content: string): number | null {
  const m = /^(?:Process exited with code|Exit code:?)\s*(-?\d+)/m.exec(content.slice(0, 600));
  return m ? Number(m[1]) : null;
}

/** Did the step fail? The source's own flag, else a non-zero exit code or a failed script. */
export function resultFailed(ok: boolean | undefined, content: string): boolean {
  if (ok === false) return true;
  if (ok === true) return false;
  const code = exitCodeOf(content);
  return (code !== null && code !== 0) || /^Script failed/.test(content);
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
