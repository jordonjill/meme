import { forget } from "../../memory/apply";
import { readAll } from "../../memory/evidence";
import { LockTimeout } from "../../memory/lock";
import { storeDir } from "../../memory/place";
import { entriesIn, memoryPaths, NewerFormat, shelvesIn, type Placed } from "../../memory/store";
import { currentPlatform, displayPath } from "../../platform/paths";
import { plural } from "../../render/text";
import { isReadOnlyError } from "../../store/db";
import { CommandError, parse, UsageError } from "../args";
import { agreed, write } from "../context";
import { update } from "./memory-update";

export const memoryHelp = `Usage: meme memory [show <id> | forget <id> [--yes] | update [--dry-run] [--all] [--session <id>]]

What meme remembers: what you gave it with \`meme remember\`, what an agent
kept for you, and what was read out of your sessions.

  (no argument)   every entry, file by file
  show <id>       one entry with the evidence it rests on
  forget <id>     remove an entry for good, with the evidence only it rests
                  on; asks first ([y/N]), --yes skips the question
  update          read the sessions that have been quiet for 2 hours and are
                  not read yet: a model says what is worth keeping, and meme
                  keeps what rests on words that are really in the session.
                  This sends the text of those sessions to the model set up
                  in ~/.meme/config.json; without one nothing is sent.
      --dry-run   list what would be read and sent, and send nothing
      --all       also sessions that ended over 14 days ago and were never read
      --session   read this session only, quiet or not

An id can be shortened to any unique prefix.
`;

/** The first heading of a conclusion file, and for a project's file what the project is. */
export function titleOf(preamble: string, fallback: string): string {
  const title = /^# (.+)$/m.exec(preamble)?.[1] ?? fallback;
  const project = /^Project: (.+)$/m.exec(preamble)?.[1];
  return project ? `${title} (${project})` : title;
}

/** The entry an id or the start of one names; says so when none or several do. */
export function resolveEntry(entries: Placed[], arg: string): Placed {
  const id = arg.toLowerCase().startsWith("m-") ? arg.toLowerCase() : `m-${arg.toLowerCase()}`;
  const found = entries.filter((e) => e.entry.id.startsWith(id));
  if (found.length === 1) return found[0]!;
  if (!found.length) throw new CommandError(`no entry ${arg} in memory; \`meme memory\` lists them`);
  throw new CommandError(`${arg} matches ${found.length} entries: ${found.map((e) => e.entry.id).join(", ")}`);
}

/** An entry with the evidence it rests on: what was said, when, and where. */
export function entryText(at: Placed, evidenceDir: string, home: string): string {
  const e = at.entry;
  const lines = [`${e.id}  ${e.text}`, `  ${e.kind}, for ${e.agents === "all" ? "all agents" : e.agents}; ${e.basis}; ${e.status}`, `  in ${displayPath(at.file, home)}`];
  if (e.when) lines.push(`  when: ${e.when}`);
  if (e.why) lines.push(`  why: ${e.why}`);
  if (e.replaces) lines.push(`  replaces ${e.replaces}`);
  if (e.replacedBy) lines.push(`  replaced by ${e.replacedBy}`);
  lines.push("", "Evidence");
  const all = new Map(readAll(evidenceDir).map((x) => [x.id, x]));
  for (const id of e.evidence) {
    const x = all.get(id);
    if (!x) {
      lines.push(`  ${id}  (no longer in the evidence files)`);
      continue;
    }
    lines.push(`  ${x.id}  ${x.day} ${x.time}  ${x.label || x.source}`, `    ${x.content}`);
    if (x.quote) lines.push(`    > ${x.quote}`);
  }
  if (!e.evidence.length) lines.push("  (none)");
  return lines.join("\n") + "\n";
}

export async function memory(argv: string[]): Promise<number> {
  const { values, positionals } = parse(argv, { yes: { type: "boolean" }, "dry-run": { type: "boolean" }, all: { type: "boolean" }, session: { type: "string" }, help: { type: "boolean", short: "h" } });
  if (values.help) {
    write(memoryHelp);
    return 0;
  }
  const [action, arg, ...more] = positionals;
  if (action !== undefined && action !== "show" && action !== "forget" && action !== "update") throw new UsageError(`memory does not know ${action}; it takes show <id>, forget <id> or update`);
  if (action !== "update" && (values["dry-run"] || values.all || values.session !== undefined)) throw new UsageError("--dry-run, --all and --session go with update");
  if (values.yes && action !== "forget") throw new UsageError("--yes goes with forget");
  if (action === "update") {
    if (arg) throw new UsageError(`too many arguments: ${[arg, ...more].join(" ")}`);
    return update({ dryRun: Boolean(values["dry-run"]), all: Boolean(values.all), session: values.session });
  }
  if (action && !arg) throw new UsageError(`memory ${action} needs an entry's id; \`meme memory\` lists them`);
  if (more.length) throw new UsageError(`too many arguments: ${more.join(" ")}`);

  const platform = currentPlatform();
  const home = platform.home;
  const store = storeDir(platform);
  const p = memoryPaths(store);

  if (!action) {
    const shelves = shelvesIn(p.memory).filter((s) => s.entries.length);
    if (!shelves.length) {
      write('Nothing remembered yet. `meme remember "…"` keeps a rule or a fact.\n');
      return 0;
    }
    const lines: string[] = [];
    for (const s of shelves) {
      if (lines.length) lines.push("");
      lines.push(`${titleOf(s.preamble, s.shelf.file)}  ${displayPath(s.file, home)}`);
      for (const e of s.entries) lines.push(`  ${e.id}  ${e.text}${e.status === "active" ? "" : `  [${e.status}]`}`);
    }
    write(lines.join("\n") + "\n");
    return 0;
  }

  const entries = entriesIn(p.memory);
  const at = resolveEntry(entries, arg!);
  const e = at.entry;

  if (action === "show") {
    write(entryText(at, p.evidence, home));
    return 0;
  }

  // forget
  const others = new Set(entries.filter((x) => x.entry.id !== e.id).flatMap((x) => x.entry.evidence));
  const own = e.evidence.filter((id) => !others.has(id)).length;
  write(`This removes for good:\n  ${e.id}  ${e.text}\n  and ${plural(own, "piece")} of evidence that only it rests on.\n`);
  if (!values.yes) {
    if (!process.stdin.isTTY || !process.stdout.isTTY) {
      process.stderr.write("meme: nothing forgotten. Forgetting needs the user's confirmation: run it in a terminal, or add --yes only if the user has explicitly asked to forget this.\n");
      return 1;
    }
    if (!agreed("Forget it?")) {
      write("Nothing forgotten.\n");
      return 1;
    }
  }
  try {
    await forget(store, e.id);
  } catch (err) {
    if (err instanceof NewerFormat || err instanceof LockTimeout) throw new CommandError(`${err.message}; nothing was forgotten`);
    if (isReadOnlyError(err)) throw new CommandError(`meme cannot write its memory here (${displayPath(store, home)} cannot be written); nothing was forgotten`);
    throw err;
  }
  write(`Forgotten ${e.id}. It will not be learned again from your sessions; \`meme remember\` brings it back.\n`);
  return 0;
}
