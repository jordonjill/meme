import { claudeCode } from "./claude-code";
import type { Adapter } from "./types";

/** Adapters in M1 step ①: Claude Code only. Codex comes in step ③. */
export const ADAPTERS: readonly Adapter[] = [claudeCode];
