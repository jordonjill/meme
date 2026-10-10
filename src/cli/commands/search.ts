import { displayPath, samePath } from "../../platform/paths";
import { searchText } from "../../render/search";
import { allSessions, ancestors, resolveSession } from "../../store/queries";
import { compile, groupByChain, PatternError, search as runSearch } from "../../store/search";
import { intOption, parse, UsageError } from "../args";
import { createContext, output, write } from "../context";

export const searchHelp = `Usage: meme search <pattern> [-F] [-i] [-C <lines>] [-a] [--session <session>] [--all] [--plain]

Search past sessions. Works like rg: the pattern is a regular expression.
Matches in what you and the AI said are listed; matches in tool calls and tool
output are only counted unless you add --all. Injected messages are not
searched, and text copied into a continued session counts once.

  -F, --fixed-strings   the pattern is plain text
  -i, --ignore-case     ignore case
  -C, --context <n>     show n lines around each match
  -a                    all projects (default: the current project, or all of
                        them when it has no sessions; matches elsewhere are counted)
  --session <session>   only this session (and the sessions it continued)
  --all                 also list matches in tool calls and tool output (use it to
                        find commands, errors and code), and every match
  --plain               plain text, even in a terminal
`;

export async function search(argv: string[]): Promise<number> {
  const { values, positionals } = parse(argv, {
    "fixed-strings": { type: "boolean", short: "F" },
    "ignore-case": { type: "boolean", short: "i" },
    context: { type: "string", short: "C" },
    a: { type: "boolean", short: "a" },
    session: { type: "string" },
    all: { type: "boolean" },
    plain: { type: "boolean" },
    help: { type: "boolean", short: "h" },
  });
  if (values.help) {
    write(searchHelp);
    return 0;
  }
  if (positionals.length !== 1) throw new UsageError(positionals.length ? "search takes one pattern; quote it if it has spaces" : "search needs a pattern");
  const context = intOption(values.context, "-C") ?? 0;
  const query = { pattern: positionals[0]!, fixed: Boolean(values["fixed-strings"]), ignoreCase: Boolean(values["ignore-case"]) };
  try {
    compile(query);
  } catch (err) {
    if (err instanceof PatternError) throw new UsageError(err.message);
    throw err;
  }
  const ctx = await createContext();
  const db = ctx.store.db;
  const rows = allSessions(db);
  // The current project by default, like `meme ls` (plan §3.3): all projects when it
  // has no sessions; when it has, the matches in other projects are counted too.
  const where = displayPath(ctx.project, ctx.platform.home);
  let scope: string[] | null;
  let notice: string | undefined;
  let mine = false;
  if (values.session) {
    const s = resolveSession(db, values.session);
    scope = [...ancestors(db, s.id).map((a) => a.id), s.id];
  } else if (values.a) scope = null;
  else {
    scope = rows.filter((r) => r.project !== null && samePath(r.project, ctx.project)).map((r) => r.id);
    mine = scope.length > 0;
    if (!mine) {
      scope = null;
      notice = `No sessions in ${where} — searching all projects`;
    }
  }

  const byId = new Map(rows.map((r) => [r.id, r]));
  const groups = groupByChain(db, runSearch(db, { ...query, context, sessions: scope }), byId);
  let elsewhere: { groups: ReturnType<typeof groupByChain>; where: string } | undefined;
  if (mine) {
    const here = new Set(scope);
    const others = runSearch(db, { ...query, context: 0, sessions: null }).filter((h) => !here.has(h.session));
    if (others.length) elsewhere = { groups: groupByChain(db, others, byId), where };
  }
  const out = output(Boolean(values.plain));
  const all = Boolean(values.all);
  write(searchText(groups, { st: out.st, width: out.width, now: ctx.now, all, perSession: all || values.session ? Infinity : 3, notice, elsewhere }));
  return 0;
}
