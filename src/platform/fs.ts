import { unlinkSync } from "node:fs";

const RETRY_CODES = new Set(["EBUSY", "EPERM", "ENOTEMPTY"]);
const DELAYS_MS = [100, 200, 400, 800, 800];

/**
 * Windows keeps a just-closed file locked for a moment (EBUSY/EPERM), so file
 * removal retries a few times there. Elsewhere it runs once.
 */
export function withRetry<T>(fn: () => T, isWindows = process.platform === "win32"): T {
  for (let attempt = 0; ; attempt++) {
    try {
      return fn();
    } catch (err) {
      const code = (err as NodeJS.ErrnoException).code;
      if (!isWindows || attempt >= DELAYS_MS.length || !code || !RETRY_CODES.has(code)) throw err;
      Bun.sleepSync(DELAYS_MS[attempt]!);
    }
  }
}

export function removeFile(p: string): void {
  withRetry(() => {
    try {
      unlinkSync(p);
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
    }
  });
}

export function errorCode(err: unknown): string | undefined {
  if (err && typeof err === "object" && "code" in err && typeof err.code === "string") return err.code;
  return undefined;
}
