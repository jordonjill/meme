/**
 * Length budget of a handoff (plan §4.6.6): at most 15,000 tokens and 25,000
 * characters. Claude Code keeps 30,000 characters of a command's output, both for
 * `!` commands and for its Bash tool, so a handoff printed there is never cut.
 */

export const TOKEN_LIMIT = 15_000;
export const CHAR_LIMIT = 25_000;

export interface Limits {
  tokens: number;
  chars: number;
  /** Also bytes of UTF-8, where the consumer counts those (Codex). */
  bytes?: number;
}

export const LIMITS: Limits = { tokens: TOKEN_LIMIT, chars: CHAR_LIMIT };

/**
 * Inside Codex: it keeps 10,000 of its tokens of a command's output and counts a
 * token as 4 bytes, so 40,000 bytes; 10% is left for the lines around the handoff
 * (sessions.md §7.1).
 */
export const CODEX_BYTES = 36_000;

const CJK = /[　-ヿ㐀-䶿一-鿿가-힯豈-﫿＀-￯]/g;

/** Rough token count: a CJK character is one token, other text four characters per token. */
export function estimateTokens(s: string): number {
  const cjk = s.match(CJK)?.length ?? 0;
  return cjk + Math.ceil((s.length - cjk) / 4);
}

/**
 * Size against both limits at once, counted in characters: text fits the budget
 * when its weight is at most `limits.chars`. Summing weights over-counts a little
 * for mixed text, which only errs on the short side.
 */
export function weight(s: string, limits: Limits = LIMITS): number {
  const byTokens = Math.ceil((estimateTokens(s) * limits.chars) / limits.tokens);
  const byBytes = limits.bytes ? Math.ceil((Buffer.byteLength(s, "utf8") * limits.chars) / limits.bytes) : 0;
  return Math.max(s.length, byTokens, byBytes);
}

/** The three things the limits count; they add up exactly over pieces of text, unlike `weight`. */
export interface Size {
  chars: number;
  tokens: number;
  bytes: number;
}

export const ZERO: Size = { chars: 0, tokens: 0, bytes: 0 };

export function measure(s: string): Size {
  return { chars: s.length, tokens: estimateTokens(s), bytes: Buffer.byteLength(s, "utf8") };
}

export function plus(...sizes: Size[]): Size {
  return sizes.reduce((a, b) => ({ chars: a.chars + b.chars, tokens: a.tokens + b.tokens, bytes: a.bytes + b.bytes }), ZERO);
}

export function minus(a: Size, b: Size): Size {
  return { chars: a.chars - b.chars, tokens: a.tokens - b.tokens, bytes: a.bytes - b.bytes };
}

export function within(s: Size, limits: Limits): boolean {
  return s.chars <= limits.chars && s.tokens <= limits.tokens && (!limits.bytes || s.bytes <= limits.bytes);
}

/** Cut text to about `max` tokens on a line or character boundary. */
export function cutToTokens(s: string, max: number): { text: string; cut: boolean } {
  if (estimateTokens(s) <= max) return { text: s, cut: false };
  let lo = 0;
  let hi = s.length;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (estimateTokens(s.slice(0, mid)) <= max) lo = mid;
    else hi = mid - 1;
  }
  const head = s.slice(0, lo);
  const nl = head.lastIndexOf("\n");
  return { text: nl > lo * 0.6 ? head.slice(0, nl) : head, cut: true };
}

/**
 * Which user messages fit: the first and the last always; then from the newest
 * backwards, whole messages only, stopping at the first one that does not fit, so
 * what is left out is one stretch in the middle.
 */
export function fitMessages(costs: number[], budget: number): Set<number> {
  const sizes = costs.map((c) => ({ chars: c, tokens: 0, bytes: 0 }));
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
