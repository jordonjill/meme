import { describe, expect, test } from "bun:test";
import { mayHoldSecret, redactDeep, redactText } from "../../src/redact/rules";

// Fake secrets assembled at runtime so no secret-shaped literal sits in the repo.
const fake = (prefix: string, n: number, ch = "a") => prefix + ch.repeat(n);

describe("redaction (plan §4.6.7)", () => {
  test("each rule replaces its secret with [REDACTED:<kind>]", () => {
    const cases: [string, string][] = [
      [`key ${fake("sk-ant-api03-", 30)} end`, "anthropic-key"],
      [`key ${fake("sk-proj-", 30)} end`, "openai-key"],
      [`key ${fake("sk-", 30)} end`, "openai-key"],
      [`token ${fake("ghp_", 36)} end`, "github-token"],
      [`token ${fake("github_pat_", 45)} end`, "github-token"],
      [`id ${fake("AKIA", 16, "B")} end`, "aws-key-id"],
      [`-----BEGIN RSA PRIVATE KEY-----\nMIIEabc\n-----END RSA PRIVATE KEY-----`, "private-key"],
      [`Authorization: Bearer ${fake("eyJ", 30)}`, "bearer"],
      [`https://admin:${fake("pw", 8)}@db.example.com/x`, "url-password"],
      [`password=${fake("Hunter", 4, "2")}`, "password"],
      [`PASSWD: "${fake("s3cr", 6, "t")}"`, "password"],
    ];
    for (const [input, kind] of cases) {
      const out = redactText(input);
      expect(out).toContain(`[REDACTED:${kind}]`);
      expect(out).not.toContain("aaaaaaaaaa");
    }
  });

  test("an Anthropic key is labelled as one, not as an OpenAI key", () => {
    expect(redactText(fake("sk-ant-api03-", 30))).toBe("[REDACTED:anthropic-key]");
  });

  test("pwd= is the current directory, not a password", () => {
    expect(redactText("pwd=/home/user/work/project")).toBe("pwd=/home/user/work/project");
  });

  test("hashes, UUIDs and base64 are left alone", () => {
    const keep = [
      "commit 3f2a9c1e8b7d6a5f4e3d2c1b0a9f8e7d6c5b4a3f",
      "session 3c9d1e2a-5b7f-4c1d-9e8a-0f6b2d4c8a17",
      "sha256 e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk",
      "https://github.com/oven-sh/bun",
    ];
    for (const s of keep) expect(redactText(s)).toBe(s);
  });

  test("tool arguments stay valid JSON after redaction", () => {
    const args = JSON.stringify({ command: `curl -H "Authorization: Bearer ${fake("tok", 30)}" https://x` });
    const out = redactDeep({ role: "assistant", content: null, tool_calls: [{ id: "1", name: "Bash", args }] });
    const parsed = JSON.parse(out.tool_calls[0]!.args);
    expect(parsed.command).toContain("[REDACTED:bearer]");
  });
});

describe("passwords and keys (plan §6 ⑨, R5 and R24)", () => {
  const secret = fake("Hunter", 6, "2");

  test("a password after its key: env and CLI forms, prefixed keys, quoted values, JSON, YAML", () => {
    const cases = [
      `DB_PASSWORD=${secret}`,
      `PGPASSWORD=${secret} psql -h db`,
      `export MYSQL_ROOT_PASSWORD=${secret}`,
      `mysql --password=${secret}`,
      `password=${secret}`,
      `password = "${secret}"`,
      `{"password": "${secret}"}`,
      `{ "db_password":"${secret}" }`,
      `    MYSQL_ROOT_PASSWORD: ${secret}`,
      `password: '${secret}'`,
    ];
    for (const input of cases) {
      const out = redactText(input);
      expect(out, input).toContain("[REDACTED:password]");
      expect(out, input).not.toContain(secret);
    }
  });

  test("code that only names a password is left alone", () => {
    const keep = [
      "password: string;",
      "  password: string",
      "def login(user: str, password: str) -> bool:",
      "user.password = hashPassword(input)",
      'password = request.form["password"]',
      "connect(user=user, password=password)",
      "password=password",
      "const passwordHash = await bcrypt.hash(plain, 10);",
      "password: ${DB_PASSWORD}",
      'placeholder="Enter your password"',
    ];
    for (const line of keep) expect(redactText(line), line).toBe(line);
  });

  test("a password-like key in parsed JSON (tool arguments) has its value redacted", () => {
    const args = JSON.stringify({ host: "db", password: secret, nested: { adminPassword: secret } });
    const out = redactDeep({ args });
    expect(out.args).not.toContain(secret);
    expect(JSON.parse(out.args)).toEqual({ host: "db", password: "[REDACTED:password]", nested: { adminPassword: "[REDACTED:password]" } });
  });

  test("a private key without its END line (`head id_rsa`) is redacted too, and what follows is kept", () => {
    const head = `-----BEGIN OPENSSH PRIVATE KEY-----\n${"b3BlbnNzaC1rZXktdjEAAAAA".repeat(3)}\n${"QyNTUxOQAAACBBBBBBBBBBBBB".repeat(3)}\n\ndone`;
    const out = redactText(head);
    expect(out).toBe("[REDACTED:private-key]\n\ndone");
  });

  test("the cheap pre-check lets every secret through to the rules", () => {
    const samples = [
      fake("sk-ant-api03-", 30), fake("sk-proj-", 30), fake("ghp_", 36), fake("github_pat_", 45), fake("AKIA", 16, "B"),
      "-----BEGIN RSA PRIVATE KEY-----\nMIIE", `Bearer ${fake("eyJ", 30)}`, `https://a:${fake("pw", 8)}@h`,
      `DB_PASSWORD=${secret}`, `PGPASSWORD=${secret}`, `{"password": "${secret}"}`, `MYSQL_ROOT_PASSWD: ${secret}`,
    ];
    for (const s of samples) {
      expect(redactText(s), s).not.toBe(s);
      expect(mayHoldSecret(s), s).toBe(true);
    }
  });
});
