/**
 * Redaction (plan §4.6.7): only secrets with an unambiguous format, replaced by
 * `[REDACTED:<kind>]`. No entropy checks: they would hit commit hashes, UUIDs and
 * base64. `pwd=` is deliberately not a password key; in real sessions it is the
 * current directory.
 *
 * Order matters: Anthropic keys (`sk-ant-…`) must be caught before the OpenAI rule.
 * Changing these rules must bump SCHEMA_VERSION so old, unredacted mirrors are rebuilt.
 */
export const RULES: readonly (readonly [kind: string, re: RegExp])[] = [
  ["anthropic-key", /\bsk-ant-[A-Za-z0-9_-]{20,}/g],
  ["openai-key", /\bsk-(?:proj-)?[A-Za-z0-9_-]{20,}/g],
  ["github-token", /\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,})/g],
  ["aws-key-id", /\bAKIA[0-9A-Z]{16}\b/g],
  ["private-key", /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g],
  ["bearer", /(?<=\bBearer\s+)[A-Za-z0-9._~+/-]{20,}=*/g],
  ["url-password", /(?<=:\/\/[^\s:/@]+:)[^\s@/]{3,}(?=@)/g],
  ["password", /(?<=\b(?:password|passwd)\s*[=:]\s*["']?)[^\s"']{6,}/gi],
];

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
  if (typeof v === "string") return key === "args" ? redactJsonText(v) : redactText(v);
  if (Array.isArray(v)) return v.map((x) => walk(x));
  if (v && typeof v === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, x] of Object.entries(v)) out[k] = walk(x, k);
    return out;
  }
  return v;
}

function redactJsonText(s: string): string {
  if (redactText(s) === s) return s;
  try {
    return JSON.stringify(walk(JSON.parse(s)));
  } catch {
    return redactText(s);
  }
}
