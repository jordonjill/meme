import { claudeCode } from "./claude-code";
import { codex } from "./codex";
import type { Platform } from "../platform/paths";
import { findCommand } from "../platform/spawn";
import type { Adapter, Agent } from "./types";

export const ADAPTERS: readonly Adapter[] = [claudeCode, codex];

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
