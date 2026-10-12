/**
 * Handoff sizes over every session in the mirror (plan step 6, task 7): counts
 * only, no session content. Each session is measured where it may be printed:
 * inside each agent (its limits), and where the agent is not known (the tightest).
 *
 *   bun eval/sizes.ts <label>      prints a summary, writes .cache/eval/sizes/<label>.json
 *   bun eval/sizes.ts --compare <a> <b>
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { PROFILES } from "../src/adapters/profiles";
import { createContext } from "../src/cli/context";
import { estimateTokens, limitsIn, type Limits } from "../src/handoff/budget";
import { buildHandoff } from "../src/handoff/build";
import { allSessions, handedOver, sessionRecords } from "../src/store/queries";

interface Size {
  chars: number;
  tokens: number;
  bytes: number;
  /** Something was cut or left out to fit. */
  trimmed: boolean;
}

interface Row {
  id: string;
  agent: string;
  turns: number;
  /** By where it is printed: an agent, or "unknown". */
  in: Record<string, Size>;
}

const root = path.resolve(import.meta.dir, "..", ".cache", "eval", "sizes");
const args = process.argv.slice(2);
const WHERE: [string, Limits][] = [...PROFILES.map((p) => [p.agent, limitsIn(p)] as [string, Limits]), ["unknown", limitsIn(null)]];

function stats(xs: number[]) {
  const s = [...xs].sort((a, b) => a - b);
  const at = (p: number) => s[Math.min(s.length - 1, Math.floor(p * s.length))] ?? 0;
  return { min: s[0] ?? 0, median: at(0.5), p90: at(0.9), max: s.at(-1) ?? 0 };
}
const over = (x: Size, l: Limits) => x.tokens > l.tokens || (l.chars !== undefined && x.chars > l.chars) || (l.bytes !== undefined && x.bytes > l.bytes);

if (args[0] === "--compare") {
  const [a, b] = [args[1]!, args[2]!].map((l) => JSON.parse(readFileSync(path.join(root, `${l}.json`), "utf8")) as Row[]);
  const before = new Map(a.map((r) => [r.id, r]));
  for (const [where] of WHERE) {
    const both = b.filter((r) => before.get(r.id)?.in?.[where] && r.in[where]);
    const grew = both.filter((r) => r.in[where]!.bytes > before.get(r.id)!.in[where]!.bytes).map((r) => r.id);
    const shrank = both.filter((r) => r.in[where]!.bytes < before.get(r.id)!.in[where]!.bytes).map((r) => r.id);
    console.log(`${where}: ${both.length} sessions; longer: ${grew.join(", ") || "none"}; shorter: ${shrank.join(", ") || "none"}`);
  }
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
  const sizes: Record<string, Size> = {};
  for (const [where, limits] of WHERE) {
    const h = buildHandoff(input, { fresh: false, limits });
    sizes[where] = { chars: h.text.length, tokens: estimateTokens(h.text), bytes: Buffer.byteLength(h.text, "utf8"), trimmed: h.trimmed };
  }
  rows.push({ id: s.short, agent: s.agent, turns: s.turns, in: sizes });
}
mkdirSync(root, { recursive: true });
writeFileSync(path.join(root, `${label}.json`), JSON.stringify(rows, null, 1) + "\n");
for (const [where, limits] of WHERE) {
  const xs = rows.map((r) => r.in[where]!);
  const t = stats(xs.map((x) => x.tokens));
  console.log(
    `${where}: ${rows.length} sessions · tokens median ${t.median}, max ${t.max} · chars max ${stats(xs.map((x) => x.chars)).max} · bytes max ${stats(xs.map((x) => x.bytes)).max} · over its limits ${xs.filter((x) => over(x, limits)).length} · trimmed ${xs.filter((x) => x.trimmed).length}`,
  );
}
