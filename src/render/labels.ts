import { profileOf } from "../adapters/profiles";
import type { Agent } from "../adapters/types";
import type { Env } from "../platform/env";

/** ANSI styling that turns into plain text when colors are off. */
export interface Style {
  color: boolean;
  bold(s: string): string;
  dim(s: string): string;
  italic(s: string): string;
  inverse(s: string): string;
  red(s: string): string;
  green(s: string): string;
  yellow(s: string): string;
  cyan(s: string): string;
  match(s: string): string;
  fg(code: number, s: string): string;
}

const wrapCode = (open: string, close: string) => (s: string) => `\x1b[${open}m${s}\x1b[${close}m`;

export function makeStyle(color: boolean): Style {
  if (!color) {
    const id = (s: string) => s;
    return { color, bold: id, dim: id, italic: id, inverse: id, red: id, green: id, yellow: id, cyan: id, match: id, fg: (_c, s) => s };
  }
  return {
    color,
    bold: wrapCode("1", "22"),
    dim: wrapCode("2", "22"),
    italic: wrapCode("3", "23"),
    inverse: wrapCode("7", "27"),
    red: wrapCode("31", "39"),
    green: wrapCode("32", "39"),
    yellow: wrapCode("33", "39"),
    cyan: wrapCode("36", "39"),
    match: wrapCode("1;31", "22;39"),
    fg: (code, s) => `\x1b[38;5;${code}m${s}\x1b[39m`,
  };
}

export const ENV_SHORT: Record<Env, string> = { wsl: "WSL", win: "Win", mac: "Mac", linux: "Linux" };

/** The source label, `<short name>·WSL`: the agent's short name from its profile. */
export function label(agent: Agent, env: Env): string {
  return `${profileOf(agent)?.short ?? agent}·${ENV_SHORT[env] ?? env}`;
}

export function agentName(agent: Agent): string {
  return profileOf(agent)?.name ?? agent;
}

export function coloredLabel(st: Style, agent: Agent, env: Env): string {
  return st.fg(profileOf(agent)?.color ?? 250, label(agent, env));
}
