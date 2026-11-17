import { digest, markSeen } from "../../memory/digest";
import { storeDir } from "../../memory/place";
import { memoryPaths } from "../../memory/store";
import type { ChangeRecord } from "../../memory/apply";
import { currentPlatform } from "../../platform/paths";
import { when } from "../../render/text";
import { write } from "../context";

/** Where an entry is, in words: its file, or its project's. */
function where(shelf: string | undefined): string {
  if (!shelf) return "";
  const m = /^projects\/(.+?)-[0-9a-f]{8}\/(MEMORY|EXPERIENCE)$/.exec(shelf);
  if (m) return `${m[1]}${m[2] === "EXPERIENCE" ? ", experience" : ""}`;
  return { RULES: "rules", USER: "about you", EXPERIENCE: "experience" }[shelf] ?? shelf;
}

const row = (r: ChangeRecord) => `  ${r.id}  ${r.text}  (${[where(r.shelf), r.from].filter(Boolean).join(" · ")})`;

export function digestCommand(o: { all: boolean }): number {
  const platform = currentPlatform();
  const p = memoryPaths(storeDir(platform));
  const now = new Date();
  const d = digest(p);
  const lines: string[] = [];
  const section = (title: string, rows: string[]) => {
    if (!rows.length) return;
    lines.push("", `${title} (${rows.length})`, ...rows);
  };
  section("Remembered", d.added.map(row));
  section("Replaced an older entry", d.replaced.map((r) => `${row(r)}${r.replaces ? `, in place of ${r.replaces}` : ""}`));
  section("Now in force, seen a second time", d.inForce.map(row));
  section("Reworded", d.updated.map(row));
  section("Waiting to be seen once more before it takes effect", d.waiting.map((e) => `  ${e.id}  ${e.text}`));
  if (d.declined.length) {
    if (o.all) section("Not kept: meant for that time only", d.declined.map((x) => `  ${x.words}  (${x.from}, ${when(x.at, now)})`));
    else lines.push("", `Not kept, as meant for that time only: ${d.declined.length} (--all lists them)`);
  }
  if (d.forgotten) lines.push("", `Forgotten at your request: ${d.forgotten}`);
  const since = d.since ? `since you last looked (${when(d.since, now)})` : "so far";
  if (!lines.length) {
    write(`Nothing new ${since}. \`meme memory\` lists everything remembered.\n`);
  } else {
    write(`What meme did with your memory ${since}:\n${lines.join("\n")}\n\n\`meme memory show <id>\` tells where an entry comes from; \`meme memory forget <id>\` removes it.\n`);
  }
  markSeen(p, now);
  return 0;
}
