import { parseArgs, type ParseArgsConfig } from "node:util";

export class UsageError extends Error {}

type Options = NonNullable<ParseArgsConfig["options"]>;

/** `node:util` parseArgs, with its errors turned into usage errors (exit 2). */
export function parse<O extends Options>(args: string[], options: O) {
  try {
    return parseArgs({ args, options, allowPositionals: true, strict: true });
  } catch (err) {
    throw new UsageError((err as Error).message.replace(/^TypeError \[[A-Z_]+\]: /, ""));
  }
}

export function intOption(value: string | undefined, name: string, min = 0): number | undefined {
  if (value === undefined) return undefined;
  const n = Number(value);
  if (!Number.isInteger(n) || n < min) throw new UsageError(`${name} needs a whole number${min > 0 ? ` of at least ${min}` : ""}, got ${value}`);
  return n;
}
