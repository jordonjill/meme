/**
 * Length budget of a handoff (plan §4.6.6, handoff.md §7.3): meme's own 15,000
 * tokens, and what the agent it is printed into keeps of a command's output, in
 * that agent's unit (its profile's `outputLimit`), so the handoff is never cut.
 * What is cut and in what order is the same for every agent; only how far
 * depends on where the handoff goes.
 */
import { PROFILES } from "../adapters/profiles";
import { sliceChars } from "../render/text";

/** meme's own: a handoff takes no more than this of a model's window. */
export const TOKEN_LIMIT = 15_000;

export interface Limits {
  tokens: number;
  /** Characters, where the agent counts those (its profile's `outputLimit`). */
  chars?: number;
  /** Bytes of UTF-8, where the agent counts those. */
  bytes?: number;
  /** Line breaks, where the agent also keeps only so many lines. */
  lines?: number;
}

type Unit = "chars" | "bytes" | "lines";

/**
 * The limits inside an agent: meme's own and that agent's. Not knowing which
 * agent will read it (`--plain`, a pipe, an agent without a profile), the tightest
 * of every profile, each in its unit.
 */
export function limitsIn(agent: { outputLimit: Partial<Record<Unit, number>> } | null): Limits {
  if (agent) return { tokens: TOKEN_LIMIT, ...agent.outputLimit };
  const tightest = (unit: Unit) => {
    const all = PROFILES.map((p) => p.outputLimit[unit]).filter((n): n is number => n !== undefined);
    return all.length ? { [unit]: Math.min(...all) } : {};
  };
  return { tokens: TOKEN_LIMIT, ...tightest("chars"), ...tightest("bytes"), ...tightest("lines") };
}

const CJK = /[　-ヿ㐀-䶿一-鿿가-힯豈-﫿＀-￯]/g;

/** Rough token count: a CJK character is one token, other text four characters per token. */
export function estimateTokens(s: string): number {
  const cjk = s.match(CJK)?.length ?? 0;
  return cjk + Math.ceil((s.length - cjk) / 4);
}

/** The four things the limits count; they add up exactly over pieces of text (lines as line breaks). */
export interface Size {
  chars: number;
  tokens: number;
  bytes: number;
  lines: number;
}

export const ZERO: Size = { chars: 0, tokens: 0, bytes: 0, lines: 0 };

export function measure(s: string): Size {
  let lines = 0;
  for (let i = s.indexOf("\n"); i >= 0; i = s.indexOf("\n", i + 1)) lines++;
  return { chars: s.length, tokens: estimateTokens(s), bytes: Buffer.byteLength(s, "utf8"), lines };
}

export function plus(...sizes: Size[]): Size {
  return sizes.reduce((a, b) => ({ chars: a.chars + b.chars, tokens: a.tokens + b.tokens, bytes: a.bytes + b.bytes, lines: a.lines + b.lines }), ZERO);
}

export function minus(a: Size, b: Size): Size {
  return { chars: a.chars - b.chars, tokens: a.tokens - b.tokens, bytes: a.bytes - b.bytes, lines: a.lines - b.lines };
}

export function within(s: Size, limits: Limits): boolean {
  return (
    s.tokens <= limits.tokens &&
    (limits.chars === undefined || s.chars <= limits.chars) &&
    (limits.bytes === undefined || s.bytes <= limits.bytes) &&
    (limits.lines === undefined || s.lines <= limits.lines)
  );
}

/** Cut text to about `max` tokens on a line or character boundary. */
export function cutToTokens(s: string, max: number): { text: string; cut: boolean } {
  if (estimateTokens(s) <= max) return { text: s, cut: false };
  let lo = 0;
  let hi = s.length;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (estimateTokens(sliceChars(s, mid)) <= max) lo = mid;
    else hi = mid - 1;
  }
  const head = sliceChars(s, lo);
  const nl = head.lastIndexOf("\n");
  return { text: nl > lo * 0.6 ? head.slice(0, nl) : head, cut: true };
}

/**
 * Which user messages fit: the first and the last always; then from the newest
 * backwards, whole messages only, stopping at the first one that does not fit, so
 * what is left out is one stretch in the middle.
 */
export function fitMessages(costs: number[], budget: number): Set<number> {
  const sizes = costs.map((c) => ({ chars: c, tokens: 0, bytes: 0, lines: 0 }));
  return fitSizes(sizes, (s) => s.chars <= budget);
}

/** `fitMessages` for sizes: `fits` says whether the messages picked so far, added up, still fit. */
export function fitSizes(costs: Size[], fits: (picked: Size) => boolean): Set<number> {
  const keep = new Set<number>();
  const n = costs.length;
  if (n === 0) return keep;
  if (fits(plus(...costs))) return new Set(costs.keys());
  keep.add(0);
  keep.add(n - 1);
  let sum = plus(costs[0]!, n > 1 ? costs[n - 1]! : ZERO);
  for (let i = n - 2; i > 0; i--) {
    const next = plus(sum, costs[i]!);
    if (!fits(next)) break;
    keep.add(i);
    sum = next;
  }
  return keep;
}
