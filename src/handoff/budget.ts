/** Length budget of a handoff (plan §4.6.6). */

export const TOKEN_LIMIT = 15_000;

const CJK = /[　-ヿ㐀-䶿一-鿿가-힯豈-﫿＀-￯]/g;

/** Rough token count: a CJK character is one token, other text four characters per token. */
export function estimateTokens(s: string): number {
  const cjk = s.match(CJK)?.length ?? 0;
  return cjk + Math.ceil((s.length - cjk) / 4);
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
  const keep = new Set<number>();
  const n = costs.length;
  if (n === 0) return keep;
  const total = costs.reduce((a, b) => a + b, 0);
  if (total <= budget) return new Set(costs.keys());
  keep.add(0);
  keep.add(n - 1);
  let left = budget - costs[0]! - (n > 1 ? costs[n - 1]! : 0);
  for (let i = n - 2; i > 0; i--) {
    if (costs[i]! > left) break;
    keep.add(i);
    left -= costs[i]!;
  }
  return keep;
}
