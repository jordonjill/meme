import type { Context, Output } from "../cli/context";
import { callsOf, contentOf, searchText, type Rec } from "../model/record";
import type { Turn } from "../model/turns";
import {
  endingLine, expandedTurn, foldedTurn, headerLines, numberWidth, separatorLine,
  type ShowModel, type ShowOptions,
} from "../render/show";
import type { Key } from "./keys";
import { Tui, type View } from "./screen";

interface Layout {
  lines: string[];
  /** Per turn: first line (including a separator above it) and end line. */
  spans: { start: number; end: number }[];
}

function recordText(rec: Rec): string {
  const body = rec.body;
  if (body.role === "assistant" && "tool_calls" in body) return callsOf(body).map((c) => c.name + " " + JSON.stringify(c.args)).join("\n");
  return contentOf(body) ?? searchText(body) ?? "";
}

/**
 * One session, a turn per line (list.md §6): ↑↓ select, Enter expands the turn
 * in place, `/` searches everything in the session including folded tool output.
 */
export class SessionView implements View {
  private sel = 0;
  private top = 0;
  private readonly expanded = new Set<number>();
  private query: string | null = null;
  private lastQuery = "";
  private message = "";
  private cols = 80;
  private rows = 24;
  private turnTexts: string[] | null = null;
  private pendingReveal = false;

  constructor(
    private readonly tui: Tui,
    private readonly m: ShowModel,
    private readonly base: Omit<ShowOptions, "width" | "wrap">,
    turn?: number,
  ) {
    if (turn !== undefined) {
      const i = m.turns.findIndex((t) => t.n === turn);
      if (i < 0) this.message = `there is no turn ${turn}`;
      else {
        this.sel = i;
        this.expanded.add(turn);
        this.pendingReveal = true;
      }
    } else if (m.turns.length) {
      // Like a chat: start at the end, where the session stopped.
      this.sel = m.turns.length - 1;
      this.pendingReveal = true;
    }
  }

  private options(): ShowOptions {
    return { ...this.base, width: this.cols, wrap: true };
  }

  private headerHeight(): number {
    return 3;
  }

  private bodyRows(): number {
    return Math.max(1, this.rows - this.headerHeight() - 1);
  }

  private layout(): Layout {
    const o = this.options();
    const numW = numberWidth(this.m);
    const lines: string[] = [];
    const spans: Layout["spans"] = [];
    this.m.turns.forEach((t: Turn, i) => {
      const start = lines.length;
      const from = this.m.separators.get(t.n);
      if (from) lines.push(separatorLine(from, o));
      const selected = i === this.sel;
      lines.push(...(this.expanded.has(t.n) ? expandedTurn(t, numW, o, selected) : foldedTurn(t, numW, o, selected)));
      spans.push({ start, end: lines.length });
    });
    if (this.m.turns.length === 0) lines.push(o.st.dim("  (no conversation)"));
    lines.push("");
    if (this.m.continuedIn) lines.push(o.st.dim(`  ── continued in ${this.m.continuedIn} ──`));
    lines.push(o.st.dim("  " + endingLine(this.m, o)));
    return { lines, spans };
  }

  private maxTop(l: Layout): number {
    return Math.max(0, l.lines.length - this.bodyRows());
  }

  private reveal(l: Layout): void {
    const s = l.spans[this.sel];
    if (!s) return;
    const rows = this.bodyRows();
    if (s.start < this.top) this.top = s.start;
    else if (s.end > this.top + rows) this.top = Math.min(s.start, s.end - rows);
    this.top = Math.max(0, Math.min(this.top, this.maxTop(l)));
  }

  render(rows: number, cols: number): string[] {
    this.rows = rows;
    this.cols = cols;
    const o = this.options();
    let l = this.layout();
    if (this.pendingReveal) {
      this.pendingReveal = false;
      this.reveal(l);
      if (this.sel === this.m.turns.length - 1 && !this.expanded.size) this.top = this.maxTop(l);
      l = this.layout();
    }
    this.top = Math.max(0, Math.min(this.top, this.maxTop(l)));
    const out = [...headerLines(this.m, o), o.st.dim("─".repeat(cols))];
    out.push(...l.lines.slice(this.top, this.top + this.bodyRows()));
    while (out.length < rows - 1) out.push("");
    out.push(this.footer(o));
    return out;
  }

  private footer(o: ShowOptions): string {
    if (this.query !== null) return `/${this.query}▏`;
    if (this.message) return o.st.yellow(this.message);
    return o.st.dim("↑↓ select · Enter expand · / search · n next match · PgUp/PgDn scroll · Esc back");
  }

  key(k: Key): void {
    if (this.query !== null) return this.searchKey(k);
    this.message = "";
    const l = this.layout();
    const span = l.spans[this.sel];
    const last = this.m.turns.length - 1;
    switch (k.name) {
      case "down":
        if (span && span.end > this.top + this.bodyRows() && this.expanded.has(this.m.turns[this.sel]!.n)) this.top++;
        else if (this.sel < last) {
          this.sel++;
          this.reveal(this.layout());
        } else this.top = Math.min(this.top + 1, this.maxTop(l));
        return;
      case "up":
        if (span && span.start < this.top) this.top--;
        else if (this.sel > 0) {
          this.sel--;
          this.reveal(this.layout());
        }
        return;
      case "pagedown":
      case "pageup": {
        const step = Math.max(1, this.bodyRows() - 1) * (k.name === "pagedown" ? 1 : -1);
        this.top = Math.max(0, Math.min(this.top + step, this.maxTop(l)));
        const i = l.spans.findIndex((s) => s.end > this.top);
        if (i >= 0) this.sel = i;
        return;
      }
      case "home":
        this.sel = 0;
        this.top = 0;
        return;
      case "end":
        this.sel = Math.max(0, last);
        this.top = this.maxTop(this.layout());
        return;
      case "enter": {
        const t = this.m.turns[this.sel];
        if (!t) return;
        if (this.expanded.has(t.n)) this.expanded.delete(t.n);
        else this.expanded.add(t.n);
        this.reveal(this.layout());
        return;
      }
      case "esc":
        this.tui.pop();
        return;
      case "char":
        if (k.ch === "/") this.query = "";
        else if (k.ch === "n") this.find(1);
        else if (k.ch === "N") this.find(-1);
        else if (k.ch === "q") this.tui.pop();
        return;
    }
  }

  private searchKey(k: Key): void {
    if (k.name === "esc") this.query = null;
    else if (k.name === "enter") {
      this.lastQuery = this.query ?? "";
      this.query = null;
      this.find(1, true);
    } else if (k.name === "backspace") this.query = (this.query ?? "").slice(0, -1);
    else if (k.name === "char") this.query += k.ch;
    else if (k.name === "space") this.query += " ";
  }

  /** Jump to the next turn whose text contains the query, and expand it. */
  private find(dir: 1 | -1, fromCurrent = false): void {
    const q = this.lastQuery.toLowerCase();
    if (!q) return;
    this.turnTexts ??= this.m.turns.map((t) => t.records.map(recordText).join("\n").toLowerCase());
    const n = this.m.turns.length;
    const matches = this.turnTexts.filter((t) => t.includes(q)).length;
    if (!matches) {
      this.message = `no match for "${this.lastQuery}"`;
      return;
    }
    for (let step = fromCurrent ? 0 : 1; step <= n; step++) {
      const i = (((this.sel + dir * step) % n) + n) % n;
      if (this.turnTexts[i]!.includes(q)) {
        this.sel = i;
        this.expanded.add(this.m.turns[i]!.n);
        this.top = this.layout().spans[i]!.start;
        this.message = `"${this.lastQuery}" in turn ${this.m.turns[i]!.n} (${matches} ${matches === 1 ? "turn" : "turns"} match; n next, N previous)`;
        return;
      }
    }
  }
}

export async function runViewer(ctx: Context, out: Output, m: ShowModel, opts: { turn?: number; all: boolean }): Promise<void> {
  const tui = new Tui();
  const base = { st: out.st, home: ctx.platform.home, now: ctx.now, full: false, all: opts.all };
  await tui.run(new SessionView(tui, m, base, opts.turn));
}
