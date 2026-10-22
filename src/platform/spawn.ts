
/** Find a command on PATH (on Windows also `.exe`/`.cmd`). */
export function findCommand(name: string, vars: Record<string, string | undefined> = process.env): string | null {
  return Bun.which(name, { PATH: vars.PATH ?? vars.Path ?? "" });
}

/** cmd.exe's special characters (the set cross-spawn escapes). */
const CMD_META = /([()\][%!^"`<>&|;, *?])/g;

/**
 * How to start a program with arguments. On Windows a `.cmd` or `.bat` (an agent
 * installed with npm, say) runs through cmd.exe, and the command line is built the
 * way cross-spawn builds it, so quotes, backticks, parentheses and semicolons in a
 * first message reach the program unchanged.
 */
export function commandLine(exe: string, args: string[], platform: NodeJS.Platform = process.platform): string[] {
  if (platform !== "win32" || !/\.(cmd|bat)$/i.test(exe)) return [exe, ...args];
  // A node_modules\.bin shim hands the arguments to cmd once more.
  const twice = /node_modules[\\/]\.bin[\\/][^\\/]+\.cmd$/i.test(exe);
  const line = [exe.replace(CMD_META, "^$1"), ...args.map((a) => quoteForCmd(a, twice))].join(" ");
  return ["cmd.exe", "/d", "/s", "/c", `"${line}"`];
}

/** One argument for cmd.exe: quoted by the C runtime's rules, then cmd's specials escaped with ^. */
export function quoteForCmd(arg: string, twice = false): string {
  let a = arg.replace(/(\\*)"/g, '$1$1\\"').replace(/(\\*)$/, "$1$1");
  a = `"${a}"`.replace(CMD_META, "^$1");
  return twice ? a.replace(CMD_META, "^$1") : a;
}

/** Run a program in this terminal and wait for it: the user talks to it directly. */
export async function runAttached(cmd: string[], cwd?: string): Promise<number> {
  const [exe, ...args] = cmd;
  const line = commandLine(exe!, args);
  const p = Bun.spawn(line, { cwd, stdin: "inherit", stdout: "inherit", stderr: "inherit", windowsVerbatimArguments: line[0] === "cmd.exe" });
  return await p.exited;
}

