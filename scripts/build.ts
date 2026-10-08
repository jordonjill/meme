/**
 * Build single-file executables with `bun build --compile`.
 *   bun scripts/build.ts               every target below
 *   bun scripts/build.ts linux-x64     only the named targets
 * Step ① ships Linux and Windows; the macOS and arm64 targets come with the
 * release workflow in step ④.
 */
import { mkdirSync } from "node:fs";
import path from "node:path";
import pkg from "../package.json";

const TARGETS: Record<string, { bun: string; file: string }> = {
  "linux-x64": { bun: "bun-linux-x64", file: "meme-linux-x64" },
  "windows-x64": { bun: "bun-windows-x64", file: "meme-windows-x64.exe" },
};

const root = path.resolve(import.meta.dir, "..");
const out = path.join(root, "dist");
mkdirSync(out, { recursive: true });

const wanted = process.argv.slice(2);
for (const name of wanted) if (!TARGETS[name]) throw new Error(`unknown target ${name}; known: ${Object.keys(TARGETS).join(", ")}`);

for (const [name, t] of Object.entries(TARGETS)) {
  if (wanted.length && !wanted.includes(name)) continue;
  const outfile = path.join(out, t.file);
  const started = performance.now();
  const p = Bun.spawnSync(
    [process.execPath, "build", "--compile", "--minify", `--target=${t.bun}`, path.join(root, "src/cli/main.ts"), "--outfile", outfile],
    { stdout: "inherit", stderr: "inherit" },
  );
  if (p.exitCode !== 0) process.exit(p.exitCode ?? 1);
  const size = Bun.file(outfile).size;
  console.log(`${name}: ${path.relative(root, outfile)} (meme ${pkg.version}, ${(size / 1024 / 1024).toFixed(1)} MB, ${Math.round(performance.now() - started)} ms)`);
}
