import type { Style } from "../render/labels";
import { wrapParts } from "../render/text";
import type { Key } from "./keys";
import { wrapLine, type Tui, type View } from "./screen";

export interface Choice {
  label: string;
  note?: string;
}

/** A short list to choose from: ↑↓, Enter chooses, Esc goes back. */
export class ChoiceView implements View {
  private sel: number;

  constructor(
    private readonly tui: Tui,
    private readonly st: Style,
    private readonly head: string[],
    private readonly choices: Choice[],
    defaultIndex: number,
    private readonly onChoose: (index: number) => void,
    private readonly footer = "↑↓ select · Enter start · Esc back",
  ) {
    this.sel = Math.max(0, Math.min(defaultIndex, choices.length - 1));
  }

  render(rows: number, cols: number): string[] {
    // The head explains what happens next: wrapped to the window, never cut off.
    const out = [...this.head.flatMap((l) => wrapLine(l, cols - 1, " ")), ""];
    this.choices.forEach((c, i) => {
      const line = `${i === this.sel ? this.st.cyan("❯ ") + this.st.bold(c.label) : "  " + c.label}${c.note ? "  " + this.st.dim(c.note) : ""}`;
      out.push(...wrapLine(" " + line, cols - 1, "    "));
    });
    const keys = wrapParts(this.footer.split(" · "), " · ", cols - 1).map((l) => this.st.dim(l));
    while (out.length < rows - keys.length) out.push("");
    out.length = rows - keys.length;
    out.push(...keys);
    return out;
  }

  key(k: Key): void {
    if (k.name === "down") this.sel = Math.min(this.sel + 1, this.choices.length - 1);
    else if (k.name === "up") this.sel = Math.max(0, this.sel - 1);
    else if (k.name === "enter") this.onChoose(this.sel);
    else if (k.name === "esc" || (k.name === "char" && k.ch === "q")) this.tui.pop();
  }
}
