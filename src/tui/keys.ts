export type KeyName =
  | "up" | "down" | "left" | "right" | "pageup" | "pagedown" | "home" | "end"
  | "enter" | "esc" | "tab" | "backtab" | "backspace" | "delete" | "space";

export type Key = { name: KeyName } | { name: "ctrl"; ch: string } | { name: "char"; ch: string };

const SEQUENCES: Record<string, KeyName> = {
  "[A": "up", "[B": "down", "[C": "right", "[D": "left",
  OA: "up", OB: "down", OC: "right", OD: "left",
  "[5~": "pageup", "[6~": "pagedown",
  "[H": "home", "[F": "end", OH: "home", OF: "end", "[1~": "home", "[4~": "end", "[7~": "home", "[8~": "end",
  "[3~": "delete", "[Z": "backtab",
};

/** Decode one chunk of terminal input into keys. Unknown escape sequences are dropped. */
export function parseKeys(data: string): Key[] {
  const keys: Key[] = [];
  let i = 0;
  while (i < data.length) {
    const c = data[i]!;
    if (c === "\x1b") {
      const rest = data.slice(i + 1);
      if (rest === "" || rest[0] === "\x1b") {
        keys.push({ name: "esc" });
        i += 1;
        continue;
      }
      const csi = /^(\[[0-9;?]*[ -/]*[@-~]|O[A-Za-z])/.exec(rest);
      if (csi) {
        const name = SEQUENCES[csi[1]!.replace(/^\[1;\d+([A-Z])$/, "[$1")];
        if (name) keys.push({ name });
        i += 1 + csi[1]!.length;
        continue;
      }
      // Alt+key arrives as ESC + key: treat it as Esc followed by the key.
      keys.push({ name: "esc" });
      i += 1;
      continue;
    }
    if (c === "\r" || c === "\n") keys.push({ name: "enter" });
    else if (c === "\t") keys.push({ name: "tab" });
    else if (c === "\x7f" || c === "\b") keys.push({ name: "backspace" });
    else if (c === " ") keys.push({ name: "space" });
    else if (c < " ") keys.push({ name: "ctrl", ch: String.fromCharCode(c.charCodeAt(0) + 96) });
    else {
      const ch = String.fromCodePoint(data.codePointAt(i)!);
      keys.push({ name: "char", ch });
      i += ch.length;
      continue;
    }
    i += 1;
  }
  return keys;
}
