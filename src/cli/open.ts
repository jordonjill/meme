/**
 * Whether sessions are open in an agent right now (plan §6 ⑧.3, ⑧.4): the agent
 * lists them as open, and the process it names still runs, or still holds the
 * session's lock. `meme forget` deletes none that is open, nor one meme cannot
 * tell about that was written in the last few minutes.
 */
import { ADAPTERS } from "../adapters";
import type { Agent, SourceRoot } from "../adapters/types";
import { ENV_NAMES } from "../platform/env";
import { pathKey, type Platform } from "../platform/paths";
import { lockHolder, processRunning, type ProcessPlace } from "../platform/process";

export interface OpenSession {
  agent: Agent;
  pid: number;
  /** Where its process runs, as the user names it: "WSL: Ubuntu", "Windows". */
  where: string;
}

export interface OpenCheck {
  /** The sessions open right now, by id. */
  open: Map<string, OpenSession>;
  /**
   * For a session with these files: "open"; "closed" when its agent keeps a list
   * of open sessions there and nothing in it says open; else "unknown".
   */
  stateOf(id: string, files: string[]): "open" | "closed" | "unknown";
}

/** Where the processes of an agent reading this root run, seen from meme; null when meme cannot look there. */
function placeOf(platform: Platform, root: SourceRoot): ProcessPlace | null {
  if (root.wsl) return { kind: "wsl", place: root.wsl };
  if (root.env === platform.env) return { kind: "here" };
  if (platform.env === "wsl" && root.env === "win") return { kind: "windows" };
  return null;
}

/** Only sources meme reads now: on Windows, the running WSL distributions. */
export function openCheck(platform: Platform): OpenCheck {
  const open = new Map<string, OpenSession>();
  /** Listed as open, but whether they still are cannot be told. */
  const unsure = new Set<string>();
  /** Roots and whether their agent keeps a list of open sessions that meme can check. */
  const roots: { root: SourceRoot; known: boolean }[] = [];
  for (const adapter of ADAPTERS) {
    for (const root of adapter.roots(platform)) {
      const where = placeOf(platform, root);
      const entries = where && adapter.openSessions ? adapter.openSessions(root) : null;
      roots.push({ root, known: entries !== null });
      for (const e of entries ?? []) {
        if (open.has(e.session)) continue;
        let pid: number | null = null;
        if (e.pid !== undefined) {
          const running = processRunning(platform, where!, e.pid, e.started ?? null);
          if (running === null) unsure.add(e.session);
          else if (running) pid = e.pid;
        } else if (e.lockFile) {
          const holder = lockHolder(platform, where!, e.lockFile);
          if (holder === null) unsure.add(e.session);
          else if (holder !== false) pid = holder;
        }
        if (pid !== null) open.set(e.session, { agent: adapter.agent, pid, where: root.wsl && platform.env === "win" ? `WSL: ${root.wsl.distro}` : ENV_NAMES[root.env] });
      }
    }
  }
  const under = (file: string, dir: string) => {
    const [f, d] = [pathKey(file), pathKey(dir)];
    return f.length > d.length && f.startsWith(d) && "/\\".includes(f[d.length]!);
  };
  return {
    open,
    stateOf(id, files) {
      if (open.has(id)) return "open";
      const mine = roots.filter((r) => files.some((f) => under(f, r.root.path)));
      return mine.length && mine.every((r) => r.known) && !unsure.has(id) ? "closed" : "unknown";
    },
  };
}
