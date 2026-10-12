/**
 * Recent commands (handoff.md §7.3, A4): the shell commands that did something,
 * newest last, with whether they worked. Reading the repository again is cheap,
 * so commands that only read are left out, as are meme's own.
 */
import { callsOf, contentOf, type Rec } from "../model/record";
import { commandOf, exitCodeOf, oneLine, resultFailed, resultText, type ParsedCall } from "../model/tools";
import type { Turn } from "../model/turns";

const MAX = 10;
const COMMAND_CHARS = 120;

const READS = new Set([
  "ls", "cat", "head", "tail", "pwd", "echo", "grep", "rg", "find", "wc", "cd",
  // Filters that only print what comes through a pipe.
  "cut", "sort", "uniq", "tr", "nl", "column", "jq",
  // PowerShell
  "Get-Content", "Get-ChildItem", "Get-Location", "Select-String",
]);
const GIT_READS = new Set(["status", "log", "diff", "show"]);

/** A command split at `&&`, `||`, `;`, `|` and line ends that are not inside quotes. */
export function segments(command: string): string[] {
  const out: string[] = [];
  let cur = "";
  let quote: string | null = null;
  for (let i = 0; i < command.length; i++) {
    const c = command[i]!;
    if (quote) {
      if (c === "\\" && quote === '"') cur += c + (command[++i] ?? "");
      else {
        if (c === quote) quote = null;
        cur += c;
      }
      continue;
    }
    if (c === "'" || c === '"') {
      quote = c;
      cur += c;
    } else if (c === ";" || c === "\n" || c === "|" || (c === "&" && command[i + 1] === "&")) {
      if (command[i + 1] === c) i++;
      out.push(cur);
      cur = "";
    } else cur += c;
  }
  out.push(cur);
  return out.map((s) => s.trim()).filter(Boolean);
}

/** A heredoc's body is data, not commands: `cat > f <<'EOF' … EOF` reads as `cat > f <<EOF`. */
function withoutHeredocs(command: string): string {
  return command.replace(/<<-?[ \t]*(['"]?)([A-Za-z_]\w*)\1([^\n]*)\n[\s\S]*?\n[ \t]*\2[ \t]*(?=\n|$)/g, "<<$2$3");
}

interface Part {
  /** The segment as written. */
  text: string;
  /** Its words, from the command it runs: no leading `VAR=x`, sudo, time or env. */
  words: string[];
}

/** The commands a shell line runs, one per segment. */
export function parts(command: string): Part[] {
  return segments(withoutHeredocs(command)).map((text) => {
    const words = text.replace(/^\(+/, "").split(/\s+/).filter(Boolean);
    while (words.length && (/^\w+=/.test(words[0]!) || ["sudo", "time", "command", "env"].includes(words[0]!))) words.shift();
    return { text, words };
  });
}

/** A command's name without its folder: `~/tools/bun/bin/bun` is `bun`. */
const nameOf = (p: Part) => (p.words[0] ?? "").split(/[\\/]/).pop()!;

/** One of the commands a shell line runs starts like `re`: `cd x && bun test`, not `cat > notes.md <<EOF … bun test …`. */
export function runs(command: string, re: RegExp): boolean {
  return recognized(command, re) !== null;
}

/**
 * The command in a shell line that starts like `re` (the last, when several do),
 * as written, with `…` where other commands come before or after it:
 * `python3 - <<EOF … EOF && bun test` reads `… bun test`.
 */
export function recognized(command: string, re: RegExp): string | null {
  const all = parts(command);
  for (let i = all.length - 1; i >= 0; i--) {
    const p = all[i]!;
    if (re.exec([nameOf(p), ...p.words.slice(1)].join(" "))?.index !== 0) continue;
    return `${i > 0 ? "… " : ""}${p.text}${i < all.length - 1 ? " …" : ""}`;
  }
  return null;
}

/** Only reads, or is meme itself: nothing a new agent needs to know was run. */
export function onlyReads(command: string): boolean {
  return parts(command).every((p) => {
    // Writing a file with `>` is not reading, whatever the command.
    const bare = p.text.replace(/'[^']*'|"(?:[^"\\]|\\.)*"/g, "").replace(/\d*>&\d+|&?\d*>>?\s*\/dev\/null/g, "");
    if (bare.includes(">")) return false;
    const ws = p.words;
    const name = nameOf(p);
    if (/^meme(?:\.exe|-[\w-]+)?$/.test(name)) return true;
    // sed edits files only with -i (also -i.bak, -Ei, --in-place).
    if (name === "sed") return !ws.slice(1).some((w) => /^-[A-Za-z]*i/.test(w) || w.startsWith("--in-place"));
    // sort writes a file with -o (also -uo, -o<file>, --output).
    if (name === "sort") return !ws.slice(1).some((w) => /^-[A-Za-z]*o/.test(w) || w.startsWith("--output"));
    if (name === "git") {
      const rest = ws.slice(1);
      while (rest.length && rest[0]!.startsWith("-")) rest.splice(0, ["-C", "-c"].includes(rest[0]!) ? 2 : 1);
      return GIT_READS.has(rest[0] ?? "");
    }
    return READS.has(name);
  });
}

function clip(s: string, max: number): string {
  return s.length <= max ? s : s.slice(0, max - 1) + "…";
}

function resultOf(t: Turn, call: ParsedCall): Rec | undefined {
  return t.records.find((r) => r.body.role === "tool" && r.body.tool_call_id === call.id);
}

/**
 * `ok`, `✗ exit 1`, or `no result`. When the record has output but no verdict,
 * its first line: an agent's script tool can report a finished script even when
 * the command inside it failed.
 */
export function outcome(result: Rec | undefined): string {
  if (!result || result.body.role !== "tool") return "no result";
  const content = contentOf(result.body) ?? "";
  const code = exitCodeOf(content);
  if (resultFailed(result.body.ok, content)) return code !== null ? `✗ exit ${code}` : "✗ failed";
  if (result.body.ok === true || code === 0) return "ok";
  const first = resultText(content).split("\n").find((l) => l.trim());
  return first ? `(no exit code) ${clip(oneLine(first), 100)}` : "(no exit code, no output)";
}

/** The last commands outside the turns listed step by step: lines to print, and how many older ones are not. */
export function recentCommands(turns: Turn[], listed: Set<number>): { lines: string[]; older: number } {
  const all: string[] = [];
  for (const t of turns) {
    if (listed.has(t.n)) continue;
    for (const rec of t.records) {
      if (rec.injected) continue;
      for (const call of callsOf(rec.body)) {
        const command = commandOf(call);
        if (!command || onlyReads(command)) continue;
        all.push(`- turn ${t.n}: \`${clip(oneLine(command), COMMAND_CHARS)}\` → ${outcome(resultOf(t, call))}`);
      }
    }
  }
  return { lines: all.slice(-MAX), older: Math.max(0, all.length - MAX) };
}
