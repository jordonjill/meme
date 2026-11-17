import { forget } from "../../memory/apply";
import { LockTimeout } from "../../memory/lock";
import { storeDir } from "../../memory/place";
import { entryText, resolveEntry } from "../../memory/show";
import { entriesIn, memoryPaths, NewerFormat, shelvesIn, type Placed } from "../../memory/store";
import { currentPlatform, displayPath } from "../../platform/paths";
import { plural } from "../../render/text";
import { isReadOnlyError } from "../../store/db";
import { CommandError, parse, UsageError } from "../args";
import { agreed, write } from "../context";
import { digestCommand } from "./memory-digest";
import { exclude } from "./memory-exclude";
import { update } from "./memory-update";

export const memoryHelp = `Usage: meme memory [show <id> | forget <id> [--yes] | update [--dry-run] [--all] [--session <id>] | digest [--all] | exclude [<project>] [--remove]]

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
                  with \`meme model\`; without one nothing is sent.
      --dry-run   list what would be read and sent, and send nothing
      --all       also sessions that ended over 14 days ago and were never read
      --session   read this session only, quiet or not
  digest          what memory gained, replaced and left out since you last
                  looked; --all also lists what was not kept
  exclude         list the projects whose sessions are never sent to the model;
                  with a folder (. for the current one) or a remote's address,
                  add it; with --remove, take it off the list

An id can be shortened to any unique prefix.
`;

/** The first heading of a conclusion file, and for a project's file what the project is. */
export function titleOf(preamble: string, fallback: string): string {
  const title = /^# (.+)$/m.exec(preamble)?.[1] ?? fallback;
  const project = /^Project: (.+)$/m.exec(preamble)?.[1];
  return project ? `${title} (${project})` : title;
}

export async function memory(argv: string[]): Promise<number> {
  const { values, positionals } = parse(argv, { yes: { type: "boolean" }, "dry-run": { type: "boolean" }, all: { type: "boolean" }, session: { type: "string" }, remove: { type: "boolean" }, background: { type: "boolean" }, help: { type: "boolean", short: "h" } });
  if (values.help) {
    write(memoryHelp);
    return 0;
  }
  const [action, arg, ...more] = positionals;
  if (action !== undefined && !["show", "forget", "update", "digest", "exclude"].includes(action)) throw new UsageError(`memory does not know ${action}; it takes show <id>, forget <id>, update, digest or exclude`);
  if (action === "digest") {
    if (arg) throw new UsageError(`too many arguments: ${[arg, ...more].join(" ")}`);
    return digestCommand({ all: Boolean(values.all) });
  }
  if (values.remove && action !== "exclude") throw new UsageError("--remove goes with exclude");
  if (action === "exclude") {
    if (more.length) throw new UsageError(`too many arguments: ${more.join(" ")}`);
    if (values.remove && !arg) throw new UsageError("exclude --remove needs the project to take off the list");
    return exclude({ target: arg, remove: Boolean(values.remove) });
  }
  if (action !== "update" && (values["dry-run"] || values.session !== undefined)) throw new UsageError("--dry-run and --session go with update");
  if (values.all && action !== "update" && action !== "digest") throw new UsageError("--all goes with update or digest");
  if (values.yes && action !== "forget") throw new UsageError("--yes goes with forget");
  if (action === "update") {
    if (arg) throw new UsageError(`too many arguments: ${[arg, ...more].join(" ")}`);
    return update({ dryRun: Boolean(values["dry-run"]), all: Boolean(values.all), session: values.session, background: Boolean(values.background) });
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
