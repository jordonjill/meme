import { parseKeys, type Key } from "./keys";

const ANSI = /\x1b\[[0-9;?]*[A-Za-z]/y;

/** Cut a styled line to `cols` columns without breaking its escape codes. */
export function clip(line: string, cols: number): string {
  let out = "";
  let w = 0;
  let i = 0;
  while (i < line.length) {
    if (line[i] === "\x1b") {
      ANSI.lastIndex = i;
      const m = ANSI.exec(line);
      if (m) {
        out += m[0];
        i += m[0].length;
        continue;
      }
    }
    const ch = String.fromCodePoint(line.codePointAt(i)!);
    const cw = Bun.stringWidth(ch);
    if (w + cw > cols) break;
    out += ch;
    w += cw;
    i += ch.length;
  }
  return out;
}

/**
 * Word-wrap a styled line to `cols` columns: the screen cuts every line at its
 * width, so text that must be read whole (notices, the keys, a header) is wrapped
 * first. A continuation line starts with `indent` and the styles in force.
 */
export function wrapLine(line: string, cols: number, indent = ""): string[] {
  if (cols <= 0 || Bun.stringWidth(line) <= cols) return [line];
  // Cells: an escape code (no width) or one character.
  const cells: { text: string; w: number; esc: boolean }[] = [];
  for (let i = 0; i < line.length; ) {
    if (line[i] === "\x1b") {
      ANSI.lastIndex = i;
      const m = ANSI.exec(line);
      if (m) {
        cells.push({ text: m[0], w: 0, esc: true });
        i += m[0].length;
        continue;
      }
    }
    const ch = String.fromCodePoint(line.codePointAt(i)!);
    cells.push({ text: ch, w: Bun.stringWidth(ch), esc: false });
    i += ch.length;
  }
  const out: string[] = [];
  let styles = "";
  let cur: typeof cells = [];
  let w = 0;
  const flush = (part: typeof cells, start: string) => out.push(start + part.map((c) => c.text).join(""));
  let start = "";
  for (const cell of cells) {
    if (!cell.esc && w + cell.w > cols && cur.some((c) => !c.esc)) {
      // Break at the last space when there is one, else in the word.
      const space = cur.map((c) => c.text).lastIndexOf(" ");
      const keep = space > 0 ? cur.slice(0, space) : cur;
      const rest = space > 0 ? cur.slice(space + 1) : [];
      flush(keep, start);
      for (const c of keep) if (c.esc) styles += c.text;
      start = styles + indent;
      cur = rest;
      w = Bun.stringWidth(indent) + rest.reduce((n, c) => n + c.w, 0);
    }
    cur.push(cell);
    w += cell.w;
  }
  if (cur.length) flush(cur, start);
  return out;
}

/** A full-screen view. `render` returns exactly the lines to show. */
export interface View {
  render(rows: number, cols: number): string[];
  key(key: Key): void;
  /**
   * Where typing goes, as of the last render: the terminal's cursor is put
   * there and shown, so an input method opens its candidates at the input.
   * Without it the cursor stays hidden.
   */
  cursor?(): { row: number; col: number } | null;
}

/**
 * The alternate screen with raw keyboard input, and a stack of views: the list
 * pushes the session viewer, Esc pops back. The screen closes when the stack is empty.
 */
export class Tui {
  private stack: View[] = [];
  private prev: string[] = [];
  private prevCursor = "";
  private done: (() => void) | null = null;
  private readonly onData = (data: string) => {
    for (const key of parseKeys(data)) {
      if (key.name === "ctrl" && key.ch === "c") {
        this.stack = [];
        break;
      }
      this.top()?.key(key);
      if (!this.top()) break;
    }
    this.draw();
  };
  private readonly onResize = () => {
    this.prev = [];
    this.draw();
  };
  private readonly restore = () => this.cleanup();

  constructor(
    private readonly out: NodeJS.WriteStream = process.stdout,
    private readonly inp: NodeJS.ReadStream = process.stdin,
  ) {}

  get rows(): number {
    return Math.max(5, this.out.rows || 24);
  }

  get cols(): number {
    return Math.max(20, this.out.columns || 80);
  }

  push(view: View): void {
    this.stack.push(view);
    this.prev = [];
  }

  pop(): void {
    this.stack.pop();
    this.prev = [];
  }

  quit(): void {
    this.stack = [];
  }

  private top(): View | undefined {
    return this.stack[this.stack.length - 1];
  }

  run(first: View): Promise<void> {
    this.push(first);
    return new Promise((resolve) => {
      this.done = resolve;
      this.out.write("\x1b[?1049h\x1b[?25l");
      this.inp.setRawMode?.(true);
      this.inp.setEncoding("utf8");
      this.inp.on("data", this.onData);
      this.inp.resume();
      this.out.on("resize", this.onResize);
      process.on("exit", this.restore);
      this.draw();
    });
  }

  private draw(): void {
    const view = this.top();
    if (!view) {
      this.cleanup();
      return;
    }
    const rows = this.rows;
    const cols = this.cols;
    const lines = view.render(rows, cols);
    const next = Array.from({ length: rows }, (_, r) => clip(lines[r] ?? "", cols));
    let buf = "";
    next.forEach((line, r) => {
      if (this.prev[r] !== line) buf += `\x1b[${r + 1};1H${line}\x1b[0m\x1b[K`;
    });
    this.prev = next;
    // Writing moves the cursor: put it back at the input, or keep it hidden.
    const at = view.cursor?.() ?? null;
    const cursor = at ? `\x1b[${Math.min(at.row, rows - 1) + 1};${Math.min(at.col, cols - 1) + 1}H\x1b[?25h` : "\x1b[?25l";
    if (buf || cursor !== this.prevCursor) this.out.write(buf + cursor);
    this.prevCursor = cursor;
  }

  private cleanup(): void {
    if (!this.done) return;
    const done = this.done;
    this.done = null;
    this.inp.off("data", this.onData);
    this.out.off("resize", this.onResize);
    process.off("exit", this.restore);
    this.inp.setRawMode?.(false);
    this.inp.pause();
    this.out.write("\x1b[?25h\x1b[?1049l");
    done();
  }
}
