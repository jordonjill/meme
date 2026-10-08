import { buildShow, showText } from "../../render/show";
import { resolveSession } from "../../store/queries";
import { runViewer } from "../../tui/viewer";
import { intOption, parse, UsageError } from "../args";
import { createContext, output, write } from "../context";

export const showHelp = `Usage: meme show <session> [<turn>] [--full] [--all] [--plain]

Show a session with each turn folded into one line. The session id can be
shortened to any unique prefix.

  <turn>     one turn in full: every step, the first lines of each result
  --full     every turn in full, nothing cut
  --all      also injected messages and reasoning
  --plain    plain text, even in a terminal

In a terminal: ↑↓ select a turn, Enter expand, / search, Esc back.
`;

export async function show(argv: string[]): Promise<number> {
  const { values, positionals } = parse(argv, {
    full: { type: "boolean" },
    all: { type: "boolean" },
    plain: { type: "boolean" },
    help: { type: "boolean", short: "h" },
  });
  if (values.help) {
    write(showHelp);
    return 0;
  }
  if (positionals.length === 0) throw new UsageError("show needs a session id; run `meme ls` to find one");
  if (positionals.length > 2) throw new UsageError(`too many arguments: ${positionals.slice(2).join(" ")}`);
  const turn = intOption(positionals[1], "turn", 1);
  const ctx = createContext();
  const model = buildShow(ctx.store.db, resolveSession(ctx.store.db, positionals[0]!));
  const out = output(Boolean(values.plain));
  const opts = { st: out.st, width: out.width, home: ctx.platform.home, now: ctx.now, full: Boolean(values.full), all: Boolean(values.all), wrap: false };
  if (out.interactive && !values.full) {
    await runViewer(ctx, out, model, { turn, all: opts.all });
    return 0;
  }
  write(showText(model, opts, turn ?? (values.full ? "all" : "none")));
  return 0;
}
