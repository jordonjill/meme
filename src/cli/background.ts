import { spawn } from "node:child_process";
import path from "node:path";
import { loadConfig } from "../memory/config";
import { lastUpdate, markUpdate } from "../memory/pipeline";
import { storeDir } from "../memory/place";
import { memoryPaths } from "../memory/store";
import type { Platform } from "../platform/paths";

/** How long after one run of the pipeline the next one may start by itself. */
export const UPDATE_EVERY_MS = 6 * 60 * 60 * 1000;

/**
 * Starts the pipeline in the background now and then (plan-m2 F9), so that memory
 * forms without anyone running `meme memory update`. Called when an agent starts:
 * by its hook, `meme context`, or `meme mcp`. Only with a model set up, at most once
 * in UPDATE_EVERY_MS, and never in the way of what called it: whatever goes wrong,
 * nothing is started and nothing is said.
 */
export function maybeStartUpdate(platform: Platform, now = Date.now()): boolean {
  try {
    const store = storeDir(platform);
    const config = loadConfig(store, platform.vars);
    if (!config.model || !config.auto) return false;
    const p = memoryPaths(store);
    if (now - lastUpdate(p) < UPDATE_EVERY_MS) return false;
    // Noted before it starts, so that agents starting together do not each start one.
    markUpdate(p, now);
    // Run from its sources, the program is bun and the script comes first.
    const self = /^bun(\.exe)?$/i.test(path.basename(process.execPath)) && process.argv[1] ? [process.argv[1]] : [];
    const child = spawn(process.execPath, [...self, "memory", "update", "--background"], { detached: true, stdio: "ignore", windowsHide: true, env: process.env });
    child.on("error", () => {});
    child.unref();
    return true;
  } catch {
    return false;
  }
}
