import { statSync } from "node:fs";
import pkg from "../../../package.json";
import { sourceTrouble } from "../../adapters";
import { displayPath } from "../../platform/paths";
import { wslPlace } from "../../platform/wsl";
import { agentName, label } from "../../render/labels";
import { ago, padEnd, plural, size, when } from "../../render/text";
import { getMeta } from "../../store/db";
import { counts, failures, inSeveralSources, sources, unknownTypes, unreadByVersion } from "../../store/queries";
import { parse, UsageError } from "../args";
import { createContext, stoppedNotice, write } from "../context";

export const statusHelp = `Usage: meme status

Show the version, where the data lives, which session sources can be read,
which sessions meme cannot read, and record types it does not know. Attach this
when you report a problem: it has the agents' versions.
`;

export async function status(argv: string[]): Promise<number> {
  const { values, positionals } = parse(argv, { help: { type: "boolean", short: "h" } });
  if (values.help) {
    write(statusHelp);
    return 0;
  }
  if (positionals.length) throw new UsageError(`status takes no arguments, got ${positionals[0]}`);
  const ctx = await createContext();
  const { db, file, readonly, memory } = ctx.store;
  const home = ctx.platform.home;
  let dbSize = "";
  try {
    dbSize = ` (${size(statSync(file).size)})`;
  } catch {}
  const c = counts(db);
  const last = getMeta(db, "last_import");
  const lines = [
    `meme ${pkg.version}`,
    `Environment:  ${ctx.platform.env}`,
    `Data:         ${displayPath(file, home)}${dbSize}${memory ? (dbSize ? ", read into memory" : " cannot be written; working in memory") : ""}`,
    `Mode:         ${readonly ? "read-only mode: nothing is written; sessions are imported into memory for this run" : "read-write"}`,
    `Mirror:       ${plural(c.sessions, "session")}, ${plural(c.records, "record")}`,
    `Last import:  ${last ? `${when(last, new Date(ctx.now))} (${ago(last, ctx.now)})` : "never"}` +
      (ctx.imported ? `; this run checked ${plural(ctx.imported.scanned, "file")} in ${Math.round(ctx.imported.ms)} ms` : ""),
    "Sources:",
  ];
  const rows = sources(db);
  const lw = Math.max(0, ...rows.map((r) => label(r.agent, r.env).length));
  const w = Math.max(0, ...rows.map((r) => displayPath(r.root, home).length));
  // A stopped WSL distribution is not opened (that would start it): its sources are as of the last run.
  const stopped = new Set(ctx.wslStopped.map((d) => d.distro));
  for (const r of rows) {
    const place = r.env === "wsl" ? wslPlace(ctx.platform, r.root) : null;
    const state = place && stopped.has(place.distro) ? "not running" : r.reachable ? "readable" : sourceTrouble(r);
    lines.push(`  ${padEnd(label(r.agent, r.env), lw)}  ${padEnd(displayPath(r.root, home), w)}  ${state}  ${plural(r.sessions, "session")}`);
  }
  if (rows.length === 0) lines.push("  (none found)");
  // The same session read from two places (a copied home folder): one is shown (plan §6 ⑪, F10).
  const several = inSeveralSources(db);
  if (several) lines.push(`  ${plural(several, "session")} ${several === 1 ? "is" : "are"} in more than one source: meme shows the copy written last, and \`meme forget\` deletes every copy.`);
  const notice = stoppedNotice(ctx.wslStopped, ctx.now);
  if (notice) lines.push(`  ${notice}`);

  // Agent upgrades (arch.md §6.1): files meme cannot convert, and record types it does not know.
  const failed = failures(db);
  lines.push(failed.length ? `Can't read:   ${plural(new Set(failed.map((f) => f.session)).size, "session")}; meme lists them, with what it read before if anything` : "Can't read:   none");
  const fw = Math.max(0, ...failed.map((f) => displayPath(f.path, home).length));
  for (const f of failed) {
    const extra = [f.version ? `${agentName(f.agent)} ${f.version}` : null, f.as_of ? `shown as of ${when(f.as_of, new Date(ctx.now))}` : "never read"].filter(Boolean).join("; ");
    lines.push(`  ${padEnd(label(f.agent, f.env), lw)}  ${padEnd(f.short, 8)}  ${padEnd(displayPath(f.path, home), fw)}  ${f.error} (${extra})`);
  }
  const unknown = unknownTypes(db);
  const unread = unreadByVersion(db, "unread");
  if (!unknown.length && !unread.length) lines.push("Record types: all known and read");
  else {
    lines.push("Record types: some meme doesn't know or can't read (a new agent version?):");
    const groups = new Map<string, typeof unknown>();
    for (const u of unknown) {
      const k = `${agentName(u.agent)} ${u.version || "(version unknown)"}`;
      (groups.get(k) ?? groups.set(k, []).get(k)!).push(u);
    }
    for (const [who, list] of groups) {
      lines.push(`  ${who} writes record types meme doesn't know: ${list.map((u) => `${u.type} (${plural(u.sessions, "session")})`).join(", ")}`);
    }
    // The second layer (plan §6 ⑦.1): types meme knows, lines that became nothing.
    for (const u of unread) {
      lines.push(`  ${agentName(u.agent)} ${u.version || "(version unknown)"}: ${plural(u.lines, "record")} of known types meme couldn't read (${u.types.split(",").join(", ")}; ${plural(u.sessions, "session")})`);
    }
  }
  write(lines.join("\n") + "\n");
  return 0;
}
