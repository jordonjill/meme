import { asker, ModelError } from "../../memory/model";
import { ConfigError, configFile, loadConfig, MODEL_VARS, readConfigFile, writeConfigFile, type ConfigFile } from "../../memory/config";
import { storeDir } from "../../memory/place";
import { currentPlatform, displayPath, type Platform } from "../../platform/paths";
import { isReadOnlyError } from "../../store/db";
import { CommandError, parse, UsageError } from "../args";
import { insideAgent, write } from "../context";

export const modelHelp = `Usage: meme model [set | test | remove]

The model meme asks to word what you want remembered and to read your sessions
for what is worth keeping. Any service that speaks the OpenAI chat format will
do; one on your own machine keeps everything there. Without one, meme sends
nothing anywhere.

  (no argument)   which model is set up; of the key only its last 4 characters
  set             asks for the address, the model's name and the key (the key
                  is not shown as you type), tries the model once, and saves
                  it only when it answers
      --url <url>          the address, up to /v1 or wherever the service has
                           /chat/completions
      --name <name>        the model's name at that service
      --key-env <VAR>      take the key from this environment variable when
                           meme runs, instead of keeping it in the file
      --no-key             a service that needs no key
      --no-test            save without trying it
  test            sends one short question and says how long the answer took
  remove          forget the model; from then on nothing is sent

A key is never given on the command line, where the shell's history and other
programs would see it. Inside an agent, set works only with --url, --name and
--key-env or --no-key, so that no key passes through the agent.
`;

/** The test question: short, and any answer at all will do. */
const PROBE = { system: "Answer with the single word OK.", user: "Are you there?" };
const TEST_TIMEOUT_MS = 60_000;

const tail = (key: string) => (key.length > 4 ? `…${key.slice(-4)}` : "(set)");

/** Reads a line without showing it: the key. Only at a terminal. */
async function readHidden(question: string): Promise<string> {
  process.stdout.write(question);
  const stdin = process.stdin;
  stdin.setRawMode(true);
  stdin.resume();
  return new Promise((resolve, reject) => {
    let typed = "";
    const finish = (err: Error | null) => {
      stdin.off("data", onData);
      stdin.setRawMode(false);
      stdin.pause();
      process.stdout.write("\n");
      if (err) reject(err);
      else resolve(typed.trim());
    };
    const onData = (chunk: Buffer) => {
      for (const ch of chunk.toString("utf8")) {
        if (ch === "\r" || ch === "\n") return finish(null);
        if (ch === "\u0003" || ch === "\u0004") return finish(new CommandError("nothing was saved"));
        if (ch === "\u007f" || ch === "\b") typed = typed.slice(0, -1);
        else if (ch >= " ") typed += ch;
      }
    };
    stdin.on("data", onData);
  });
}

function ask(question: string): string {
  return (prompt(question) ?? "").trim();
}

async function tryModel(url: string, name: string, key: string): Promise<{ ms: number; answer: string }> {
  const start = performance.now();
  const answer = await asker({ url, name, key }, fetch, TEST_TIMEOUT_MS)(PROBE.system, PROBE.user);
  return { ms: performance.now() - start, answer: answer.replace(/\s+/g, " ").trim().slice(0, 60) };
}

function show(platform: Platform, store: string): string[] {
  const home = platform.home;
  const file = readConfigFile(store);
  const config = loadConfig(store, platform.vars);
  const fromEnv = MODEL_VARS.filter((v) => platform.vars[v]);
  if (!config.model) {
    return ["No model is set up: meme sends nothing anywhere.", "`meme model set` sets one up."];
  }
  const m = file.model ?? {};
  const keyLine = platform.vars.MEME_MODEL_KEY
    ? `from MEME_MODEL_KEY, ${tail(platform.vars.MEME_MODEL_KEY)}`
    : m.key
      ? `${tail(m.key)}, in ${displayPath(configFile(store), home)}`
      : m.keyEnv
        ? platform.vars[m.keyEnv]
          ? `from ${m.keyEnv}, ${tail(platform.vars[m.keyEnv]!)}`
          : `from ${m.keyEnv}, which is not set here`
        : "none";
  const lines = [`Model:  ${config.model.name} at ${config.model.url}`, `Key:    ${keyLine}`, `Set in: ${displayPath(configFile(store), home)}`];
  if (fromEnv.length) lines.push(`        and ${fromEnv.join(", ")} in the environment, which win over the file`);
  lines.push("Used by `meme memory update`, and to word what you ask to remember.");
  return lines;
}

export async function model(argv: string[]): Promise<number> {
  const { values, positionals } = parse(argv, {
    url: { type: "string" },
    name: { type: "string" },
    "key-env": { type: "string" },
    "no-key": { type: "boolean" },
    "no-test": { type: "boolean" },
    help: { type: "boolean", short: "h" },
  });
  if (values.help) {
    write(modelHelp);
    return 0;
  }
  const [action, ...more] = positionals;
  if (action !== undefined && !["set", "test", "remove"].includes(action)) throw new UsageError(`model does not know ${action}; it takes set, test or remove`);
  if (more.length) throw new UsageError(`too many arguments: ${more.join(" ")}`);
  const flags = ["url", "name", "key-env", "no-key", "no-test"] as const;
  if (action !== "set" && flags.some((f) => values[f] !== undefined)) throw new UsageError("--url, --name, --key-env, --no-key and --no-test go with set");
  if (values["key-env"] !== undefined && values["no-key"]) throw new UsageError("--key-env and --no-key do not go together");

  const platform = currentPlatform();
  const home = platform.home;
  const store = storeDir(platform);
  const guard = <T>(fn: () => T): T => {
    try {
      return fn();
    } catch (err) {
      if (err instanceof ConfigError) throw new CommandError(err.message);
      if (isReadOnlyError(err)) throw new CommandError(`meme cannot write ${displayPath(configFile(store), home)} here; nothing was saved`);
      throw err;
    }
  };

  if (action === undefined) {
    write(guard(() => show(platform, store)).join("\n") + "\n");
    return 0;
  }

  if (action === "remove") {
    const file = guard(() => readConfigFile(store));
    if (!file.model) {
      write("No model was set up in the file; nothing to remove.\n");
    } else {
      delete file.model;
      guard(() => writeConfigFile(store, file));
      write(`Removed the model from ${displayPath(configFile(store), home)}. From now on nothing is sent.\n`);
    }
    const env = MODEL_VARS.filter((v) => platform.vars[v]);
    if (env.length) write(`Note: ${env.join(", ")} ${env.length === 1 ? "is" : "are"} still set in the environment and still name a model.\n`);
    return 0;
  }

  if (action === "test") {
    const config = guard(() => loadConfig(store, platform.vars));
    if (!config.model) throw new CommandError("no model is set up; `meme model set` sets one up");
    try {
      const r = await tryModel(config.model.url, config.model.name, config.model.key);
      write(`${config.model.name} at ${config.model.url} answered in ${(r.ms / 1000).toFixed(1)} s: ${r.answer || "(an empty answer)"}\n`);
      return 0;
    } catch (err) {
      if (err instanceof ModelError) throw new CommandError(err.message);
      throw err;
    }
  }

  // set
  const atTerminal = Boolean(process.stdin.isTTY && process.stdout.isTTY) && !insideAgent(platform.vars);
  let url = values.url?.trim() ?? "";
  let name = values.name?.trim() ?? "";
  const keyEnv = values["key-env"]?.trim();
  const needsAsking = !url || !name || (keyEnv === undefined && !values["no-key"]);
  if (needsAsking && !atTerminal) {
    throw new UsageError("set needs a terminal to ask; here give --url, --name, and --key-env <VAR> or --no-key (a key is never given on the command line)");
  }
  if (!url) url = ask("Address of the model service (up to /v1, e.g. https://api.example.com/v1):");
  if (!name) name = ask("Model name at that service:");
  if (!url || !name) throw new CommandError("an address and a model name are both needed; nothing was saved");
  if (!/^https?:\/\//i.test(url)) throw new CommandError(`the address should start with https:// or http://, got ${url}; nothing was saved`);
  url = url.replace(/\/+$/, "").replace(/\/chat\/completions$/, "");
  let key = "";
  if (keyEnv !== undefined) key = platform.vars[keyEnv] ?? "";
  else if (!values["no-key"]) key = await readHidden("Key (not shown; Enter alone for a service that needs none): ");

  if (!values["no-test"]) {
    write(`Trying ${name} at ${url}…\n`);
    try {
      const r = await tryModel(url, name, key);
      write(`It answered in ${(r.ms / 1000).toFixed(1)} s.\n`);
    } catch (err) {
      if (err instanceof ModelError) throw new CommandError(`${err.message}\nNothing was saved. Check the address, the name and the key, or add --no-test to save it anyway.`);
      throw err;
    }
  }
  const file = guard(() => readConfigFile(store));
  file.model = { url, name, ...(keyEnv !== undefined ? { keyEnv } : key ? { key } : {}) };
  guard(() => writeConfigFile(store, file));
  write(`Saved in ${displayPath(configFile(store), home)}${key && keyEnv === undefined ? ", which only you can read; the key is in it as it is" : ""}.\n`);
  if (keyEnv !== undefined && !platform.vars[keyEnv]) write(`Note: ${keyEnv} is not set here; meme reads it each time it asks the model.\n`);
  return 0;
}
