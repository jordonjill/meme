import type { Style } from "../render/labels";
import type { Key } from "./keys";
import type { Tui, View } from "./screen";

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

  render(rows: number): string[] {
    const out = [...this.head, ""];
    this.choices.forEach((c, i) => {
      const line = `${i === this.sel ? this.st.cyan("❯ ") + this.st.bold(c.label) : "  " + c.label}${c.note ? "  " + this.st.dim(c.note) : ""}`;
      out.push(" " + line);
    });
    while (out.length < rows - 1) out.push("");
    out.length = rows - 1;
    out.push(this.st.dim(this.footer));
    return out;
  }

  key(k: Key): void {
    if (k.name === "down") this.sel = Math.min(this.sel + 1, this.choices.length - 1);
    else if (k.name === "up") this.sel = Math.max(0, this.sel - 1);
    else if (k.name === "enter") this.onChoose(this.sel);
    else if (k.name === "esc" || (k.name === "char" && k.ch === "q")) this.tui.pop();
  }
}
