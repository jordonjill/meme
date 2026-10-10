import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach } from "bun:test";
import { claudeCode, convertClaude } from "../src/adapters/claude-code";
import type { SourceRoot } from "../src/adapters/types";
import { projectResolver } from "../src/model/project";
import { nullLogger } from "../src/platform/log";
import type { Platform } from "../src/platform/paths";
import { openStore, type Store } from "../src/store/db";
import { importAll } from "../src/store/import";
import type { Env } from "../src/platform/env";

const dirs: string[] = [];

/** A fresh temporary directory, removed after the test. */
export function tempDir(name = "meme-test-"): string {
  const d = mkdtempSync(path.join(tmpdir(), name));
  dirs.push(d);
  return d;
}

afterEach(() => {
  for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true });
});

export function testPlatform(home: string, env: Env = "linux", windowsUsersDir: string | null = null): Platform {
  return { env, home, dataDir: path.join(home, ".meme"), windowsUsersDir, wsl: [], vars: {} };
}

export function projectsDir(home: string): string {
  return path.join(home, ".claude", "projects");
}

export function localRoot(p: Platform): SourceRoot {
  return claudeCode.roots(p)[0]!;
}

export function convert(text: string, id: string, p: Platform = testPlatform("/nohome")) {
  return convertClaude(text, { sessionId: id, root: localRoot(p), project: projectResolver(p), filesOf: () => [] });
}

export function importInto(p: Platform, store: Store = openStore(p.dataDir)) {
  const result = importAll(store, p, [claudeCode], nullLogger);
  return { store, result };
}
