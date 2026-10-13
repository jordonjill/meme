import { PROFILES } from "../adapters/profiles";
import type { Agent } from "../adapters/types";
import { stoppedNotice, type Context, type Output } from "../cli/context";
import type { Env } from "../platform/env";
import { displayPath } from "../platform/paths";
import { coloredLabel, ENV_SHORT, label } from "../render/labels";
import { fallbackNotice, listed, listing, marks, othersHint, unreadableHint, type ListFilter } from "../render/ls";
import { buildShow, endingLine, foldedTurn, headerLines, numberWidth, separatorLine, type ShowModel, type ShowOptions } from "../render/show";
import { ago, padEnd, shortPath, size, truncate, width, wrapParts } from "../render/text";
import { allSessions, type SessionRow } from "../store/queries";
import type { Key } from "./keys";
import { Tui, wrapLine, type View } from "./screen";
import { SessionView } from "./viewer";

/** One row of filters above the list: a platform or an agent, or All. */
interface FilterRow<T> {
  name: string;
  values: (T | null)[];
  at: number;
}

/** What the list's search matches; what was said is `meme search`. */
const PLACEHOLDER = "Search titles, projects, branches, ids…";
const ENV_ORDER: Env[] = ["wsl", "win", "mac", "linux"];
/** At most this wide, a project path in the list: longer ones lose their middle. */
const PATH_COLS = 40;
const AGENT_ORDER: Agent[] = PROFILES.map((p) => p.agent);
const ENV_NAME = ENV_SHORT;
const AGENT_NAME = Object.fromEntries(PROFILES.map((p) => [p.agent, p.short])) as Record<Agent, string>;

/** A filter row only when there is more than one value to tell apart (plan §3.1). */
function filterRow<T extends string>(name: string, present: Set<T>, order: T[], start: T | undefined): FilterRow<T> | null {
  if (present.size < 2) return null;
  const values: (T | null)[] = [null, ...order.filter((v) => present.has(v))];
  return { name, values, at: Math.max(0, values.indexOf(start ?? null)) };
}

/** `meme continue` and `meme forget` turn the list into a chooser: Enter picks the session. */
export interface Pick {
  /** The first line, e.g. "Continue which session?". */
  title: string;
  /** What Enter does, in the keys line. */
  verb: string;
  onPick: (row: SessionRow) => void;
  /** Said in place of when a session was last active, e.g. "open now". */
  note?: (row: SessionRow) => string | null;
}

/**
 * `meme ls` in a terminal, modeled on the agents' own session pickers (list.md §4): two
 * lines per session, type to search, Space to preview, Enter to open. Above the
 * list, a row of platforms and a row of agents when there is more than one:
 * ←→ change the row in focus, Tab moves between the rows. With all platforms
 * shown, the sessions are grouped by platform (plan §3.1).
 */
export class PickerView implements View {
  private readonly rows: SessionRow[];
  private readonly platforms: FilterRow<Env> | null;
  private readonly agents: FilterRow<Agent> | null;
  /** 0: the first filter row shown, 1: the second. */
  private focus = 0;
  private query = "";
  private sel = 0;
  /** First line of the list on screen. */
  private top = 0;
  /** Where the search input ends, for the terminal's cursor. */
  private input: { row: number; col: number } | null = null;
  private all: boolean;
  /** Set when the current project has no sessions and all projects are shown instead. */
  private notice: string | null = null;

  constructor(
    private readonly tui: Tui,
    private readonly ctx: Context,
    private readonly out: Output,
    private readonly filter: ListFilter,
    private readonly pick?: Pick,
  ) {
    this.rows = allSessions(ctx.store.db);
    const start = listing(this.rows, filter);
    this.all = start.filter.all;
    if (start.fellBack) this.notice = fallbackNotice(filter.project, ctx.platform.home);
    const everywhere = listed(this.rows, { ...filter, all: true });
    this.platforms = filterRow("Platform", new Set(everywhere.map((r) => r.env)), ENV_ORDER, filter.env);
    this.agents = filterRow("Agent", new Set(everywhere.map((r) => r.agent)), AGENT_ORDER, filter.agent);
  }

  private filterRows(): FilterRow<string>[] {
    return [this.platforms, this.agents].filter((r): r is FilterRow<Env> | FilterRow<Agent> => r !== null) as FilterRow<string>[];
  }

  private env(): Env | undefined {
    return (this.platforms?.values[this.platforms.at] ?? undefined) || this.filter.env;
  }

  private agent(): Agent | undefined {
    return (this.agents?.values[this.agents.at] ?? undefined) || this.filter.agent;
  }

  /** All platforms of several: grouped by platform, groups in the order of their newest session. */
  private grouped(): boolean {
    return this.platforms !== null && this.platforms.values[this.platforms.at] === null;
  }

  /** The sessions in the order shown. */
  private visible(all = this.all): SessionRow[] {
    let rows = listed(this.rows, { ...this.filter, all, env: this.env(), agent: this.agent() });
    const q = this.query.toLowerCase();
    if (q) rows = rows.filter((r) => [r.title, r.project, r.branch, r.id].some((v) => v?.toLowerCase().includes(q)));
    if (!this.grouped()) return rows;
    const order = [...new Set(rows.map((r) => r.env))];
    return order.flatMap((e) => rows.filter((r) => r.env === e));
  }

  private keepSelection(before: SessionRow | undefined): void {
    const rows = this.visible();
    const i = before ? rows.findIndex((r) => r.id === before.id) : -1;
    this.sel = i >= 0 ? i : 0;
    this.top = 0;
  }

  /**
   * `Platform   ● All    ○ WSL      ○ Win`: the row in focus has its name in cyan.
   * Values line up in columns across the two rows, each as wide as its widest name.
   */
  private filterLine(row: FilterRow<string>, focused: boolean, names: (v: string | null) => string, columns: number[]): string {
    const st = this.out.st;
    const values = row.values.map((v, i) => {
      const name = i < row.values.length - 1 ? padEnd(names(v), columns[i]!) : names(v);
      return i === row.at ? st.bold(`● ${name}`) : st.dim(`○ ${name}`);
    });
    const title = row.name.padEnd(11);
    return ` ${focused ? st.bold(st.cyan(title)) : st.dim(title)}${values.join("    ")}`;
  }

  private keys(): string[] {
    const n = this.filterRows().length;
    const filters = n === 2 ? ["←→ filter", "Tab platform/agent"] : n === 1 ? [`←→/Tab ${this.filterRows()[0]!.name.toLowerCase()}`] : [];
    return ["↑↓ select", `Enter ${this.pick?.verb ?? "open"}`, "Space preview", ...filters, `Ctrl+A ${this.all ? "this project" : "all projects"}`, "Esc quit"];
  }

  /**
   * The search line in a box, so it stands out from the filters and the list.
   * The terminal's own cursor sits at the end of the input (see `cursor`).
   */
  private searchBox(cols: number, row: number): string[] {
    const st = this.out.st;
    const inner = Math.max(16, cols - 4);
    const room = inner - 5;
    // Long input keeps its end in view, with room for the cursor after it.
    const shown = width(this.query) > room ? "…" + [...this.query].slice(-(room - 1)).join("") : this.query;
    const content = shown ? padEnd(shown, room) : st.dim(padEnd(PLACEHOLDER, room));
    this.input = { row: row + 1, col: 5 + width(shown) };
    const edge = this.query ? st.cyan : st.dim;
    return [` ${edge(`╭${"─".repeat(inner)}╮`)}`, ` ${edge("│")} ⌕ ${content}  ${edge("│")}`, ` ${edge(`╰${"─".repeat(inner)}╯`)}`];
  }

  cursor(): { row: number; col: number } | null {
    return this.input;
  }

  render(rows: number, cols: number): string[] {
    const st = this.out.st;
    const list = this.visible();
    const where = this.all ? "all projects" : shortPath(displayPath(this.filter.project, this.ctx.platform.home), Math.max(20, cols - 40));
    // Notices are read whole: wrapped, not cut at the window's edge.
    const out: string[] = [];
    const unreadable = unreadableHint(this.rows.filter((r) => r.unreadable === 1).length);
    for (const n of [this.notice, stoppedNotice(this.ctx.wslStopped, this.ctx.now), unreadable]) if (n) out.push(...wrapLine(st.yellow(` ${n}`), cols - 1, " "));
    out.push(` ${st.bold(this.pick?.title ?? "Sessions")} · ${where}  ${st.dim(`${list.length} shown`)}`);
    const filters = this.filterRows();
    const nameOf = (r: FilterRow<string>) => (v: string | null) => (v === null ? "All" : ((r === (this.platforms as FilterRow<string> | null) ? ENV_NAME : AGENT_NAME) as Record<string, string>)[v] ?? v);
    const columns: number[] = [];
    for (const r of filters) r.values.forEach((v, i) => (columns[i] = Math.max(columns[i] ?? 0, width(nameOf(r)(v)))));
    filters.forEach((r, i) => out.push(this.filterLine(r, i === this.focus, nameOf(r), columns)));
    out.push(...this.searchBox(cols, out.length));
    // Only this project is shown: say how many more there are elsewhere (plan §3.1).
    const hint = this.all ? null : othersHint(this.visible(true).length - list.length, "Ctrl+A");
    const keys = wrapParts(this.keys(), " · ", cols - 1).map((l) => st.dim(l));
    // A window only a few rows high: no room for the list, never a negative count (R14).
    const bottom = Math.max(0, rows - keys.length - (hint ? 1 : 0));
    const room = Math.max(2, bottom - out.length);
    if (list.length === 0) {
      out.push("", st.dim(this.all ? "  No sessions." : "  No sessions in this project. Ctrl+A shows all projects."));
    }

    // The list as lines: a heading before each platform's group, two lines per session.
    const lines: string[] = [];
    const startOf: number[] = [];
    const headOf: number[] = [];
    const grouped = this.grouped();
    list.forEach((r, i) => {
      if (grouped && (i === 0 || list[i - 1]!.env !== r.env)) {
        const count = list.filter((x) => x.env === r.env).length;
        lines.push(st.dim(` ── ${ENV_NAME[r.env] ?? r.env} (${count}) ──`));
      }
      headOf.push(grouped && (i === 0 || list[i - 1]!.env !== r.env) ? lines.length - 1 : -1);
      startOf.push(lines.length);
      const selected = i === this.sel;
      // The label at the right edge, in one column whatever the title's length.
      const lab = label(r.agent, r.env);
      const title = truncate(r.title ?? "(untitled)", Math.max(10, cols - 5 - width(lab)));
      const gap = " ".repeat(Math.max(2, cols - 3 - width(title) - width(lab)));
      lines.push(`${selected ? st.cyan("❯ ") : "  "}${selected ? st.bold(title) : title}${gap}${coloredLabel(st, r.agent, r.env)}`);
      // Facts on the left; the id on the right under the label (`meme show`, `continue`
      // and `forget` take it). Across projects the project comes last, losing its middle.
      const facts = [this.pick?.note?.(r) ?? ago(r.ended_at, this.ctx.now), r.branch, size(r.size), marks(r, this.ctx.now).replace(/^ \((.*)\)$/, "$1") || null].filter(Boolean).join(" · ");
      const room = cols - 5 - width(r.short) - width(facts) - 3;
      const project = this.all ? ` · ${shortPath(displayPath(r.project ?? "", this.ctx.platform.home), Math.max(12, Math.min(PATH_COLS, room)))}` : "";
      const left = truncate(facts + project, Math.max(10, cols - 5 - width(r.short)));
      lines.push(`  ${st.dim(left)}${" ".repeat(Math.max(2, cols - 3 - width(left) - width(r.short)))}${st.dim(r.short)}`);
    });
    if (list.length) {
      // Keep the selected session in view, with its group's heading when it is the first of its group.
      const first = headOf[this.sel]! >= 0 ? headOf[this.sel]! : startOf[this.sel]!;
      if (first < this.top) this.top = first;
      if (startOf[this.sel]! + 2 > this.top + room) this.top = startOf[this.sel]! + 2 - room;
      out.push(...lines.slice(this.top, this.top + room));
    }
    while (out.length < bottom) out.push("");
    out.length = bottom;
    if (hint) out.push(" " + st.dim(hint));
    out.push(...keys);
    return out;
  }

  /** ←→ on the row in focus; Tab moves the focus, or changes the only row there is. */
  private turn(row: FilterRow<string> | undefined, step: number, current: SessionRow | undefined): void {
    if (!row) return;
    row.at = (row.at + step + row.values.length) % row.values.length;
    this.keepSelection(current);
  }

  key(k: Key): void {
    const list = this.visible();
    const current = list[this.sel];
    const filters = this.filterRows();
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
      case "left":
      case "right":
        this.turn(filters[this.focus], k.name === "right" ? 1 : -1, current);
        return;
      case "tab":
      case "backtab":
        if (filters.length > 1) this.focus = (this.focus + 1) % filters.length;
        else this.turn(filters[0], k.name === "tab" ? 1 : -1, current);
        return;
      case "enter":
        if (!current) return;
        if (this.pick) this.pick.onPick(current);
        else this.tui.push(new SessionView(this.tui, this.model(current), this.base()));
        return;
      case "space":
        if (current) this.tui.push(new PreviewView(this.tui, this.model(current), this.base(), this.pick && { verb: this.pick.verb, run: () => this.pick!.onPick(current) }));
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
    return { st: this.out.st, home: this.ctx.platform.home, now: this.ctx.now, full: false, hidden: false };
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
    /** In `meme continue` and `meme forget`, Enter picks this session instead of opening it. */
    private readonly pick?: { verb: string; run: () => void },
  ) {}

  render(rows: number, cols: number): string[] {
    this.rows = rows;
    const o: ShowOptions = { ...this.base, width: cols, wrap: true };
    const head = [...headerLines(this.m, o), o.st.yellow(endingLine(this.m, o))].flatMap((l) => wrapLine(l, cols - 1, " "));
    head.push(o.st.dim("─".repeat(cols)));
    const keys = wrapParts(["↑↓ scroll", `Enter ${this.pick?.verb ?? "open"}`, "Space/Esc back"], " · ", cols - 1).map((l) => o.st.dim(l));
    const body: string[] = [];
    const numW = numberWidth(this.m);
    for (const t of this.m.turns) {
      const from = this.m.separators.get(t.n);
      if (from) body.push(separatorLine(from, o));
      body.push(...foldedTurn(t, numW, o));
    }
    this.total = body.length;
    const room = rows - head.length - keys.length;
    const max = Math.max(0, body.length - room);
    this.top = this.top === null ? max : Math.max(0, Math.min(this.top, max));
    const out = [...head, ...body.slice(this.top, this.top + room)];
    while (out.length < rows - keys.length) out.push("");
    out.push(...keys);
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
      if (this.pick) this.pick.run();
      else this.tui.push(new SessionView(this.tui, this.m, this.base));
    } else if (k.name === "space" || k.name === "esc" || (k.name === "char" && k.ch === "q")) this.tui.pop();
  }
}

export async function runPicker(ctx: Context, out: Output, filter: ListFilter): Promise<number> {
  const tui = new Tui();
  await tui.run(new PickerView(tui, ctx, out, filter));
  return 0;
}

/** The list as a chooser: the session picked with Enter, or null after Esc. */
export async function pickSession(ctx: Context, out: Output, filter: ListFilter, title: string, verb: string, note?: Pick["note"]): Promise<SessionRow | null> {
  const tui = new Tui();
  let picked: SessionRow | null = null;
  const onPick = (row: SessionRow) => {
    picked = row;
    tui.quit();
  };
  await tui.run(new PickerView(tui, ctx, out, filter, { title, verb, onPick, note }));
  return picked;
}
