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

/** A full-screen view. `render` returns exactly the lines to show. */
export interface View {
  render(rows: number, cols: number): string[];
  key(key: Key): void;
}

/**
 * The alternate screen with raw keyboard input, and a stack of views: the list
 * pushes the session viewer, Esc pops back. The screen closes when the stack is empty.
 */
export class Tui {
  private stack: View[] = [];
  private prev: string[] = [];
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
    if (buf) this.out.write(buf);
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
