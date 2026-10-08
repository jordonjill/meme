import type { Agent } from "../adapters/types";
import type { Env } from "../platform/env";
import { displayPath, samePath } from "../platform/paths";
import type { SessionRow } from "../store/queries";
import { coloredLabel, label, type Style } from "./labels";
import { ago, padEnd, size, truncate, width } from "./text";

export interface ListFilter {
  /** All projects instead of the current one. */
  all: boolean;
  project: string;
  agent?: Agent;
  env?: Env;
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
}

/** What `ls` lists: the current project, or all projects when it has nothing (plan §3.1). */
export function listing(rows: SessionRow[], f: ListFilter): Listing {
  const mine = listed(rows, f);
  if (mine.length || f.all) return { rows: mine, filter: f, fellBack: false };
  const all = { ...f, all: true };
  return { rows: listed(rows, all), filter: all, fellBack: true };
}

export function fallbackNotice(project: string, home: string): string {
  return `No sessions in ${displayPath(project, home)} — showing all projects`;
}

export interface LsTextOptions {
  home: string;
  now: number;
  st: Style;
  width: number;
}

/** Plain-text list, for agents and pipes (plan §3.1). */
export function lsText({ rows, filter, fellBack }: Listing, o: LsTextOptions): string {
  const where = filter.all ? "all projects" : displayPath(filter.project, o.home);
  if (rows.length === 0) return "No sessions found.\n";
  const cells = rows.map((r) => ({
    id: r.id.slice(0, 8),
    label: label(r.agent, r.env),
    labelColored: coloredLabel(o.st, r.agent, r.env),
    ago: ago(r.ended_at, o.now),
    branch: truncate(r.branch ?? "", 20),
    size: size(r.size),
    project: filter.all ? displayPath(r.project ?? "", o.home) : "",
    title: r.title ?? "(untitled)",
  }));
  const colW = (k: "label" | "ago" | "branch" | "size" | "project") => Math.max(...cells.map((c) => width(c[k])));
  const wLabel = colW("label");
  const wAgo = colW("ago");
  const wBranch = colW("branch");
  const wSize = colW("size");
  const wProject = Math.min(colW("project"), 40);
  const out = [fellBack ? fallbackNotice(filter.project, o.home) : `Sessions in ${where} (newest first):`];
  for (const c of cells) {
    let line = `  ${c.id}  ${c.labelColored}${" ".repeat(wLabel - width(c.label))}  ${padEnd(c.ago, wAgo)}  ${padEnd(c.branch, wBranch)}  ${padEnd(c.size, wSize)}  `;
    if (filter.all) line += padEnd(truncate(c.project, wProject), wProject) + "  ";
    const used = width(line.replace(/\x1b\[[0-9;]*m/g, ""));
    out.push(line + truncate(c.title, Math.max(20, o.width - used)));
  }
  out.push(
    filter.all
      ? "Run `meme show <id>` to view one."
      : "Run `meme show <id>` to view one, or `meme ls -a` for all projects.",
  );
  return out.join("\n") + "\n";
}
