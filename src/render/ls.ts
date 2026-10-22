import type { Agent } from "../adapters/types";
import type { Env } from "../platform/env";
import { displayPath, samePath } from "../platform/paths";
import type { SessionRow } from "../store/queries";
import { coloredLabel, label, type Style } from "./labels";
import { ago, padEnd, plural, shortPath, size, truncate, when, width } from "./text";

/** The project column of a list across projects: longer paths lose their middle. */
const PROJECT_COLS = 40;
/** Short of room, a title and then a project give way down to these (plan §6 ⑪, F13): off a terminal a line fits 119 columns. */
const MIN_TITLE = 12;
const MIN_PROJECT = 20;

/** The project column narrowed so a title of `minTitle` fits in `room` columns; `room` already counts the column at full width. */
function narrowProject(cells: { project: string }[], wProject: number, room: number, minTitle: number): number {
  if (room >= minTitle || !wProject) return wProject;
  const w = Math.max(MIN_PROJECT, wProject - (minTitle - room));
  for (const c of cells) c.project = shortPath(c.project, w);
  return Math.max(...cells.map((c) => width(c.project)));
}

export interface ListFilter {
  /** All projects instead of the current one. */
  all: boolean;
  project: string;
  agent?: Agent;
  env?: Env;
  /** The sessions running meme right now: not listed (plan §3.1). */
  exclude?: Set<string>;
  /** Only these sessions (the matches of a `meme continue` target). */
  only?: Set<string>;
}

/**
 * Sessions as `ls` shows them: a continuation chain shows only its newest session,
 * and sessions without any AI reply (only `/model`, say) are left out.
 */
export function listed(rows: SessionRow[], f: ListFilter): SessionRow[] {
  return rows.filter(
    (r) =>
      (r.talked === 1 || r.unreadable === 1) &&
      r.superseded === 0 &&
      !f.exclude?.has(r.id) &&
      (!f.only || f.only.has(r.id)) &&
      (f.all || (r.project !== null && samePath(r.project, f.project))) &&
      (!f.agent || r.agent === f.agent) &&
      (!f.env || r.env === f.env),
  );
}

export interface Listing {
  rows: SessionRow[];
  filter: ListFilter;
  /** The current project has no sessions, so all projects are shown instead. */
  fellBack: boolean;
  /** Sessions in other projects, when only the current project is shown (plan §3.1). */
  others: number;
  /** Sessions meme cannot read, in any project (arch.md §6.1, point 2). */
  unreadable?: number;
}

/** What `ls` lists: the current project, or all projects when it has nothing (plan §3.1). */
export function listing(rows: SessionRow[], f: ListFilter): Listing {
  const unreadable = rows.filter((r) => r.unreadable === 1).length;
  const mine = listed(rows, f);
  if (f.all) return { rows: mine, filter: f, fellBack: false, others: 0, unreadable };
  const all = { ...f, all: true };
  const everywhere = listed(rows, all);
  if (mine.length) return { rows: mine, filter: f, fellBack: false, others: everywhere.length - mine.length, unreadable };
  return { rows: everywhere, filter: all, fellBack: true, others: 0, unreadable };
}

/** After a title: "(archived)", "(can't read)", or "(can't read after 10-12 11:36)" when an older copy is shown. */
export function marks(r: SessionRow, now: number): string {
  const out: string[] = [];
  if (r.archived) out.push("archived");
  if (r.unreadable) out.push(r.readable_until ? `can't read after ${when(r.readable_until, new Date(now))}` : "can't read");
  return out.length ? ` (${out.join(", ")})` : "";
}

/** The line under a list when some sessions cannot be read. */
export function unreadableHint(n: number | undefined): string | null {
  return n ? `${plural(n, "session")} could not be read, see \`meme status\`` : null;
}

/** The line under a list of the current project's sessions, when other projects have some. */
export function othersHint(others: number, how: string): string | null {
  return others > 0 ? `+${plural(others, "session")} in other projects (${how})` : null;
}

export function fallbackNotice(project: string, home: string): string {
  return `No sessions in ${displayPath(project, home)} — showing all projects`;
}

export interface LsTextOptions {
  /** Replaces the default last line. */
  footer?: string;
  home: string;
  now: number;
  st: Style;
  width: number;
}

/** Plain-text list, for agents and pipes (plan §3.1). */
export function lsText({ rows, filter, fellBack, others, unreadable }: Listing, o: LsTextOptions): string {
  const where = filter.all ? "all projects" : displayPath(filter.project, o.home);
  if (rows.length === 0) return "No sessions found.\n";
  const cells = rows.map((r) => ({
    id: r.short,
    label: label(r.agent, r.env),
    labelColored: coloredLabel(o.st, r.agent, r.env),
    ago: ago(r.ended_at, o.now),
    branch: truncate(r.branch ?? "", 20),
    size: size(r.size),
    project: filter.all ? shortPath(displayPath(r.project ?? "", o.home), PROJECT_COLS) : "",
    title: r.title ?? "(untitled)",
    marks: marks(r, o.now),
  }));
  const colW = (k: "id" | "label" | "ago" | "branch" | "size" | "project") => Math.max(...cells.map((c) => width(c[k])));
  const wId = colW("id");
  const wLabel = colW("label");
  const wAgo = colW("ago");
  const wBranch = colW("branch");
  const wSize = colW("size");
  const wMarks = Math.max(...cells.map((c) => width(c.marks)));
  const fixed = 2 + wId + 2 + wLabel + 2 + wAgo + 2 + wBranch + 2 + wSize + 2;
  const full = colW("project");
  const wProject = narrowProject(cells, full, o.width - fixed - (full ? full + 2 : 0) - wMarks, MIN_TITLE);
  const out = [fellBack ? fallbackNotice(filter.project, o.home) : `Sessions in ${where} (newest first):`];
  for (const c of cells) {
    let line = `  ${padEnd(c.id, wId)}  ${c.labelColored}${" ".repeat(wLabel - width(c.label))}  ${padEnd(c.ago, wAgo)}  ${padEnd(c.branch, wBranch)}  ${padEnd(c.size, wSize)}  `;
    if (filter.all) line += padEnd(c.project, wProject) + "  ";
    const used = width(line.replace(/\x1b\[[0-9;]*m/g, ""));
    out.push(line + truncate(c.title, Math.max(MIN_TITLE, o.width - used - width(c.marks))) + o.st.dim(c.marks));
  }
  const hint = othersHint(others, "use -a");
  if (hint) out.push(hint);
  const bad = unreadableHint(unreadable);
  if (bad) out.push(bad);
  out.push(o.footer ?? "Run `meme continue <id>` to continue one.");
  return out.join("\n") + "\n";
}

export interface NumberedOptions extends LsTextOptions {
  /** Number the rows; a list of matches is named by id only. */
  numbered: boolean;
  /** Replaces the first line, e.g. for the matches of a target. */
  heading?: string;
  /** How to see the other projects, in the "+N sessions" line. */
  allHint: string;
}

/**
 * The list of `meme continue` for agents and pipes (plan §3.4):
 * `1  <Agent·Env>  2h ago  <title>  01a11a65`, then the given last line.
 */
export function numberedText({ rows, filter, fellBack, others, unreadable }: Listing, o: NumberedOptions): string {
  const where = filter.all ? "all projects" : displayPath(filter.project, o.home);
  if (rows.length === 0) return "No sessions found.\n";
  const cells = rows.map((r, i) => ({
    n: String(i + 1),
    label: label(r.agent, r.env),
    labelColored: coloredLabel(o.st, r.agent, r.env),
    ago: ago(r.ended_at, o.now),
    project: filter.all ? shortPath(displayPath(r.project ?? "", o.home), PROJECT_COLS) : "",
    title: r.title ?? "(untitled)",
    marks: marks(r, o.now),
    id: r.short,
  }));
  const colW = (k: "n" | "label" | "ago" | "project" | "marks" | "id") => Math.max(...cells.map((c) => width(c[k])));
  const [wN, wLabel, wAgo, wMarks, wId] = [colW("n"), colW("label"), colW("ago"), colW("marks"), colW("id")];
  // Titles up to 48 columns, fewer when the line would not fit (plan §6 ⑪, F13).
  const fixed = 2 + (o.numbered ? wN + 2 : 0) + wLabel + 2 + wAgo + 2 + 2 + wId;
  const full = colW("project");
  const room = o.width - fixed - (full ? full + 2 : 0) - wMarks;
  const wProject = narrowProject(cells, full, room, MIN_TITLE);
  const titleCols = Math.min(48, Math.max(MIN_TITLE, room + full - wProject));
  for (const c of cells) c.title = truncate(c.title, titleCols) + c.marks;
  const wTitle = Math.max(...cells.map((c) => width(c.title)));
  const out = [o.heading ?? (fellBack ? fallbackNotice(filter.project, o.home) : `Sessions in ${where} (newest first):`)];
  for (const c of cells) {
    let line = `  ${o.numbered ? c.n.padStart(wN) + "  " : ""}${c.labelColored}${" ".repeat(wLabel - width(c.label))}  ${padEnd(c.ago, wAgo)}  `;
    if (filter.all) line += padEnd(c.project, wProject) + "  ";
    out.push(line + padEnd(c.title, wTitle) + "  " + c.id);
  }
  const hint = othersHint(others, o.allHint);
  if (hint) out.push(hint);
  const bad = unreadableHint(unreadable);
  if (bad) out.push(bad);
  if (o.footer) out.push(o.footer);
  return out.join("\n") + "\n";
}
