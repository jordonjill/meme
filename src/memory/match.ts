import type { Entry } from "./types";

/**
 * How much a piece of text has to do with an entry, without a model and without
 * vectors (memory-v0.3-draft §7.4). Texts are compared by their pieces: words of
 * letters and digits, so paths, commands and identifiers fall apart at punctuation;
 * and, for Chinese, Japanese and Korean, every two neighbouring characters, since
 * their words are not set apart by spaces and most are two characters long.
 */

const CJK = "\\u3040-\\u30ff\\u3400-\\u4dbf\\u4e00-\\u9fff\\uac00-\\ud7af\\uf900-\\ufaff";
const RUN = new RegExp(`[a-z0-9]+|[${CJK}]+`, "g");
const IS_CJK = new RegExp(`^[${CJK}]`);

/** Words that say nothing about what a text is about. */
const STOP = new Set("a an and are as at be but by do does for from how if in into is it its no not of on or so that the then this to was what when where which who why will with you your".split(" "));

export function pieces(text: string): Set<string> {
  const out = new Set<string>();
  for (const run of text.normalize("NFKC").toLowerCase().match(RUN) ?? []) {
    if (!IS_CJK.test(run)) {
      if (run.length > 1 && !STOP.has(run)) out.add(run);
    } else if (run.length === 1) {
      out.add(run);
    } else {
      for (let i = 0; i + 1 < run.length; i++) out.add(run.slice(i, i + 2));
    }
  }
  return out;
}

/** What an entry is matched by: what it says, and when and why it applies. */
export function piecesOf(e: Entry): Set<string> {
  return pieces([e.text, e.when ?? "", e.why ?? ""].join("\n"));
}

export interface Match<T> {
  item: T;
  score: number;
}

/**
 * The entries a text has to do with, the closest first. A piece counts for more the
 * fewer entries have it. An entry is close enough when it shares a word of three
 * letters or more, or two pieces of any kind, or everything the text consists of
 * (someone looking for one two-character word). One two-character piece out of a
 * longer text is too often chance.
 */
export function closest<T>(text: string, items: T[], entryOf: (item: T) => Entry): Match<T>[] {
  const wanted = pieces(text);
  if (!wanted.size || !items.length) return [];
  const have = items.map((item) => piecesOf(entryOf(item)));
  const count = new Map<string, number>();
  for (const set of have) for (const p of set) if (wanted.has(p)) count.set(p, (count.get(p) ?? 0) + 1);
  const out: Match<T>[] = [];
  items.forEach((item, i) => {
    let score = 0;
    let shared = 0;
    let word = false;
    for (const p of have[i]!) {
      if (!wanted.has(p)) continue;
      shared++;
      word ||= !IS_CJK.test(p) && p.length >= 3;
      score += Math.log(1 + items.length / count.get(p)!);
    }
    if (word || shared >= 2 || shared === wanted.size) out.push({ item, score });
  });
  return out.sort((a, b) => b.score - a.score);
}
