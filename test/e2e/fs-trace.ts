/**
 * Preloaded into meme by a test (`bun --preload`): every path meme reads that
 * contains TRACE_MATCH is appended to TRACE_FILE, one line each, with the call.
 * The read functions of node:fs are wrapped; named imports see the wrappers.
 */
const fs = require("node:fs") as Record<string, unknown> & typeof import("node:fs");
const match = process.env.TRACE_MATCH;
const file = process.env.TRACE_FILE;
if (match && file) {
  const append = fs.appendFileSync;
  let busy = false;
  const note = (call: string, p: unknown) => {
    if (busy || typeof p !== "string" || !p.includes(match)) return;
    busy = true;
    try {
      append(file, `${call} ${p}\n`);
    } finally {
      busy = false;
    }
  };
  for (const name of ["existsSync", "statSync", "lstatSync", "readFileSync", "readdirSync", "accessSync", "openSync", "opendirSync", "realpathSync"]) {
    const orig = fs[name] as ((p: unknown, ...rest: unknown[]) => unknown) & { native?: (p: unknown, ...rest: unknown[]) => unknown };
    if (typeof orig !== "function") continue;
    const wrapped = Object.assign(
      function (this: unknown, p: unknown, ...rest: unknown[]) {
        note(name, p);
        return orig.call(this, p, ...rest);
      },
      orig.native ? { native: (p: unknown, ...rest: unknown[]) => (note(`${name}.native`, p), orig.native!(p, ...rest)) } : {},
    );
    fs[name] = wrapped;
  }
}
