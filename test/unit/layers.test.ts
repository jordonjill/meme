/**
 * The layers of the source (plan-m2, after reading how muse keeps its import
 * boundaries): each folder under src/ may import only the folders below it. A
 * lower layer that needs something from a higher one gets it moved down, never
 * imported up. Each rule is a line in LAYERS; a new folder needs one.
 */
import { describe, expect, test } from "bun:test";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const SRC = path.resolve(import.meta.dir, "../../src");

/** What each folder may import, besides itself. Lowest first. */
const LAYERS: Record<string, string[]> = {
  platform: [],
  redact: [],
  // What meme says to a model: text, and the words it is made of.
  prompts: [],
  model: ["platform", "redact"],
  adapters: ["model", "platform", "redact"],
  store: ["adapters", "model", "platform", "redact"],
  render: ["store", "adapters", "model", "platform", "redact"],
  handoff: ["render", "store", "adapters", "model", "platform", "redact"],
  memory: ["prompts", "handoff", "store", "adapters", "model", "platform", "redact"],
  // The three ways in. tui and mcp may use what cli shares (its context, its errors), never a command.
  tui: ["cli", "render", "store", "adapters", "model", "platform", "redact"],
  mcp: ["cli", "prompts", "memory", "handoff", "render", "store", "adapters", "model", "platform", "redact"],
  cli: ["tui", "mcp", "prompts", "memory", "handoff", "render", "store", "adapters", "model", "platform", "redact"],
};

/** The agents' profiles and the adapters' types are data every layer may read (adapters/profiles.ts says so). */
const DATA = (rel: string) => rel === "adapters/profiles.ts" || rel === "adapters/types.ts" || /^adapters\/[^/]+\.profile\.ts$/.test(rel);

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = path.join(dir, name);
    return statSync(p).isDirectory() ? sources(p) : /\.tsx?$/.test(name) ? [p] : [];
  });
}

/** The files of src/ a file imports, as paths under src/. */
function imports(file: string): string[] {
  const text = readFileSync(file, "utf8");
  const out: string[] = [];
  for (const m of text.matchAll(/(?:\bfrom\s+|\bimport\s*\(\s*|\bimport\s+)["'](\.{1,2}\/[^"']+)["']/g)) {
    const abs = path.resolve(path.dirname(file), m[1]!);
    const target = path.relative(SRC, abs);
    if (target.startsWith("..")) continue;
    // A folder is its index file.
    const isDir = (() => {
      try {
        return statSync(abs).isDirectory();
      } catch {
        return false;
      }
    })();
    out.push(isDir ? path.join(target, "index.ts") : /\.tsx?$/.test(target) ? target : `${target}.ts`);
  }
  return out;
}

const top = (rel: string) => rel.split(path.sep)[0]!;

describe("the layers of src/", () => {
  const files = sources(SRC).map((f) => ({ file: f, rel: path.relative(SRC, f).split(path.sep).join("/") }));

  test("every folder has a rule", () => {
    const folders = [...new Set(files.map((f) => f.rel.split("/")[0]!))].filter((d) => !d.endsWith(".ts"));
    expect(folders.filter((d) => !(d in LAYERS))).toEqual([]);
  });

  test("a folder imports only the layers below it, and the agents' data", () => {
    const wrong: string[] = [];
    for (const { file, rel } of files) {
      const from = top(rel);
      for (const target of imports(file).map((t) => t.split(path.sep).join("/"))) {
        const to = top(target);
        if (to === from || DATA(target) || LAYERS[from]?.includes(to)) continue;
        wrong.push(`${rel} imports ${target}`);
      }
    }
    expect(wrong).toEqual([]);
  });

  test("a command is imported by the command line alone, and its entry point by nobody", () => {
    const wrong: string[] = [];
    for (const { file, rel } of files) {
      for (const target of imports(file).map((t) => t.split(path.sep).join("/"))) {
        if (target.startsWith("cli/commands/") && !rel.startsWith("cli/")) wrong.push(`${rel} imports ${target}`);
        if (target === "cli/main.ts") wrong.push(`${rel} imports ${target}`);
      }
    }
    expect(wrong).toEqual([]);
  });

  test("the check sees imports: a file known to import across folders is seen to", () => {
    const seen = imports(path.join(SRC, "mcp", "tools.ts")).map((t) => t.split(path.sep).join("/"));
    expect(seen).toContain("memory/show.ts");
    expect(seen).toContain("cli/context-for.ts");
    expect(imports(path.join(SRC, "cli", "context.ts")).map((t) => t.split(path.sep).join("/"))).toContain("adapters/index.ts");
  });
});
