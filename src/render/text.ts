/** Terminal text helpers. Widths are display columns: CJK characters count as two. */

export function width(s: string): number {
  return Bun.stringWidth(s);
}

/** Cut to at most `max` columns, ending with `…` when something was cut. */
export function truncate(s: string, max: number): string {
  if (max <= 0) return "";
  if (width(s) <= max) return s;
  let out = "";
  let w = 0;
  for (const ch of s) {
    const cw = width(ch);
    if (w + cw > max - 1) break;
    out += ch;
    w += cw;
  }
  return out + "…";
}

/**
 * A path cut to `max` columns in the middle: as many of its last folders as fit,
 * then as much of its start as is left room for (at least `~`, `C:`, `/home`):
 * `~\\AppData\\…\\bots\\cindy\\default-workspace`. The last folders tell
 * projects apart. For lists only, never for a path to act on.
 */
export function shortPath(p: string, max: number): string {
  if (width(p) <= max) return p;
  const sep = p.includes("\\") && !p.includes("/") ? "\\" : "/";
  const parts = p.split(/[\\/]/);
  // "/home/u/x" splits into "", "home", …: keep "/home".
  const headCount = parts[0] === "" ? 2 : 1;
  let head = parts.slice(0, headCount).join(sep);
  let tail: string[] = [];
  for (let i = parts.length - 1; i >= headCount; i--) {
    const next = [parts[i]!, ...tail];
    if (width(`${head}${sep}…${sep}${next.join(sep)}`) > max) break;
    tail = next;
  }
  if (!tail.length) return truncate(`${head}${sep}…${sep}${parts.at(-1)}`, max);
  for (let h = headCount; h < parts.length - tail.length; h++) {
    const longer = parts.slice(0, h + 1).join(sep);
    if (width(`${longer}${sep}…${sep}${tail.join(sep)}`) > max) break;
    head = longer;
  }
  return `${head}${sep}…${sep}${tail.join(sep)}`;
}

export function padEnd(s: string, cols: number): string {
  const w = width(s);
  return w >= cols ? s : s + " ".repeat(cols - w);
}

export function padStart(s: string, cols: number): string {
  const w = width(s);
  return w >= cols ? s : " ".repeat(cols - w) + s;
}

/** Join parts with `sep` into lines of at most `cols` columns, breaking only between parts. */
export function wrapParts(parts: string[], sep: string, cols: number): string[] {
  const out: string[] = [];
  let cur = "";
  for (const p of parts) {
    if (cur && width(cur + sep + p) > cols) {
      out.push(cur);
      cur = p;
    } else cur = cur ? cur + sep + p : p;
  }
  if (cur) out.push(cur);
  return out;
}

/** Split one line into pieces of at most `cols` columns. */
export function wrap(line: string, cols: number): string[] {
  if (cols <= 0 || width(line) <= cols) return [line];
  const out: string[] = [];
  let cur = "";
  let w = 0;
  for (const ch of line) {
    const cw = width(ch);
    if (w + cw > cols && cur) {
      out.push(cur);
      cur = "";
      w = 0;
    }
    cur += ch;
    w += cw;
  }
  if (cur) out.push(cur);
  return out;
}

/**
 * Control characters from session content (an escape sequence in a command's
 * output, say) would drive the terminal, so they are shown as `^[` and the like.
 */
export function visible(s: string): string {
  return s.replace(/[\x00-\x08\x0b-\x1f\x7f]/g, (c) => (c === "\x7f" ? "^?" : "^" + String.fromCharCode(c.charCodeAt(0) + 64)));
}

export function lines(text: string): string[] {
  return visible(text.replace(/\r\n?/g, "\n").replace(/\t/g, "    ")).split("\n");
}

/** Lines without the trailing empty ones. */
export function trimmedLines(text: string): string[] {
  const out = lines(text);
  while (out.length && !out[out.length - 1]!.trim()) out.pop();
  while (out.length && !out[0]!.trim()) out.shift();
  return out;
}

const UNITS: [number, string, string][] = [
  [365 * 86400, "y", "year"],
  [30 * 86400, "mo", "month"],
  [7 * 86400, "w", "week"],
  [86400, "d", "day"],
  [3600, "h", "hour"],
  [60, "m", "minute"],
  [1, "s", "second"],
];

/** `2h ago`, or `2 hours ago` when `long`. */
export function ago(iso: string | null, now = Date.now(), long = false): string {
  if (!iso) return "";
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return "";
  const secs = Math.max(0, Math.floor((now - t) / 1000));
  for (const [size, short, name] of UNITS) {
    if (secs >= size || size === 1) {
      const n = Math.floor(secs / size);
      return long ? `${n} ${name}${n === 1 ? "" : "s"} ago` : `${n}${short} ago`;
    }
  }
  return "";
}

/** `352KB`, `1.0MB`. */
export function size(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)}KB`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)}MB`;
  return `${(bytes / 1024 ** 3).toFixed(1)}GB`;
}

const two = (n: number) => String(n).padStart(2, "0");

function parts(iso: string) {
  const d = new Date(iso);
  return { y: d.getFullYear(), md: `${two(d.getMonth() + 1)}-${two(d.getDate())}`, hm: `${two(d.getHours())}:${two(d.getMinutes())}` };
}

/** `09-30 09:08` in local time; the year only when it is not this year. */
export function when(iso: string | null, now = new Date()): string {
  if (!iso || Number.isNaN(Date.parse(iso))) return "";
  const p = parts(iso);
  return `${p.y === now.getFullYear() ? "" : p.y + "-"}${p.md} ${p.hm}`;
}

/** `09-30 09:08 → 09:12`, or with both dates when they differ. */
export function span(start: string | null, end: string | null, now = new Date()): string {
  if (!start) return when(end, now);
  if (!end) return when(start, now);
  const a = parts(start);
  const b = parts(end);
  return `${when(start, now)} → ${a.y === b.y && a.md === b.md ? b.hm : when(end, now)}`;
}

/** `10-08`, the day only. */
export function day(iso: string | null, now = new Date()): string {
  return when(iso, now).split(" ")[0] ?? "";
}

export function plural(n: number, word: string, many = word + "s"): string {
  return `${n.toLocaleString("en-US")} ${n === 1 ? word : many}`;
}
