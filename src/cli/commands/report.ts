import { existsSync, readFileSync, statSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import pkg from "../../../package.json";
import { ADAPTERS, adapterFor } from "../../adapters";
import { NOT_JSON } from "../../adapters/read";
import type { SourceRoot } from "../../adapters/types";
import { endingOf, groupTurns } from "../../model/turns";
import { redactText } from "../../redact/rules";
import { agentName, ENV_SHORT } from "../../render/labels";
import { displayPath } from "../../platform/paths";
import { padEnd, plural, size } from "../../render/text";
import { SCHEMA_VERSION } from "../../store/db";
import { allSessions, resolveSession, sessionFiles, sessionRecords, unknownIn, type SessionRow } from "../../store/queries";
import { parse, UsageError } from "../args";
import { createContext, write, type Context } from "../context";
import { statusLines } from "./status";

export const reportHelp = `Usage: meme report [--session <id>]

Print a report to paste into an issue: meme's version, the system, the
agents' versions, everything \`meme status\` says, and the latest errors and
slow runs in meme's log. It holds no conversation content, and your home
folder, user names and project paths are masked. Read it before you paste it.

  --session <id>   also that session's structure: its kinds of lines with
                   their field names, its size and turns; none of what it says
`;

/** Errors and slow runs from the log, the newest last (arch.md 6.5). */
const LOG_ENTRIES = 20;
/** Lines of one entry: its first, and the top of a stack trace. */
const ENTRY_LINES = 8;

export async function report(argv: string[]): Promise<number> {
  const { values, positionals } = parse(argv, { session: { type: "string" }, help: { type: "boolean", short: "h" } });
  if (values.help) {
    write(reportHelp);
    return 0;
  }
  if (positionals.length) throw new UsageError(`report takes no arguments, got ${positionals[0]}; for a session, use --session <id>`);
  const ctx = await createContext();
  const one = values.session ? resolveSession(ctx.store.db, values.session) : null;
  const lines = [
    "This report holds no conversation content. Read it before you paste it.",
    "",
    `meme:         ${pkg.version} (schema ${SCHEMA_VERSION})`,
    `System:       ${os.platform()} ${os.arch()}, ${os.release()}`,
    `Agents:       ${agentVersions(ctx).join(", ") || "none found"}`,
    "",
    ...statusLines(ctx),
    "",
    `Recent errors and slow runs (newest last):`,
    ...logEntries(ctx),
  ];
  if (one) lines.push("", ...structure(ctx, one));
  write(masker(ctx)(lines.join("\n")) + "\n");
  return 0;
}

/** Every root meme reads here, to find a source's own. */
function rootsOf(ctx: Context): SourceRoot[] {
  return ADAPTERS.flatMap((a) => a.roots(ctx.platform));
}

/** Each source's agent version, from its newest session: `Claude Code 2.1.308 (WSL)`. */
function agentVersions(ctx: Context): string[] {
  const roots = rootsOf(ctx);
  const out: string[] = [];
  for (const src of ctx.store.db.query<{ id: string }, []>("SELECT id FROM sources ORDER BY agent, env, root").all()) {
    const root = roots.find((r) => r.id === src.id);
    // The newest that says its version: one meme cannot read says none.
    const newest = ctx.store.db
      .query<{ id: string }, [string]>("SELECT s.id FROM sessions s WHERE EXISTS (SELECT 1 FROM files f WHERE f.session = s.id AND f.source = ?) ORDER BY s.ended_at DESC LIMIT 5")
      .all(src.id);
    if (!root || !newest.length) continue;
    const version = newest.map((s) => peekVersion(root, s.id, ctx)).find((v) => v !== null) ?? null;
    out.push(`${agentName(root.agent)} ${version ?? "(version unknown)"} (${ENV_SHORT[root.env]})`);
  }
  return out;
}

function peekVersion(root: SourceRoot, id: string, ctx: Context): string | null {
  const files = ctx.store.db.query<{ path: string }, [string, string]>("SELECT path FROM files WHERE session = ? AND source = ? ORDER BY path").all(id, root.id).map((r) => r.path);
  try {
    return adapterFor(root.agent)?.peek(files, { sessionId: id, root, project: () => null, filesOf: () => files }).version ?? null;
  } catch {
    return null;
  }
}

/** The latest errors and slow runs in meme.log (and the file it rotated to), each cut to its first lines. */
function logEntries(ctx: Context): string[] {
  const dir = path.join(ctx.platform.dataDir, "logs");
  const entries: string[][] = [];
  for (const file of ["meme.log.1", "meme.log"].map((f) => path.join(dir, f))) {
    let text = "";
    try {
      text = readFileSync(file, "utf8");
    } catch {
      continue;
    }
    for (const line of text.split("\n")) {
      if (/^\d{4}-\d\d-\d\dT/.test(line)) entries.push([line]);
      else if (line && entries.length) entries.at(-1)!.push(line);
    }
  }
  const wanted = entries.filter((e) => / ERROR /.test(e[0]!) || / INFO slow: /.test(e[0]!)).slice(-LOG_ENTRIES);
  if (!wanted.length) return ["  none"];
  return wanted.flatMap((e) => e.slice(0, ENTRY_LINES).map((l) => `  ${l}`));
}

/** A session's shape, for a format problem: its lines' kinds and field names, never their values (arch.md 6.5). */
function structure(ctx: Context, s: SessionRow): string[] {
  const db = ctx.store.db;
  const files = sessionFiles(db, s.id);
  const bytes = files.reduce((n, f) => {
    try {
      return n + statSync(f.replace(/#[^\\/]*$/, "")).size;
    } catch {
      return n;
    }
  }, 0);
  const root = rootsOf(ctx).find((r) => files.some((f) => f.startsWith(r.path)));
  const out = [
    `Session ${s.short} (structure only)`,
    `Agent:        ${agentName(s.agent)} ${(root && peekVersion(root, s.id, ctx)) ?? "(version unknown)"} (${ENV_SHORT[s.env]})`,
    `Files:        ${files.length}, ${size(bytes)}`,
  ];
  const kinds = new Map<string, { n: number; fields: Set<string> }>();
  for (const f of files.filter((x) => x.endsWith(".jsonl") && existsSync(x))) {
    for (const line of readFileSync(f, "utf8").split("\n")) {
      if (!line.trim()) continue;
      let obj: Record<string, unknown> | null = null;
      try {
        const v: unknown = JSON.parse(line);
        if (v && typeof v === "object" && !Array.isArray(v)) obj = v as Record<string, unknown>;
      } catch {}
      const key = obj ? kindOf(obj) : NOT_JSON;
      const k = kinds.get(key) ?? kinds.set(key, { n: 0, fields: new Set() }).get(key)!;
      k.n++;
      if (obj) for (const f of fieldNames(obj)) k.fields.add(f);
    }
  }
  if (kinds.size) {
    out.push("Lines by kind (count, field names):");
    const w = Math.max(...[...kinds.keys()].map((k) => k.length));
    for (const [key, k] of [...kinds].sort((a, b) => b[1].n - a[1].n)) out.push(`  ${padEnd(key, w)}  ${String(k.n).padStart(5)}  ${[...k.fields].sort().join(", ")}`);
  } else out.push("Lines by kind: not a file of lines (kept in a database); see below what meme read");
  const records = sessionRecords(db, s.id);
  const roles = new Map<string, number>();
  for (const r of records) {
    const key = r.injected ? `${r.role} (${r.injected})` : r.role;
    roles.set(key, (roles.get(key) ?? 0) + 1);
  }
  const { turns } = groupTurns(records);
  out.push(
    `In meme:      ${plural(turns.length, "turn")}, ${plural(records.length, "record")} (${[...roles].map(([k, n]) => `${k} ${n}`).join(", ")}); last turn: ${endingOf(records)}`,
    `Alarms:       types it does not know: ${list(unknownIn(db, s.id, "unknown"))}; known types it could not read: ${list(unknownIn(db, s.id, "unread"))}`,
  );
  return out;
}

const list = (types: { type: string; count: number }[]) => (types.length ? types.map((t) => `${t.type} (${t.count})`).join(", ") : "none");

/** What kind of line: its `type`, with a `subtype`, a `payload.type` or a `message.role` other than the type when it has one. */
function kindOf(obj: Record<string, unknown>): string {
  const type = typeof obj.type === "string" ? obj.type : "(no type)";
  const role = (obj.message as { role?: unknown } | undefined)?.role;
  const sub = typeof obj.subtype === "string" ? obj.subtype : ((obj.payload as { type?: unknown } | undefined)?.type ?? (role !== type ? role : undefined));
  return typeof sub === "string" ? `${type}/${sub}` : type;
}

/** Field names, one level into an object field (`message.role`); never values. */
function fieldNames(obj: Record<string, unknown>): string[] {
  const out: string[] = [];
  for (const [k, v] of Object.entries(obj)) {
    out.push(k);
    if (v && typeof v === "object" && !Array.isArray(v)) for (const kk of Object.keys(v)) out.push(`${k}.${kk}`);
  }
  return out;
}

/**
 * Masks what would say who the user is or what they work on: project paths (as
 * written, and as Claude Code names a project's folder) become project-1,
 * project-2, …; the home folder becomes ~; names in user folders and the user's
 * name anywhere else become <user>; then the secrets the mirror redacts.
 */
function masker(ctx: Context): (text: string) => string {
  const projects = [...new Set(allSessions(ctx.store.db).map((s) => s.project).filter((p): p is string => Boolean(p && p.length > 1)))];
  const pairs: [string, string][] = [];
  projects.forEach((p, i) => {
    pairs.push([p, `project-${i + 1}`], [p.replace(/[^A-Za-z0-9]/g, "-"), `-project-${i + 1}`]);
  });
  pairs.sort((a, b) => b[0].length - a[0].length);
  // User names: the home folder's own, the variables that hold one, and those of Windows user folders meme reads from WSL.
  const vars = ctx.platform.vars;
  const users = ctx.platform.windowsUsersDir;
  const windowsUsers = users ? ctx.store.db.query<{ root: string }, []>("SELECT root FROM sources").all().map((r) => path.relative(users, r.root).split(/[\\/]/)[0]!) : [];
  const names = [...new Set([path.basename(ctx.platform.home), vars.USER, vars.USERNAME, ...windowsUsers].filter((n): n is string => Boolean(n && n.length >= 3 && !n.startsWith(".."))))];
  const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  // Where WSL finds the Windows user folders, as written and as shown under ~.
  const userDirs = users ? [users, displayPath(users, ctx.platform.home)].map((d) => new RegExp(`(${escape(d)}[\\\\/])(?!<user>)[^\\\\/\\s]+`, "g")) : [];
  return (text) => {
    let t = text;
    for (const [from, to] of pairs) t = t.split(from).join(to);
    for (const re of userDirs) t = t.replace(re, "$1<user>");
    t = t.split(ctx.platform.home).join("~");
    t = t.replace(/([\\/](?:home|Users)[\\/])(?!<user>)[^\\/\s'"`]+/gi, "$1<user>");
    for (const n of names) t = t.replace(new RegExp(`(?<![A-Za-z0-9])${escape(n)}(?![A-Za-z0-9])`, "g"), "<user>");
    return redactText(t);
  };
}
