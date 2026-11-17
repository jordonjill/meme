/**
 * End-to-end setup: a temporary HOME, forced into WSL mode, with a fake
 * `/mnt/c/Users` holding a Windows session. Set MEME_BIN to run a built single
 * file instead of the sources.
 */
import path from "node:path";
import { ClaudeSession, resetIds, sampleSession } from "../fixtures/gen-claude";
import { tempDir } from "../helpers";

const ROOT = path.resolve(import.meta.dir, "../..");
const BIN = process.env.MEME_BIN ? [path.resolve(process.env.MEME_BIN)] : [process.execPath, path.join(ROOT, "src/cli/main.ts")];

export function world() {
  resetIds();
  const home = tempDir("meme-e2e-");
  const users = path.join(home, "mnt-c-Users");
  const wsl = sampleSession({ id: "11111111-0000-4000-8000-000000000001", cwd: path.join(home, "work", "demo") });
  wsl.write(path.join(home, ".claude", "projects"));
  const win = new ClaudeSession({ id: "22222222-0000-4000-8000-000000000002", cwd: "C:\\Users\\me\\work\\demo-app", start: "2026-09-18T06:56:00.000Z" });
  win.user("看一下这个仓库，说说它是做什么的");
  win.tool("PowerShell", { command: "Get-ChildItem -Force" }, "Name  Mode\n.git  d-----");
  win.assistant("这是一个示例应用。接力 works across agents.");
  win.aiTitle("仓库概览");
  win.write(path.join(users, "me", ".claude", "projects"));
  return { home, users, wsl, win };
}

export type World = ReturnType<typeof world>;

function worldEnv(w: World, extra?: Record<string, string>): Record<string, string> {
  return {
    PATH: process.env.PATH ?? "",
    HOME: w.home,
    USERPROFILE: w.home,
    MEME_ENV: "wsl",
    MEME_WINDOWS_USERS_DIR: w.users,
    // Memory beside the mirror, so that tests of memory need not know where it goes in WSL; the tests of that set it to "".
    MEME_STORE: path.join(w.home, ".meme"),
    TZ: "UTC",
    // Run from sources, Bun would cache its transpiled files in the fake HOME.
    BUN_RUNTIME_TRANSPILER_CACHE_PATH: "0",
    ...extra,
  };
}

/** `input` is what meme reads on standard input. */
export function run(w: World, args: string[], o: { cwd?: string; env?: Record<string, string>; input?: string } = {}) {
  const p = Bun.spawnSync([...BIN, ...args], { cwd: o.cwd ?? w.home, env: worldEnv(w, o.env), stdout: "pipe", stderr: "pipe", ...(o.input === undefined ? {} : { stdin: Buffer.from(o.input) }) });
  return { code: p.exitCode, out: p.stdout.toString(), err: p.stderr.toString() };
}

/** Like `run`, without stopping this process meanwhile: for when meme talks to a server the test itself runs. */
export async function runAsync(w: World, args: string[], o: { cwd?: string; env?: Record<string, string> } = {}) {
  const p = Bun.spawn([...BIN, ...args], { cwd: o.cwd ?? w.home, env: worldEnv(w, o.env), stdout: "pipe", stderr: "pipe" });
  const [out, err, code] = await Promise.all([new Response(p.stdout).text(), new Response(p.stderr).text(), p.exited]);
  return { code, out, err };
}

/** util-linux `script`, to run meme in a pseudo-terminal; null where there is none (macOS's takes other options). */
export const SCRIPT = process.platform === "linux" ? Bun.which("script") : null;

/** meme in a pseudo-terminal, as if typed in one, with `input` typed into it. Needs SCRIPT. Output and input echo mixed. */
export function runInTerminal(w: World, args: string[], input: string, o: { env?: Record<string, string> } = {}) {
  const quote = (s: string) => `'${s.replace(/'/g, `'\\''`)}'`;
  const p = Bun.spawnSync([SCRIPT!, "-qec", [...BIN, ...args].map(quote).join(" "), "/dev/null"], {
    cwd: w.home,
    env: worldEnv(w, { TERM: "dumb", ...o.env }),
    stdin: Buffer.from(input),
    stdout: "pipe",
    stderr: "pipe",
  });
  return { code: p.exitCode, out: p.stdout.toString().replace(/\r\n/g, "\n") };
}
