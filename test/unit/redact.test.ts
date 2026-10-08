import { describe, expect, test } from "bun:test";
import { redactDeep, redactText } from "../../src/redact/rules";

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
