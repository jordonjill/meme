import { appendFileSync, mkdirSync, renameSync, statSync } from "node:fs";
import path from "node:path";

export interface Logger {
  info(message: string): void;
  error(message: string, err?: unknown): void;
}

const MAX_BYTES = 1024 * 1024;

/**
 * `~/.meme/logs/meme.log`, rotated to `meme.log.1` past 1 MB. Logging never
 * throws: a read-only data directory just means no log.
 */
export function fileLogger(dataDir: string): Logger {
  const dir = path.join(dataDir, "logs");
  const file = path.join(dir, "meme.log");
  const write = (level: string, message: string) => {
    try {
      mkdirSync(dir, { recursive: true, mode: 0o700 });
      try {
        if (statSync(file).size > MAX_BYTES) renameSync(file, file + ".1");
      } catch {}
      appendFileSync(file, `${new Date().toISOString()} ${level} ${message}\n`, { mode: 0o600 });
    } catch {}
  };
  return {
    info: (message) => write("INFO", message),
    error: (message, err) => write("ERROR", err ? `${message}: ${describe(err)}` : message),
  };
}

export const nullLogger: Logger = { info() {}, error() {} };

export function describe(err: unknown): string {
  if (err instanceof Error) return err.stack ?? `${err.name}: ${err.message}`;
  return String(err);
}
