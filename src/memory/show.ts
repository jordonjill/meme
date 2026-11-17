import { displayPath } from "../platform/paths";
import { LookupError } from "../store/queries";
import { readAll } from "./evidence";
import type { Placed } from "./store";

/** Finding an entry by its id, and showing it with what it rests on: for `meme memory show` and for agents. */

/** The entry an id or the start of one names; says so when none or several do. */
export function resolveEntry(entries: Placed[], arg: string): Placed {
  const id = arg.toLowerCase().startsWith("m-") ? arg.toLowerCase() : `m-${arg.toLowerCase()}`;
  const found = entries.filter((e) => e.entry.id.startsWith(id));
  if (found.length === 1) return found[0]!;
  if (!found.length) throw new LookupError(`no entry ${arg} in memory; \`meme memory\` lists them`);
  throw new LookupError(`${arg} matches ${found.length} entries: ${found.map((e) => e.entry.id).join(", ")}`);
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
