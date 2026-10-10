import type { Env } from "./env";

/** Find a command on PATH (on Windows also `.exe`/`.cmd`). */
export function findCommand(name: string, vars: Record<string, string | undefined> = process.env): string | null {
  return Bun.which(name, { PATH: vars.PATH ?? vars.Path ?? "" });
}

/** Run a program in this terminal and wait for it: the user talks to it directly. */
export async function runAttached(cmd: string[], cwd?: string): Promise<number> {
  const p = Bun.spawn(cmd, { cwd, stdin: "inherit", stdout: "inherit", stderr: "inherit" });
  return await p.exited;
}

/** `$VISUAL`, then `$EDITOR` (which may carry flags, e.g. `code --wait`), then a default. */
export function editorCommand(env: Env, vars: Record<string, string | undefined> = process.env): string[] {
  const configured = (vars.VISUAL || vars.EDITOR || "").trim();
  if (configured) return configured.split(/\s+/);
  return [env === "win" ? "notepad" : "vi"];
}
