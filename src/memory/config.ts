import path from "node:path";
import { readText, writeFileAtomic } from "./store";

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
  /** The pipeline starts by itself now and then (plan-m2 F9); `"auto": false` in the file stops that. */
  auto: boolean;
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
  let file: { model?: { url?: unknown; key?: unknown; keyEnv?: unknown; name?: unknown }; exclude?: unknown; auto?: unknown } = {};
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
    auto: file.auto !== false && vars.MEME_NO_AUTO_UPDATE !== "1",
  };
}

export class ConfigError extends Error {}

/** What the file holds, as it is; fields meme does not know are kept when it is written again. */
export type ConfigFile = Record<string, unknown> & { model?: { url?: string; key?: string; keyEnv?: string; name?: string }; exclude?: string[] };

export function readConfigFile(dataDir: string): ConfigFile {
  const text = readText(configFile(dataDir));
  if (text === null) return {};
  try {
    const parsed: unknown = JSON.parse(text);
    if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) return parsed as ConfigFile;
  } catch (err) {
    throw new ConfigError(`${configFile(dataDir)} is not valid JSON: ${(err as Error).message}`);
  }
  throw new ConfigError(`${configFile(dataDir)} does not hold a JSON object`);
}

/** Written whole or not at all, readable by the user only: it may hold a key. */
export function writeConfigFile(dataDir: string, file: ConfigFile): void {
  writeFileAtomic(configFile(dataDir), JSON.stringify(file, null, 2) + "\n");
}

/** The environment variables that set the model, and win over the file. */
export const MODEL_VARS = ["MEME_MODEL_URL", "MEME_MODEL_NAME", "MEME_MODEL_KEY"] as const;
