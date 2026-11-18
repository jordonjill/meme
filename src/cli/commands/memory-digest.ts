import { digest, forAgents, markSeen, type Changed, type Digest } from "../../memory/digest";
import { storeDir } from "../../memory/place";
import { memoryPaths } from "../../memory/store";
import { currentPlatform } from "../../platform/paths";
import { when } from "../../render/text";
import { write } from "../context";

/** Where an entry is, in words: its file, or its project's. */
function where(shelf: string): string {
  const m = /^projects\/(.+?)-[0-9a-f]{8}\/(MEMORY|EXPERIENCE)$/.exec(shelf);
  if (m) return `${m[1]}${m[2] === "EXPERIENCE" ? ", experience" : ""}`;
  return { RULES: "rules", USER: "about you", MEMORY: "memory", EXPERIENCE: "experience" }[shelf] ?? shelf;
}

/** Where an entry was learned, without its project when its file already says it: `<agent> · tool` in tool's file is `<agent>`. */
function learned(r: Changed): string {
  const project = /^projects\/(.+?)-[0-9a-f]{8}\//.exec(r.shelf)?.[1];
  return (r.from ?? "")
    .split(" · ")
    .filter((part) => !project || part.toLowerCase() !== project)
    .join(" · ");
}

/** `5: 2 in force, 3 waiting`; `3, waiting` when there is one kind; null when there is nothing. */
function count(parts: [n: number, words: string][]): string | null {
  const some = parts.filter(([n]) => n);
  if (!some.length) return null;
  if (some.length === 1) return `${some[0]![0]}, ${some[0]![1]}`;
  return `${some.reduce((sum, [n]) => sum + n, 0)}: ${some.map(([n, w]) => `${n} ${w}`).join(", ")}`;
}

/** What happened to an entry agents read, said after its file. */
function how(r: Changed, d: Digest): string {
  if (d.replaced.includes(r)) return r.replaces ? `in place of ${r.replaces}` : "in place of an older entry";
  if (d.inForce.includes(r)) return "took effect";
  if (d.updated.includes(r)) return "reworded";
  return "";
}

/**
 * The digest (plan-m2 F13): counts first, then only the entries agents now read that
 * changed, each with its file; `--all` lists everything counted, with where it was learned.
 */
export function digestCommand(o: { all: boolean }): number {
  const platform = currentPlatform();
  const p = memoryPaths(storeDir(platform));
  const now = new Date();
  const d = digest(p);
  const since = d.since ? `since you last looked (${when(d.since, now)})` : "so far";

  const waiting = d.added.filter((r) => r.status === "candidate").length;
  const summary = (
    [
      ["Remembered", count([[d.added.length - waiting, "in force"], [waiting, "waiting to be seen again"]])],
      ["Changed", count([[d.replaced.length, "in place of an older entry"], [d.updated.length, "reworded"]])],
      ["Took effect", count([[d.inForce.length, "seen a second time"]])],
    ] as const
  )
    .filter(([, c]) => c)
    .map(([what, c]) => `  ${what} ${c}`);
  const left = [d.declined.length ? `Not kept ${d.declined.length}` : "", d.forgotten ? `Forgotten ${d.forgotten}` : ""].filter(Boolean);
  if (left.length) summary.push(`  ${left.join(" · ")}`);

  const out: string[] = [summary.length ? `What changed in your memory ${since}:` : `Nothing new ${since}.`, ...summary, ""];
  if (!d.held.length) {
    out.push('Nothing remembered yet. `meme remember "…"` keeps a rule or a fact.');
  } else {
    const inForce = d.held.filter((h) => h.entry.status === "active").length;
    const files = new Map<string, number>();
    for (const h of d.held) {
      const name = h.shelf.startsWith("projects/") ? "projects" : where(h.shelf);
      files.set(name, (files.get(name) ?? 0) + 1);
    }
    const order = ["rules", "about you", "memory", "experience", "projects"];
    out.push(`Memory now: ${d.held.length} ${d.held.length === 1 ? "entry" : "entries"}, ${inForce} in force, ${d.held.length - inForce} waiting`, `  ${order.filter((f) => files.has(f)).map((f) => `${f} ${files.get(f)}`).join(" · ")}`);
  }

  const check = forAgents(d);
  if (check.length) out.push("", "Agents now read these; check them:", ...check.map((r) => `  ${r.id}  ${r.text}  (${[where(r.shelf), how(r, d)].filter(Boolean).join("; ")})`));

  if (o.all) {
    const row = (r: Changed, state: string) => `  ${r.id}  ${r.text}  (${[where(r.shelf), state, learned(r)].filter(Boolean).join(" · ")})`;
    const section = (title: string, rows: string[]) => {
      if (rows.length) out.push("", `${title} (${rows.length})`, ...rows);
    };
    section("Remembered", d.added.map((r) => row(r, r.status === "active" ? "in force" : "waiting")));
    section("Changed", [...d.replaced.map((r) => row(r, how(r, d))), ...d.updated.map((r) => row(r, r.status === "active" ? "reworded" : "reworded, waiting"))]);
    section("Took effect", d.inForce.map((r) => row(r, "")));
    section("Not kept", d.declined.map((x) => `  ${x.words}  (${x.why ?? "meant for that time only"}; ${x.from}, ${when(x.at, now)})`));
    // What waits from before is not counted above: listed here, so that --all shows every entry that does not take effect yet.
    const listed = new Set(d.added.map((r) => r.id));
    section("Still waiting from before", d.held.filter((h) => h.entry.status === "candidate" && !listed.has(h.entry.id)).map((h) => `  ${h.entry.id}  ${h.entry.text}  (${where(h.shelf)})`));
  }
  const hints = [!o.all && summary.length ? "`meme memory digest --all` lists every one of them, with where each was learned." : "", d.held.length ? "`meme memory show <id>` tells where an entry comes from; `meme memory forget <id>` removes it." : ""].filter(Boolean);
  if (hints.length) out.push("", ...hints);
  write(out.join("\n") + "\n");
  markSeen(p, now);
  return 0;
}
