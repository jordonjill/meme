import { existsSync } from "node:fs";
import { claudeCode } from "./claude-code";
import { codex } from "./codex";
import { openCode } from "./opencode";
import { pi } from "./pi";
import type { Platform } from "../platform/paths";
import { findCommand } from "../platform/spawn";
import type { Adapter, Agent, SourceRoot } from "./types";

export const ADAPTERS: readonly Adapter[] = [claudeCode, codex, openCode, pi];

/** Agents that can be started here: their command is on PATH. */
export function launchable(platform: Platform): { adapter: Adapter; exe: string }[] {
  const out: { adapter: Adapter; exe: string }[] = [];
  for (const adapter of ADAPTERS) {
    const exe = findCommand(adapter.launch("").cmd, platform.vars);
    if (exe) out.push({ adapter, exe });
  }
  return out;
}

export function adapterFor(agent: Agent): Adapter | undefined {
  return ADAPTERS.find((a) => a.agent === agent);
}

/**
 * Whether the agent is installed where a source is: its home is there (plan §6 ⑧.3).
 * A source that cannot be read is "not installed" then, not an error.
 */
export function installedAt(root: Pick<SourceRoot, "agent" | "env" | "path">): boolean {
  const adapter = adapterFor(root.agent);
  return !adapter || existsSync(adapter.homeOf({ id: "", ...root }));
}

/**
 * Why a source could not be read, as `status` and `install` say it: the agent is
 * not installed there; installed, with no sessions yet (nothing mirrored from it);
 * or something is wrong, and nothing of what meme has from it was deleted (plan §6 ⑨, R9).
 */
export function sourceTrouble(root: Pick<SourceRoot, "agent" | "env"> & { root: string; sessions: number }): string {
  if (!installedAt({ agent: root.agent, env: root.env, path: root.root })) return "not installed";
  return root.sessions ? "NOT READABLE (nothing deleted)" : "no sessions yet";
}
