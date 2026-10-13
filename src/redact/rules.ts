/**
 * Redaction (plan §4.6.7): only secrets with an unambiguous format, replaced by
 * `[REDACTED:<kind>]`. No entropy checks: they would hit commit hashes, UUIDs and
 * base64. `pwd=` is deliberately not a password key; in real sessions it is the
 * current directory.
 *
 * Order matters: Anthropic keys (`sk-ant-…`) must be caught before the OpenAI rule.
 * Changing these rules must bump SCHEMA_VERSION so old, unredacted mirrors are rebuilt.
 */
/** A key that names a password: `password`, `passwd`, also prefixed (`DB_PASSWORD`, `PGPASSWORD`, `user.password`). */
const KEY = String.raw`\b[\w.-]*?pass(?:word|wd)`;
/** Words that make `password: <word>` a type annotation, not a value. */
const TYPES = String.raw`(?:string|str|number|int|integer|bool|boolean|any|null|none|undefined|object|bytes|secret)\b`;

export const RULES: readonly (readonly [kind: string, re: RegExp])[] = [
  ["anthropic-key", /\bsk-ant-[A-Za-z0-9_-]{20,}/g],
  ["openai-key", /\bsk-(?:proj-)?[A-Za-z0-9_-]{20,}/g],
  ["github-token", /\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,})/g],
  ["aws-key-id", /\bAKIA[0-9A-Z]{16}\b/g],
  // The whole block; without its END line (`head id_rsa`), the BEGIN line and the base64 and header lines after it.
  ["private-key", /-----BEGIN [A-Z ]*PRIVATE KEY-----(?:[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----|(?:\r?\n(?:[A-Za-z0-9+/=]{16,}|[A-Za-z-]+: [^\n]*))*)/g],
  ["bearer", /(?<=\bBearer\s+)[A-Za-z0-9._~+/-]{20,}=*/g],
  ["url-password", /(?<=:\/\/[^\s:/@]+:)[^\s@/]{3,}(?=@)/g],
  // A password must be a value, not code that names one (plan §6 ⑨): a quoted string with no spaces,
  // after `=` or `:`, the key itself perhaps quoted (`{"password": "…"}`);
  ["password", new RegExp(String.raw`(?<=${KEY}["']?\s*[=:]\s*(["']))(?!${TYPES})[^"'\s]{6,}(?=\1)`, "gi")],
  // unquoted right after `=` with no spaces, the env and command-line form (`PGPASSWORD=…`, `--password=…`), not `password=password`;
  ["password", new RegExp(String.raw`(?<=${KEY}=)(?!pass(?:word|wd)\b)[^\s"'(){}\[\];,]{6,}(?=\s|$)`, "gim")],
  // unquoted after `:` at the end of a line, YAML (`MYSQL_ROOT_PASSWORD: …`), not `password: string`.
  ["password", new RegExp(String.raw`(?<=^[ \t-]*${KEY}[ \t]*:[ \t]*)(?!${TYPES})[^\s"'#(){}\[\];,$]{6,}(?=[ \t]*$)`, "gim")],
];

/** Cheap pre-check so most strings skip the rules; it must let through every string a rule would change (tested). */
export function mayHoldSecret(s: string): boolean {
  return /sk-|gh[pousr]_|github_pat_|AKIA|PRIVATE KEY|Bearer|:\/\/|passw/i.test(s);
}

/** A JSON key whose string value is a password (`password`, `db_password`, `adminPassword`). */
const PASSWORD_KEY = /pass(?:word|wd)$/i;

export function redactText(s: string): string {
  for (const [kind, re] of RULES) s = s.replace(re, `[REDACTED:${kind}]`);
  return s;
}

/**
 * Redact every string inside a value. Tool-call arguments are JSON text, so they
 * are parsed and redacted leaf by leaf; replacing inside the JSON text could break
 * its escapes.
 */
export function redactDeep<T>(value: T): T {
  return walk(value) as T;
}

function walk(v: unknown, key?: string): unknown {
  if (typeof v === "string") {
    if (key && PASSWORD_KEY.test(key) && /^[^\s]{6,}$/.test(v) && !v.startsWith("[REDACTED")) return "[REDACTED:password]";
    return key === "args" ? redactJsonText(v) : redactText(v);
  }
  if (Array.isArray(v)) return v.map((x) => walk(x));
  if (v && typeof v === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, x] of Object.entries(v)) out[k] = walk(x, k);
    return out;
  }
  return v;
}

/** In JSON text a value's quotes are escaped (`\"password\": \"…\"` inside a file's content): redact the parsed values. */
function redactJsonText(s: string): string {
  if (!mayHoldSecret(s)) return s;
  try {
    const parsed: unknown = JSON.parse(s);
    const out = JSON.stringify(walk(parsed));
    return out === JSON.stringify(parsed) ? s : out;
  } catch {
    return redactText(s);
  }
}
