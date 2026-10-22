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
import { lockHolder, processesWhere, processRunning, type ProcessInfo, type ProcessPlace } from "../platform/process";

export interface OpenSession {
  agent: Agent;
  pid: number;
  /** Where its process runs, as the user names it: "WSL: Ubuntu", "Windows". */
  where: string;
  /** Only a guess: the agent runs in the session's folder, and may have another of its sessions open (plan §6 ⑩). */
  maybe?: boolean;
}

/** Listed as open, but its process cannot be checked from here (plan §6 ⑨, R10). */
export interface Unsure {
  agent: Agent;
  /** Where meme can check it instead ("on Windows", "in WSL (Ubuntu)"); null when nowhere. */
  checkable: string | null;
}

export interface OpenCheck {
  /** The sessions open right now, by id. */
  open: Map<string, OpenSession>;
  unsure: Map<string, Unsure>;
  /**
   * For a session with these files: "open"; "unsure" when listed as open but not
   * checkable here; "closed" when its agent keeps a list of open sessions there
   * and nothing in it says open; else "unknown".
   */
  stateOf(id: string, files: string[]): "open" | "unsure" | "closed" | "unknown";
}

/** Where the processes of an agent reading this root run, seen from meme; null when meme cannot look there. */
function placeOf(platform: Platform, root: SourceRoot): ProcessPlace | null {
  if (root.wsl) return { kind: "wsl", place: root.wsl };
  if (root.env === platform.env) return { kind: "here" };
  if (platform.env === "wsl" && root.env === "win") return { kind: "windows" };
  return null;
}

/** Where else a process could be checked: the side it runs on, when that is not here. */
function otherSide(where: ProcessPlace): string | null {
  if (where.kind === "windows") return "on Windows";
  if (where.kind === "wsl") return `in WSL (${where.place.distro})`;
  return null;
}

/** Only sources meme reads now: on Windows, the running WSL distributions. */
export function openCheck(platform: Platform): OpenCheck {
  const open = new Map<string, OpenSession>();
  const unsure = new Map<string, Unsure>();
  /** Roots and whether their agent keeps a list of open sessions that meme can check. */
  const roots: { root: SourceRoot; known: boolean }[] = [];
  const label = (root: SourceRoot) => (root.wsl && platform.env === "win" ? `WSL: ${root.wsl.distro}` : ENV_NAMES[root.env]);
  for (const adapter of ADAPTERS) {
    const byFolder = adapter.openByFolder;
    // One look at the processes of each place, for all the agent's roots there.
    const listed = new Map<string, ProcessInfo[] | null>();
    for (const root of adapter.roots(platform)) {
      const where = placeOf(platform, root);
      if (byFolder) {
        if (!where) {
          roots.push({ root, known: false });
          continue;
        }
        const key = where.kind === "wsl" ? `wsl:${where.place.distro}` : where.kind;
        if (!listed.has(key)) listed.set(key, processesWhere(platform, where, byFolder.isProcess));
        const procs = listed.get(key) ?? null;
        // Closed for sure when none of its processes runs there, or each runs in a folder meme can see (plan §6 ⑩.1).
        roots.push({ root, known: procs !== null && procs.every((p) => p.cwd !== null) });
        for (const proc of procs ?? []) {
          if (!proc.cwd) continue;
          for (const session of byFolder.sessionsIn(root, proc.cwd)) {
            if (!open.has(session)) open.set(session, { agent: adapter.agent, pid: proc.pid, where: label(root), maybe: true });
          }
        }
        continue;
      }
      const entries = where && adapter.openSessions ? adapter.openSessions(root) : null;
      roots.push({ root, known: entries !== null });
      for (const e of entries ?? []) {
        if (open.has(e.session)) continue;
        let pid: number | null = null;
        if (e.pid !== undefined) {
          const running = processRunning(platform, where!, e.pid, e.started ?? null);
          // A process id can be checked on its own side: tasklist on Windows, /proc in WSL.
          if (running === null) unsure.set(e.session, { agent: adapter.agent, checkable: otherSide(where!) });
          else if (running) pid = e.pid;
        } else if (e.lockFile) {
          const holder = lockHolder(platform, where!, e.lockFile);
          // Who holds a lock is known only where /proc is: not on Windows.
          if (holder === null) unsure.set(e.session, { agent: adapter.agent, checkable: where!.kind === "wsl" ? otherSide(where!) : null });
          else if (holder !== false) pid = holder;
        }
        if (pid !== null) {
          unsure.delete(e.session);
          open.set(e.session, { agent: adapter.agent, pid, where: label(root) });
        }
      }
    }
  }
  // A session in a database is `<database>#<id>` (plan §6 ⑪, F3).
  const under = (file: string, dir: string) => {
    const [f, d] = [pathKey(file), pathKey(dir)];
    return f.length > d.length && f.startsWith(d) && "/\\#".includes(f[d.length]!);
  };
  return {
    open,
    unsure,
    stateOf(id, files) {
      if (open.has(id)) return "open";
      if (unsure.has(id)) return "unsure";
      const mine = roots.filter((r) => files.some((f) => under(f, r.root.path)));
      return mine.length && mine.every((r) => r.known) ? "closed" : "unknown";
    },
  };
}
