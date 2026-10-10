/**
 * Build single-file executables with `bun build --compile`, cross-compiled from
 * one machine, and write their SHA-256 sums to dist/SHA256SUMS (plan: release prep).
 *   bun scripts/build.ts               every target below
 *   bun scripts/build.ts linux-x64     only the named targets
 */
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import pkg from "../package.json";

const TARGETS: Record<string, { bun: string; file: string }> = {
  "linux-x64": { bun: "bun-linux-x64", file: "meme-linux-x64" },
  "linux-arm64": { bun: "bun-linux-arm64", file: "meme-linux-arm64" },
  "darwin-x64": { bun: "bun-darwin-x64", file: "meme-darwin-x64" },
  "darwin-arm64": { bun: "bun-darwin-arm64", file: "meme-darwin-arm64" },
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

// Checksums of every file in dist that a target makes, built now or before, in `sha256sum -c` format.
const sums: string[] = [];
for (const t of Object.values(TARGETS)) {
  const file = path.join(out, t.file);
  try {
    sums.push(`${createHash("sha256").update(readFileSync(file)).digest("hex")}  ${t.file}`);
  } catch {}
}
writeFileSync(path.join(out, "SHA256SUMS"), sums.join("\n") + "\n");
console.log(`SHA256SUMS: ${sums.length} files`);
