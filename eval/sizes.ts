/**
 * Handoff sizes over every session in the mirror (plan step 6, task 7): counts
 * only, no session content. For comparing the handoff before and after a change.
 *
 *   bun eval/sizes.ts <label>      prints a summary, writes .cache/eval/sizes/<label>.json
 *   bun eval/sizes.ts --compare <a> <b>
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { createContext } from "../src/cli/context";
import { CODEX_BYTES, estimateTokens, LIMITS } from "../src/handoff/budget";
import { buildHandoff } from "../src/handoff/build";
import { allSessions, handedOver, sessionRecords } from "../src/store/queries";

interface Row {
  id: string;
  agent: string;
  turns: number;
  chars: number;
  tokens: number;
  bytes: number;
  /** Something was cut or left out to fit the Claude Code limits (before step 6: also a message cut at 1,500 characters). */
  trimmed: boolean;
  /** The same, under Codex's byte limit. */
  codexBytes: number;
  codexTrimmed: boolean;
}

const root = path.resolve(import.meta.dir, "..", ".cache", "eval", "sizes");
const args = process.argv.slice(2);

function stats(xs: number[]) {
  const s = [...xs].sort((a, b) => a - b);
  const at = (p: number) => s[Math.min(s.length - 1, Math.floor(p * s.length))] ?? 0;
  return { min: s[0] ?? 0, median: at(0.5), p90: at(0.9), max: s.at(-1) ?? 0 };
}

if (args[0] === "--compare") {
  const [a, b] = [args[1]!, args[2]!].map((l) => JSON.parse(readFileSync(path.join(root, `${l}.json`), "utf8")) as Row[]);
  const before = new Map(a.map((r) => [r.id, r]));
  const both = b.filter((r) => before.has(r.id));
  for (const key of ["tokens", "chars", "bytes"] as const) {
    const x = stats(both.map((r) => before.get(r.id)![key]));
    const y = stats(both.map((r) => r[key]));
    console.log(`${key.padEnd(6)} before min ${x.min} · median ${x.median} · p90 ${x.p90} · max ${x.max}`);
    console.log(`${"".padEnd(6)} after  min ${y.min} · median ${y.median} · p90 ${y.p90} · max ${y.max}`);
  }
  const grew = both.map((r) => r.tokens - before.get(r.id)!.tokens);
  console.log(`sessions ${both.length}; token change: median ${stats(grew).median}, max ${stats(grew).max}`);
  console.log(`trimmed before ${both.filter((r) => before.get(r.id)!.trimmed).length}, after ${both.filter((r) => r.trimmed).length}; in Codex after ${both.filter((r) => r.codexTrimmed).length}`);
  process.exit(0);
}

const label = args[0];
if (!label) {
  console.error("usage: bun eval/sizes.ts <label> | --compare <a> <b>");
  process.exit(2);
}
const ctx = await createContext();
const db = ctx.store.db;
const rows: Row[] = [];
for (const s of allSessions(db)) {
  if (!s.talked) continue;
  const records = sessionRecords(db, s.id);
  const input = { session: s, records, env: ctx.platform.env, now: ctx.now, lookup: (ref: string, before: string | null) => handedOver(db, ref, before) };
  const h = buildHandoff(input, { fresh: false });
  const c = buildHandoff(input, { fresh: false, limits: { ...LIMITS, bytes: CODEX_BYTES } });
  rows.push({
    id: s.short,
    agent: s.agent,
    turns: s.turns,
    chars: h.text.length,
    tokens: estimateTokens(h.text),
    bytes: Buffer.byteLength(h.text, "utf8"),
    trimmed: h.trimmed,
    codexBytes: Buffer.byteLength(c.text, "utf8"),
    codexTrimmed: c.trimmed,
  });
}
mkdirSync(root, { recursive: true });
writeFileSync(path.join(root, `${label}.json`), JSON.stringify(rows, null, 1) + "\n");
const t = stats(rows.map((r) => r.tokens));
const ch = stats(rows.map((r) => r.chars));
console.log(`${rows.length} sessions · tokens min ${t.min} · median ${t.median} · p90 ${t.p90} · max ${t.max} · chars max ${ch.max} · codex bytes max ${stats(rows.map((r) => r.codexBytes)).max}`);
console.log(`over the limits: ${rows.filter((r) => r.tokens > LIMITS.tokens || r.chars > LIMITS.chars).length}; over Codex's bytes: ${rows.filter((r) => r.codexBytes > CODEX_BYTES).length}; trimmed: ${rows.filter((r) => r.trimmed).length}`);
