import type { Adapter } from "../adapters/types";
import type { Context, Output } from "../cli/context";
import { displayPath } from "../platform/paths";
import { agentName, coloredLabel } from "../render/labels";
import type { ListFilter } from "../render/ls";
import { ago } from "../render/text";
import type { WslPlace } from "../platform/wsl";
import type { SessionRow } from "../store/queries";
import { ChoiceView } from "./choose";
import { PickerView } from "./picker";
import { Tui } from "./screen";

export interface Launchable {
  adapter: Adapter;
  exe: string;
  /** The agent is in this WSL distribution and starts through wsl.exe (plan step 5). */
  wsl?: WslPlace;
}

/** What a session can be continued in: agents, or why there are none. */
export type AgentChoice = { agents: Launchable[] } | { problem: string };

export type Handover = { session: SessionRow; agent: Launchable } | { session: SessionRow; problem: string };

/**
 * `meme continue` in a terminal (plan §2.3): pick the session from the list
 * (skipped when it was named), then the agent to continue in (skipped with
 * `--in`, which `agentsFor` has already narrowed to). The default agent is the
 * session's own when it is there. Which agents there are depends on the session:
 * a WSL session seen from Windows continues in WSL.
 */
export async function chooseHandover(
  ctx: Context,
  out: Output,
  filter: ListFilter,
  session: SessionRow | null,
  agentsFor: (s: SessionRow) => AgentChoice,
  given: boolean,
): Promise<Handover | null> {
  const tui = new Tui();
  const st = out.st;
  let result: Handover | null = null;
  const done = (r: Handover) => {
    result = r;
    tui.quit();
  };

  const agentView = (s: SessionRow, agents: Launchable[]) => {
    const inWsl = agents[0]?.wsl;
    const facts = [s.project ? displayPath(s.project, ctx.platform.home) : null, s.branch, ago(s.ended_at, ctx.now, true)].filter(Boolean);
    const head = [
      ` ${st.bold("Continue in which agent?")}`,
      "",
      ` ${st.bold(s.title ?? "(untitled)")}  [${coloredLabel(st, s.agent, s.env)}]`,
      ` ${st.dim(facts.join(" · "))}`,
      "",
      st.dim(` meme starts the agent ${inWsl ? `in WSL (${inWsl.distro}), ` : ""}in the session's project; its first message asks it to run \`meme continue\` for this session.`),
    ];
    const def = Math.max(0, agents.findIndex((a) => a.adapter.agent === s.agent));
    const choices = agents.map((a) => ({ label: agentName(a.adapter.agent), note: a.wsl ? `${a.exe} (WSL: ${a.wsl.distro})` : a.exe }));
    return new ChoiceView(tui, st, head, choices, def, (i) => done({ session: s, agent: agents[i]! }));
  };

  const pick = (s: SessionRow) => {
    const c = agentsFor(s);
    if ("problem" in c) done({ session: s, problem: c.problem });
    else if (given) done({ session: s, agent: c.agents[0]! });
    else tui.push(agentView(s, c.agents));
  };
  if (session) {
    const c = agentsFor(session);
    if ("problem" in c) return { session, problem: c.problem };
    await tui.run(agentView(session, c.agents));
  } else {
    await tui.run(new PickerView(tui, ctx, out, filter, { title: "Continue which session?", verb: "continue", onPick: pick }));
  }
  return result;
}
