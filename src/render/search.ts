import type { Hit, HitGroup } from "../store/search";
import { coloredLabel, type Style } from "./labels";
import { day, padEnd, plural, truncate, visible, width } from "./text";

export interface SearchTextOptions {
  st: Style;
  width: number;
  now: number;
  /** `--tools`: list hits in tool calls and tool output too. */
  tools: boolean;
  /** Hits listed per session before `… N more`. */
  perSession: number;
  /** First line: the current project has no sessions, so all projects were searched. */
  notice?: string;
  /** Only the current project (`where`) was searched: these are the hits in the others (plan §3.3). */
  elsewhere?: { groups: HitGroup[]; where: string };
}

const ROLE: Record<string, string> = { user: "You:", assistant: "AI:", tool: "Tool:", system: "Sys:", observation: "Sys:" };

function roleLabel(h: Hit): string {
  return h.call ? "Call:" : (ROLE[h.role] ?? h.role + ":");
}

/** The matching line, cut down to `room` columns around the match. */
export function snippet(line: string, start: number, end: number, room: number, st: Style): string {
  const flat = (s: string) => visible(s.replace(/\s/g, " "));
  let pre = flat(line.slice(0, start)).trimStart();
  const match = flat(line.slice(start, end));
  let post = flat(line.slice(end));
  if (width(match) >= room) return st.match(truncate(match, room));
  const free = room - width(match);
  // Some text before the match, more if the line ends soon after it.
  const before = Math.max(Math.floor(free * 0.35), free - width(post));
  if (width(pre) > before) {
    let kept = "";
    for (const ch of [...pre].reverse()) {
      if (width(kept) + width(ch) > before - 1) break;
      kept = ch + kept;
    }
    pre = "…" + kept;
  }
  const after = free - width(pre);
  if (width(post) > after) post = truncate(post, after);
  return pre + st.match(match) + post;
}

/** What people said, as opposed to what tools were given or returned. */
const said = (h: Hit) => !h.call && !h.toolOutput;

/**
 * Search results (plan §3.3). By default only what the user and the AI said is
 * listed; hits in tool calls and tool output are counted on the first line, and
 * `--tools` lists them too.
 */
export function searchText(groups: HitGroup[], o: SearchTextOptions): string {
  const listedOf = (g: HitGroup) => (o.tools ? g.hits : g.hits.filter(said));
  const count = (pick: (h: Hit) => boolean) => groups.reduce((n, g) => n + g.hits.filter(pick).length, 0);
  const listed = groups.reduce((n, g) => n + listedOf(g).length, 0);
  const calls = count((h) => h.call);
  const output = count((h) => h.toolOutput);
  const away = o.elsewhere ? elsewhereText(o.elsewhere.groups, listedOf) : null;
  const top = o.notice ? [o.notice] : [];
  if (listed + calls + output === 0) {
    const none = away && o.elsewhere ? `No matches in ${o.elsewhere.where}; ${away}` : "No matches.";
    return [...top, none].join("\n") + "\n";
  }
  const shownGroups = groups.filter((g) => listedOf(g).length > 0);
  const extra = [calls ? `+${calls} in tool calls` : "", output ? `+${output} in tool output` : ""].filter(Boolean).join(", ");
  const hidden = !o.tools && extra ? ` (${extra}; use --tools)` : "";
  const out = [...top, listed ? `${plural(listed, "match", "matches")} in ${plural(shownGroups.length, "session")}${hidden}` : `No matches in what was said${hidden}`];

  for (const g of shownGroups) {
    const hits = listedOf(g);
    const s = g.head;
    out.push("");
    out.push(`${o.st.bold(s.title ?? "(untitled)")}  [${coloredLabel(o.st, s.agent, s.env)}]  ${day(s.ended_at, new Date(o.now))}  ${plural(hits.length, "match", "matches")}`);
    for (const h of hits.slice(0, o.perSession)) {
      const turn = g.turnInHead.get(h) ?? h.turn;
      const prefix = `  turn ${String(turn).padStart(3)}  ${padEnd(roleLabel(h), 6)}`;
      for (const c of h.before) out.push(o.st.dim(" ".repeat(width(prefix)) + truncate(visible(c.replace(/\s/g, " ")), o.width - width(prefix))));
      out.push(prefix + snippet(h.line, h.start, h.end, Math.max(20, o.width - width(prefix)), o.st));
      for (const c of h.after) out.push(o.st.dim(" ".repeat(width(prefix)) + truncate(visible(c.replace(/\s/g, " ")), o.width - width(prefix))));
    }
    if (hits.length > o.perSession) out.push(o.st.dim(`  … ${hits.length - o.perSession} more`));
    const first = hits[0]!;
    const firstTurn = g.turnInHead.get(first);
    out.push(
      firstTurn === null || firstTurn === undefined
        ? `  → meme show ${g.shorts.get(first.session)} ${first.turn}`
        : `  → meme show ${s.short} ${firstTurn}`,
    );
  }
  if (away) out.push("", `+${away}`);
  return out.join("\n") + "\n";
}

/** What other projects have, counted the way the list counts: what was said, or everything with --tools. */
function elsewhereText(groups: HitGroup[], listedOf: (g: HitGroup) => Hit[]): string | null {
  const listed = groups.reduce((n, g) => n + listedOf(g).length, 0);
  if (listed) return `${plural(listed, "match", "matches")} in ${plural(groups.filter((g) => listedOf(g).length).length, "session")} in other projects (use -a)`;
  const tools = groups.reduce((n, g) => n + g.hits.length, 0);
  return tools ? `${tools} in tool calls and tool output in other projects (use -a --tools)` : null;
}
