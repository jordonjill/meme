import { parseArgs, type ParseArgsConfig } from "node:util";

export class UsageError extends Error {}

/** An expected failure the user can act on: one line, exit code 1, nothing logged. */
export class CommandError extends Error {}

type Options = NonNullable<ParseArgsConfig["options"]>;

/** `node:util` parseArgs, with its errors turned into usage errors (exit 2). */
export function parse<O extends Options>(args: string[], options: O) {
  try {
    return parseArgs({ args, options, allowPositionals: true, strict: true });
  } catch (err) {
    const message = (err as Error).message.replace(/^TypeError \[[A-Z_]+\]: /, "");
    // Node's own wording ends in an advice with unbalanced quotes; one line of meme's instead.
    const unknown = /^Unknown option '([^']+)'/.exec(message);
    throw new UsageError(unknown ? `unknown option ${unknown[1]}` : message);
  }
}

export function intOption(value: string | undefined, name: string, min = 0): number | undefined {
  if (value === undefined) return undefined;
  const n = Number(value);
  if (!Number.isInteger(n) || n < min) throw new UsageError(`${name} needs a whole number${min > 0 ? ` of at least ${min}` : ""}, got ${value}`);
  return n;
}
