import type { Agent } from "../adapters/types";
import type { Env } from "../platform/env";
import { displayPath, samePath } from "../platform/paths";
import type { SessionRow } from "../store/queries";
import { coloredLabel, label, type Style } from "./labels";
import { ago, padEnd, plural, shortPath, size, truncate, width } from "./text";

/** The project column of a list across projects: longer paths lose their middle. */
const PROJECT_COLS = 40;

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
      r.talked === 1 &&
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
}

/** What `ls` lists: the current project, or all projects when it has nothing (plan §3.1). */
export function listing(rows: SessionRow[], f: ListFilter): Listing {
  const mine = listed(rows, f);
  if (f.all) return { rows: mine, filter: f, fellBack: false, others: 0 };
  const all = { ...f, all: true };
  const everywhere = listed(rows, all);
  if (mine.length) return { rows: mine, filter: f, fellBack: false, others: everywhere.length - mine.length };
  return { rows: everywhere, filter: all, fellBack: true, others: 0 };
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
export function lsText({ rows, filter, fellBack, others }: Listing, o: LsTextOptions): string {
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
    archived: r.archived === 1,
  }));
  const colW = (k: "id" | "label" | "ago" | "branch" | "size" | "project") => Math.max(...cells.map((c) => width(c[k])));
  const wId = colW("id");
  const wLabel = colW("label");
  const wAgo = colW("ago");
  const wBranch = colW("branch");
  const wSize = colW("size");
  const wProject = colW("project");
  const out = [fellBack ? fallbackNotice(filter.project, o.home) : `Sessions in ${where} (newest first):`];
  for (const c of cells) {
    let line = `  ${padEnd(c.id, wId)}  ${c.labelColored}${" ".repeat(wLabel - width(c.label))}  ${padEnd(c.ago, wAgo)}  ${padEnd(c.branch, wBranch)}  ${padEnd(c.size, wSize)}  `;
    if (filter.all) line += padEnd(c.project, wProject) + "  ";
    const used = width(line.replace(/\x1b\[[0-9;]*m/g, ""));
    out.push(line + truncate(c.title, Math.max(20, o.width - used - (c.archived ? 11 : 0))) + (c.archived ? o.st.dim(" (archived)") : ""));
  }
  const hint = othersHint(others, "use -a");
  if (hint) out.push(hint);
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
 * `1  Codex·WSL  2h ago  <title>  01a11a65`, then the given last line.
 */
export function numberedText({ rows, filter, fellBack, others }: Listing, o: NumberedOptions): string {
  const where = filter.all ? "all projects" : displayPath(filter.project, o.home);
  if (rows.length === 0) return "No sessions found.\n";
  const cells = rows.map((r, i) => ({
    n: String(i + 1),
    label: label(r.agent, r.env),
    labelColored: coloredLabel(o.st, r.agent, r.env),
    ago: ago(r.ended_at, o.now),
    project: filter.all ? shortPath(displayPath(r.project ?? "", o.home), PROJECT_COLS) : "",
    title: truncate(r.title ?? "(untitled)", 48) + (r.archived ? " (archived)" : ""),
    id: r.short,
  }));
  const colW = (k: "n" | "label" | "ago" | "project" | "title") => Math.max(...cells.map((c) => width(c[k])));
  const [wN, wLabel, wAgo, wTitle] = [colW("n"), colW("label"), colW("ago"), colW("title")];
  const wProject = colW("project");
  const out = [o.heading ?? (fellBack ? fallbackNotice(filter.project, o.home) : `Sessions in ${where} (newest first):`)];
  for (const c of cells) {
    let line = `  ${o.numbered ? c.n.padStart(wN) + "  " : ""}${c.labelColored}${" ".repeat(wLabel - width(c.label))}  ${padEnd(c.ago, wAgo)}  `;
    if (filter.all) line += padEnd(c.project, wProject) + "  ";
    out.push(line + padEnd(c.title, wTitle) + "  " + c.id);
  }
  const hint = othersHint(others, o.allHint);
  if (hint) out.push(hint);
  if (o.footer) out.push(o.footer);
  return out.join("\n") + "\n";
}
