import { statSync } from "node:fs";
import pkg from "../../../package.json";
import { displayPath } from "../../platform/paths";
import { label } from "../../render/labels";
import { ago, padEnd, plural, size, when } from "../../render/text";
import { getMeta } from "../../store/db";
import { counts, sources } from "../../store/queries";
import { parse, UsageError } from "../args";
import { createContext, write } from "../context";

export const statusHelp = `Usage: meme status

Show the version, where the data lives, and which session sources can be read.
`;

export async function status(argv: string[]): Promise<number> {
  const { values, positionals } = parse(argv, { plain: { type: "boolean" }, help: { type: "boolean", short: "h" } });
  if (values.help) {
    write(statusHelp);
    return 0;
  }
  if (positionals.length) throw new UsageError(`status takes no arguments, got ${positionals[0]}`);
  const ctx = createContext();
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
    `Data:         ${memory ? "in memory (no database file could be written)" : displayPath(file, home) + dbSize}`,
    `Mode:         ${readonly ? "read-only mode: sessions are not imported, the data may be out of date" : "read-write"}`,
    `Mirror:       ${plural(c.sessions, "session")}, ${plural(c.records, "record")}`,
    `Last import:  ${last ? `${when(last, new Date(ctx.now))} (${ago(last, ctx.now)})` : "never"}` +
      (ctx.imported ? `; this run checked ${plural(ctx.imported.scanned, "file")} in ${Math.round(ctx.imported.ms)} ms` : ""),
    "Sources:",
  ];
  const rows = sources(db);
  const w = Math.max(0, ...rows.map((r) => displayPath(r.root, home).length));
  for (const r of rows) {
    lines.push(`  ${padEnd(label(r.agent, r.env), 9)} ${padEnd(displayPath(r.root, home), w)}  ${r.reachable ? "readable" : "NOT READABLE (nothing deleted)"}  ${plural(r.sessions, "session")}`);
  }
  if (rows.length === 0) lines.push("  (none found)");
  write(lines.join("\n") + "\n");
  return 0;
}
