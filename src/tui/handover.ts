import type { Adapter } from "../adapters/types";
import type { Context, Output } from "../cli/context";
import { displayPath } from "../platform/paths";
import { agentName, coloredLabel } from "../render/labels";
import type { ListFilter } from "../render/ls";
import { ago } from "../render/text";
import type { SessionRow } from "../store/queries";
import { ChoiceView } from "./choose";
import { PickerView } from "./picker";
import { Tui } from "./screen";

export interface Launchable {
  adapter: Adapter;
  exe: string;
}

/**
 * `meme continue` in a terminal (plan §2.3): pick the session from the list
 * (skipped when it was named), then the agent to continue in (skipped with
 * `--in`). The default agent is the session's own when it is installed here.
 */
export async function chooseHandover(
  ctx: Context,
  out: Output,
  filter: ListFilter,
  session: SessionRow | null,
  agents: Launchable[],
  agent: Launchable | null,
): Promise<{ session: SessionRow; agent: Launchable } | null> {
  const tui = new Tui();
  const st = out.st;
  let result: { session: SessionRow; agent: Launchable } | null = null;
  const done = (s: SessionRow, a: Launchable) => {
    result = { session: s, agent: a };
    tui.quit();
  };

  const agentView = (s: SessionRow) => {
    const facts = [s.project ? displayPath(s.project, ctx.platform.home) : null, s.branch, ago(s.ended_at, ctx.now, true)].filter(Boolean);
    const head = [
      ` ${st.bold("Continue in which agent?")}`,
      "",
      ` ${st.bold(s.title ?? "(untitled)")}  [${coloredLabel(st, s.agent, s.env)}]`,
      ` ${st.dim(facts.join(" · "))}`,
      "",
      st.dim(" meme starts the agent in the session's project; its first message asks it to run `meme continue` for this session."),
    ];
    const def = Math.max(0, agents.findIndex((a) => a.adapter.agent === s.agent));
    return new ChoiceView(tui, st, head, agents.map((a) => ({ label: agentName(a.adapter.agent), note: a.exe })), def, (i) => done(s, agents[i]!));
  };

  const pick = (s: SessionRow) => (agent ? done(s, agent) : tui.push(agentView(s)));
  await tui.run(session ? agentView(session) : new PickerView(tui, ctx, out, filter, { title: "Continue which session?", verb: "continue", onPick: pick }));
  return result;
}
