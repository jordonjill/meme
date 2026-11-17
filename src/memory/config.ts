import path from "node:path";
import { readText } from "./store";

/** The model the pipeline asks: a service that speaks the OpenAI chat format (memory-v0.3-draft §6.4). */
export interface ModelConfig {
  /** Its address up to and without `/chat/completions`, e.g. `https://host/v1`. */
  url: string;
  key: string;
  name: string;
}

export interface Config {
  /** Null when none is set up: meme then sends nothing anywhere. */
  model: ModelConfig | null;
  /** Projects whose sessions are never sent to the model: paths, or what a project is known by. */
  exclude: string[];
}

export function configFile(dataDir: string): string {
  return path.join(dataDir, "config.json");
}

/**
 * What `config.json` in the data folder says, with the environment on top:
 * MEME_MODEL_URL, MEME_MODEL_KEY, MEME_MODEL_NAME. The key may also be named by a
 * variable (`keyEnv`), so that it need not be in the file.
 */
export function loadConfig(dataDir: string, vars: Record<string, string | undefined>): Config {
  let file: { model?: { url?: unknown; key?: unknown; keyEnv?: unknown; name?: unknown }; exclude?: unknown } = {};
  const text = readText(configFile(dataDir));
  if (text !== null) {
    try {
      file = JSON.parse(text) as typeof file;
    } catch (err) {
      throw new ConfigError(`${configFile(dataDir)} is not valid JSON: ${(err as Error).message}`);
    }
  }
  const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  const m = file.model ?? {};
  const url = str(vars.MEME_MODEL_URL) || str(m.url);
  const name = str(vars.MEME_MODEL_NAME) || str(m.name);
  const key = str(vars.MEME_MODEL_KEY) || str(m.key) || str(vars[str(m.keyEnv)] ?? "");
  return {
    model: url && name ? { url: url.replace(/\/+$/, ""), key, name } : null,
    exclude: Array.isArray(file.exclude) ? file.exclude.map(str).filter(Boolean) : [],
  };
}

export class ConfigError extends Error {}
