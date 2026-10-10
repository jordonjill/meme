import type { Agent } from "../adapters/types";
import type { Context, Output } from "../cli/context";
import type { Env } from "../platform/env";
import { displayPath } from "../platform/paths";
import { coloredLabel, label } from "../render/labels";
import { fallbackNotice, listed, listing, othersHint, type ListFilter } from "../render/ls";
import { buildShow, endingLine, foldedTurn, headerLines, numberWidth, separatorLine, type ShowModel, type ShowOptions } from "../render/show";
import { ago, size, truncate, width } from "../render/text";
import { allSessions, type SessionRow } from "../store/queries";
import type { Key } from "./keys";
import { Tui, type View } from "./screen";
import { SessionView } from "./viewer";

interface Tab {
  name: string;
  env?: Env;
  agent?: Agent;
}

const ALL_TABS: Tab[] = [
  { name: "All" },
  { name: "WSL", env: "wsl" },
  { name: "Win", env: "win" },
  { name: "Mac", env: "mac" },
  { name: "Linux", env: "linux" },
  { name: "Claude", agent: "claude-code" },
  { name: "Codex", agent: "codex" },
];

/** Tabs worth showing: an environment or agent tab only when there is more than one of them. */
function tabsFor(rows: SessionRow[]): Tab[] {
  const envs = new Set(rows.map((r) => r.env));
  const agents = new Set(rows.map((r) => r.agent));
  return ALL_TABS.filter((t) => (!t.env && !t.agent) || (t.env && envs.size > 1 && envs.has(t.env)) || (t.agent && agents.size > 1 && agents.has(t.agent)));
}

/**
 * `meme ls` in a terminal, modeled on Claude Code's `/resume` (list.md §4): two
 * lines per session, type to search, Space to preview, Enter to open.
 */
export class PickerView implements View {
  private readonly rows: SessionRow[];
  private readonly tabs: Tab[];
  private tab = 0;
  private query = "";
  private sel = 0;
  private top = 0;
  private all: boolean;
  /** Set when the current project has no sessions and all projects are shown instead. */
  private notice: string | null = null;

  /**
   * `onPick` turns the list into a chooser (`meme continue`): Enter picks the
   * session instead of opening it.
   */
  constructor(
    private readonly tui: Tui,
    private readonly ctx: Context,
    private readonly out: Output,
    private readonly filter: ListFilter,
    private readonly onPick?: (row: SessionRow) => void,
  ) {
    this.rows = allSessions(ctx.store.db);
    const start = listing(this.rows, filter);
    this.all = start.filter.all;
    if (start.fellBack) this.notice = fallbackNotice(filter.project, ctx.platform.home);
    this.tabs = tabsFor(listed(this.rows, { ...filter, all: true }));
  }

  private visible(all = this.all): SessionRow[] {
    const t = this.tabs[this.tab]!;
    const rows = listed(this.rows, {
      ...this.filter,
      all,
      env: t.env ?? this.filter.env,
      agent: t.agent ?? this.filter.agent,
    });
    const q = this.query.toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => [r.title, r.project, r.branch, r.id].some((v) => v?.toLowerCase().includes(q)));
  }

  private keepSelection(before: SessionRow | undefined): void {
    const rows = this.visible();
    const i = before ? rows.findIndex((r) => r.id === before.id) : -1;
    this.sel = i >= 0 ? i : 0;
    this.top = 0;
  }

  render(rows: number, cols: number): string[] {
    const st = this.out.st;
    const list = this.visible();
    const where = this.all ? "all projects" : displayPath(this.filter.project, this.ctx.platform.home);
    const out = this.notice ? [st.yellow(` ${this.notice}`)] : [];
    out.push(` ${st.bold(this.onPick ? "Continue which session?" : "Sessions")} · ${where}  ${st.dim(`${list.length} shown`)}`);
    if (this.tabs.length > 1) out.push(" " + this.tabs.map((t, i) => (i === this.tab ? st.inverse(` ${t.name} `) : st.dim(` ${t.name} `))).join(" "));
    out.push(` ⌕ ${this.query ? this.query + "▏" : st.dim("Type to search…")}`);
    // Only this project is shown: say how many more there are elsewhere (plan §3.1).
    const hint = this.all ? null : othersHint(this.visible(true).length - list.length, "Ctrl+A");
    const bottom = rows - 1 - (hint ? 1 : 0);
    const listRows = bottom - out.length;
    const per = 2;
    const fit = Math.max(1, Math.floor(listRows / per));
    if (this.sel < this.top) this.top = this.sel;
    if (this.sel >= this.top + fit) this.top = this.sel - fit + 1;
    if (list.length === 0) {
      out.push("", st.dim(this.all ? "  No sessions." : "  No sessions in this project. Ctrl+A shows all projects."));
    }
    list.slice(this.top, this.top + fit).forEach((r, k) => {
      const i = this.top + k;
      const selected = i === this.sel;
      const lab = label(r.agent, r.env);
      const title = truncate(r.title ?? "(untitled)", cols - 6 - width(lab));
      out.push(`${selected ? st.cyan("❯ ") : "  "}${selected ? st.bold(title) : title}  ${coloredLabel(st, r.agent, r.env)}`);
      const facts = [ago(r.ended_at, this.ctx.now, true), r.branch, size(r.size), this.all ? displayPath(r.project ?? "", this.ctx.platform.home) : null];
      out.push("  " + st.dim(facts.filter(Boolean).join(" · ")));
    });
    while (out.length < bottom) out.push("");
    out.length = bottom;
    if (hint) out.push(" " + st.dim(hint));
    out.push(st.dim(`↑↓ select · Enter ${this.onPick ? "continue" : "open"} · Space preview · Ctrl+A ${this.all ? "this project" : "all projects"}${this.tabs.length > 1 ? " · Tab source" : ""} · Esc quit`));
    return out;
  }

  key(k: Key): void {
    const list = this.visible();
    const current = list[this.sel];
    switch (k.name) {
      case "down":
        this.sel = Math.min(this.sel + 1, Math.max(0, list.length - 1));
        return;
      case "up":
        this.sel = Math.max(0, this.sel - 1);
        return;
      case "pagedown":
        this.sel = Math.min(this.sel + 5, Math.max(0, list.length - 1));
        return;
      case "pageup":
        this.sel = Math.max(0, this.sel - 5);
        return;
      case "home":
        this.sel = 0;
        return;
      case "end":
        this.sel = Math.max(0, list.length - 1);
        return;
      case "enter":
        if (!current) return;
        if (this.onPick) this.onPick(current);
        else this.tui.push(new SessionView(this.tui, this.model(current), this.base()));
        return;
      case "space":
        if (current) this.tui.push(new PreviewView(this.tui, this.model(current), this.base(), this.onPick && (() => this.onPick!(current))));
        return;
      case "tab":
      case "backtab":
        this.tab = (this.tab + (k.name === "tab" ? 1 : this.tabs.length - 1)) % this.tabs.length;
        this.keepSelection(current);
        return;
      case "ctrl":
        if (k.ch === "a") {
          this.all = !this.all;
          this.notice = null;
          this.keepSelection(current);
        }
        return;
      case "backspace":
        this.query = this.query.slice(0, -1);
        this.keepSelection(current);
        return;
      case "esc":
        if (this.query) {
          this.query = "";
          this.keepSelection(current);
        } else this.tui.quit();
        return;
      case "char":
        this.query += k.ch;
        this.keepSelection(current);
        return;
    }
  }

  private model(r: SessionRow): ShowModel {
    return buildShow(this.ctx.store.db, r);
  }

  private base(): Omit<ShowOptions, "width" | "wrap"> {
    return { st: this.out.st, home: this.ctx.platform.home, now: this.ctx.now, full: false, all: false };
  }
}

/** Space in the list: the session's turns, scrolled to where it ended. */
export class PreviewView implements View {
  private top: number | null = null;
  private rows = 24;
  private total = 0;

  constructor(
    private readonly tui: Tui,
    private readonly m: ShowModel,
    private readonly base: Omit<ShowOptions, "width" | "wrap">,
    /** In `meme continue`, Enter picks this session instead of opening it. */
    private readonly onPick?: () => void,
  ) {}

  render(rows: number, cols: number): string[] {
    this.rows = rows;
    const o: ShowOptions = { ...this.base, width: cols, wrap: true };
    const head = [...headerLines(this.m, o), o.st.yellow(endingLine(this.m, o)), o.st.dim("─".repeat(cols))];
    const body: string[] = [];
    const numW = numberWidth(this.m);
    for (const t of this.m.turns) {
      const from = this.m.separators.get(t.n);
      if (from) body.push(separatorLine(from, o));
      body.push(...foldedTurn(t, numW, o));
    }
    this.total = body.length;
    const room = rows - head.length - 1;
    const max = Math.max(0, body.length - room);
    this.top = this.top === null ? max : Math.max(0, Math.min(this.top, max));
    const out = [...head, ...body.slice(this.top, this.top + room)];
    while (out.length < rows - 1) out.push("");
    out.push(o.st.dim(`↑↓ scroll · Enter ${this.onPick ? "continue" : "open"} · Space/Esc back`));
    return out;
  }

  key(k: Key): void {
    const page = Math.max(1, this.rows - 6);
    if (k.name === "down") this.top = (this.top ?? 0) + 1;
    else if (k.name === "up") this.top = Math.max(0, (this.top ?? 0) - 1);
    else if (k.name === "pagedown") this.top = (this.top ?? 0) + page;
    else if (k.name === "pageup") this.top = Math.max(0, (this.top ?? 0) - page);
    else if (k.name === "home") this.top = 0;
    else if (k.name === "end") this.top = this.total;
    else if (k.name === "enter") {
      this.tui.pop();
      if (this.onPick) this.onPick();
      else this.tui.push(new SessionView(this.tui, this.m, this.base));
    } else if (k.name === "space" || k.name === "esc" || (k.name === "char" && k.ch === "q")) this.tui.pop();
  }
}

export async function runPicker(ctx: Context, out: Output, filter: ListFilter): Promise<number> {
  const tui = new Tui();
  await tui.run(new PickerView(tui, ctx, out, filter));
  return 0;
}
