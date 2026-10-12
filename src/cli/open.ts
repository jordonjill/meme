/**
 * Sessions open in an agent right now (plan §6 ⑧.3): the agent lists them as open,
 * and the process it names still runs. `meme forget` does not delete them; where
 * meme cannot tell, it falls back to "written in the last few minutes".
 */
import { ADAPTERS } from "../adapters";
import type { Agent, SourceRoot } from "../adapters/types";
import { ENV_NAMES } from "../platform/env";
import type { Platform } from "../platform/paths";
import { processRunning, type ProcessPlace } from "../platform/process";

export interface OpenSession {
  agent: Agent;
  pid: number;
  /** Where its process runs, as the user names it: "WSL: Ubuntu", "Windows". */
  where: string;
}

/** Where the processes of an agent reading this root run, seen from meme; null when meme cannot look there. */
function placeOf(platform: Platform, root: SourceRoot): ProcessPlace | null {
  if (root.wsl) return { kind: "wsl", place: root.wsl };
  if (root.env === platform.env) return { kind: "here" };
  if (platform.env === "wsl" && root.env === "win") return { kind: "windows" };
  return null;
}

/** By session id. Only sources meme reads now: on Windows, the running WSL distributions. */
export function openSessions(platform: Platform): Map<string, OpenSession> {
  const out = new Map<string, OpenSession>();
  for (const adapter of ADAPTERS) {
    if (!adapter.openSessions) continue;
    for (const root of adapter.roots(platform)) {
      const where = placeOf(platform, root);
      if (!where) continue;
      for (const e of adapter.openSessions(root)) {
        if (out.has(e.session) || processRunning(platform, where, e.pid, e.started) !== true) continue;
        out.set(e.session, { agent: adapter.agent, pid: e.pid, where: root.wsl && platform.env === "win" ? `WSL: ${root.wsl.distro}` : ENV_NAMES[root.env] });
      }
    }
  }
  return out;
}
