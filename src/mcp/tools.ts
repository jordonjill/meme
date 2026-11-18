import path from "node:path";
import { agentOfClient, runningAgent } from "../adapters/profiles";
import { NOTED, rememberFromAgent } from "../cli/agent-remember";
import { projectOf } from "../cli/context";
import { contextFor } from "../cli/context-for";
import { recall, type Scope } from "../memory/context";
import { parseShelf } from "../memory/entries";
import { storeDir } from "../memory/place";
import { entryText, resolveEntry } from "../memory/show";
import { memoryProject } from "../memory/projects";
import { entriesIn, memoryPaths, readText } from "../memory/store";
import { processItem } from "../memory/inbox";
import { ABOUT, TOOL_WORDS, type About } from "../prompts";
import { LookupError } from "../store/queries";
import type { Platform } from "../platform/paths";
import { ToolError, type Tool } from "./server";

/**
 * The tools an agent gets (memory-v0.3-draft §7.5): read what memory holds for
 * where it works, look something up, see where an entry comes from, and keep what
 * the user said. Each description sits in the agent's context all the time, so they
 * are short.
 */

const text = (v: unknown): string => (typeof v === "string" ? v.trim() : "");

/** What `remember` handed to the model and has not finished: `meme mcp` waits for it before it ends. */
export const pending = new Set<Promise<unknown>>();

export function memoryTools(platform: Platform): Tool[] {
  // Looked up at each call: the folder can be on a drive that is mounted later.
  const store = () => storeDir(platform);
  const paths = () => memoryPaths(store());
  const rootOf = (args: Record<string, unknown>) => {
    const cwd = text(args.cwd);
    return projectOf(platform, cwd && path.isAbsolute(cwd) ? cwd : process.cwd());
  };
  const scopeOf = (args: Record<string, unknown>, client: string): Scope & { root: string } => {
    const root = rootOf(args);
    return { root, memoryDir: paths().memory, project: memoryProject(root), agent: agentOfClient(client) ?? runningAgent(platform.vars)?.agent ?? null };
  };

  const context: Tool = {
    name: "context",
    description: TOOL_WORDS.context.description,
    inputSchema: { type: "object", properties: { task: { type: "string", description: TOOL_WORDS.context.task }, cwd: { type: "string", description: TOOL_WORDS.context.cwd } } },
    async call(args, client) {
      const cwd = text(args.cwd);
      const given = await contextFor(platform, { cwd: cwd && path.isAbsolute(cwd) ? cwd : process.cwd(), agent: agentOfClient(client) ?? runningAgent(platform.vars)?.agent ?? null, task: text(args.task) || undefined });
      return given || "meme has nothing in memory for here yet.";
    },
  };

  const recallTool: Tool = {
    name: "recall",
    description: TOOL_WORDS.recall.description,
    inputSchema: { type: "object", properties: { words: { type: "string", description: TOOL_WORDS.recall.words }, all: { type: "boolean", description: TOOL_WORDS.recall.all }, cwd: { type: "string", description: TOOL_WORDS.recall.cwd } }, required: ["words"] },
    async call(args, client) {
      const words = text(args.words);
      if (!words) throw new ToolError("recall needs `words`: what to look for");
      const found = recall(scopeOf(args, client), words, args.all === true).slice(0, 10);
      if (!found.length) return `Nothing in memory has to do with: ${words}`;
      const place = (file: string) => /^Project: (.+)$/m.exec(parseShelf(readText(file) ?? "").preamble)?.[1];
      return found.map((f) => `[${f.entry.id}] ${f.entry.text}${place(f.file) ? ` (${place(f.file)})` : ""}`).join("\n");
    },
  };

  const explain: Tool = {
    name: "explain",
    description: TOOL_WORDS.explain.description,
    inputSchema: { type: "object", properties: { id: { type: "string", description: TOOL_WORDS.explain.id } }, required: ["id"] },
    async call(args) {
      const id = text(args.id);
      if (!id) throw new ToolError("explain needs `id`: an entry's id, like m-3f2a91c0");
      try {
        return entryText(resolveEntry(entriesIn(paths().memory), id), paths().evidence, platform.home);
      } catch (err) {
        if (err instanceof LookupError) throw new ToolError(err.message);
        throw err;
      }
    },
  };

  const remember: Tool = {
    name: "remember",
    description: TOOL_WORDS.remember.description,
    inputSchema: {
      type: "object",
      properties: {
        quote: { type: "string", description: TOOL_WORDS.remember.quote },
        about: { type: "string", enum: ABOUT, description: TOOL_WORDS.remember.about },
        note: { type: "string", description: TOOL_WORDS.remember.note },
        cwd: { type: "string", description: TOOL_WORDS.remember.cwd },
      },
      required: ["quote"],
    },
    async call(args, client) {
      const quote = text(args.quote);
      if (!quote) throw new ToolError("remember needs `quote`: the user's own words, copied exactly from their message");
      if (args.about !== undefined && !ABOUT.includes(args.about as About)) throw new ToolError(`\`about\` is one of ${ABOUT.join(", ")}`);
      const done = await rememberFromAgent(platform, { quote, about: args.about as About | undefined, note: text(args.note) || undefined, label: `${client || "an agent"} over MCP`, root: rootOf(args), mayWait: false });
      switch (done.done) {
        case "noted": {
          const work = processItem(store(), done.file, done.model)
            .catch(() => null)
            .finally(() => pending.delete(work));
          pending.add(work);
          return NOTED;
        }
        case "kept":
          return done.lines.join("\n");
        case "refused":
          throw new ToolError(`not remembered: ${done.why}`);
        default:
          throw new ToolError(`not remembered: these words are not in anything the user said in a session. Copy them exactly from the user's message, or ask the user to run: meme remember "${quote}"`);
      }
    },
  };

  return [context, recallTool, explain, remember];
}
