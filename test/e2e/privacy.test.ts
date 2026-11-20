/**
 * End to end: what meme keeps and where (PRD §5.1, plan §6 ⑨). Secrets never reach
 * the database file or any output, the mirror keeps every word as written, and
 * nothing outside ~/.meme is touched.
 */
import { describe, expect, test } from "bun:test";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { ClaudeSession } from "../fixtures/gen-claude";
import { layout } from "../../src/platform/layout";
import { run, world, type World } from "./world";

// Assembled at runtime so no secret-shaped literal sits in the repo.
const SECRETS = {
  anthropic: "sk-ant-api03-" + "Q".repeat(32),
  github: "ghp_" + "R".repeat(36),
  dbPassword: "Hunter" + "2".repeat(8),
  jsonPassword: "Swordfish" + "9".repeat(6),
  keyBody: "b3BlbnNzaC1rZXktdjEAAAAA".repeat(3),
};

function secretSession(w: World) {
  const s = new ClaudeSession({ id: "5ec5ec00-0000-4000-8000-000000000001", cwd: path.join(w.home, "work", "demo"), start: "2026-10-01T08:00:00.000Z" });
  s.user(`deploy with ${SECRETS.anthropic} please`);
  s.tool("Bash", { command: `DB_PASSWORD=${SECRETS.dbPassword} ./deploy.sh` }, "deployed");
  s.tool("Bash", { command: "head -3 ~/.ssh/id_ed25519" }, `-----BEGIN OPENSSH PRIVATE KEY-----\n${SECRETS.keyBody}\n${SECRETS.keyBody}`);
  s.tool("Write", { file_path: path.join(w.home, "work", "demo", "config.json"), content: `{"password": "${SECRETS.jsonPassword}"}` }, "ok");
  s.assistant(`Pushed with token ${SECRETS.github}.`);
  s.aiTitle(`Deploy ${SECRETS.github}`);
  s.write(path.join(w.home, ".claude", "projects"));
  return s;
}

const leaks = (text: string) => Object.entries(SECRETS).filter(([, v]) => text.includes(v)).map(([k]) => k);

describe("privacy (PRD §5.1)", () => {
  test("secrets reach neither the database file nor ls, show, search or continue (plan §6 ⑨, R5)", () => {
    const w = world();
    secretSession(w);
    const outputs = [
      run(w, ["ls", "-a", "--plain"]).out,
      run(w, ["show", "5ec5", "--full", "--hidden", "--plain"]).out,
      run(w, ["search", "deploy", "-a", "--tools", "--plain"]).out,
      run(w, ["search", "Hunter", "-a", "--tools", "--plain"]).out,
      run(w, ["continue", "5ec5"]).out,
    ];
    for (const out of outputs) expect(leaks(out)).toEqual([]);
    expect(outputs[1]).toContain("[REDACTED:");
    const db = readFileSync(layout(path.join(w.home, ".meme")).mirror).toString("latin1");
    expect(leaks(db)).toEqual([]);
  });

  test("the mirror keeps every word as written: whitespace, tabs, CJK, emoji, quotes and backslashes", () => {
    const w = world();
    const texts = [
      "  indented line\n\tand a tab\ntrailing spaces   \n\n\nthree blank lines above",
      "中文、日本語、한국어 and emoji 🧪👩‍💻 with \"quotes\" and \\backslashes\\ and `ticks`",
    ];
    const s = new ClaudeSession({ id: "7e7e7e7e-0000-4000-8000-000000000001", cwd: path.join(w.home, "work", "demo") });
    s.user(texts[0]!);
    s.tool("Bash", { command: `printf '%s\\n' "${texts[1]}"` }, texts[1]!);
    s.assistant(texts[1]! + "\n" + texts[0]!);
    s.write(path.join(w.home, ".claude", "projects"));
    expect(run(w, ["ls", "-a", "--plain"]).out).toContain("7e7e7e7e");
    // Stored as JSON: each text, escaped the way JSON escapes it, is in the file as it was written.
    const db = readFileSync(layout(path.join(w.home, ".meme")).mirror, "utf8");
    for (const t of texts) expect(db).toContain(JSON.stringify(t).slice(1, -1));
    expect(db).toContain(JSON.stringify(texts[1]! + "\n" + texts[0]!).slice(1, -1));
  });

  test("nothing outside ~/.meme is created, changed or removed", () => {
    const w = world();
    secretSession(w);
    const snapshot = () => {
      const out: Record<string, string> = {};
      const walk = (dir: string) => {
        for (const e of readdirSync(dir, { withFileTypes: true })) {
          const p = path.join(dir, e.name);
          if (p === path.join(w.home, ".meme")) continue;
          if (e.isDirectory()) walk(p);
          else {
            const st = statSync(p);
            out[path.relative(w.home, p)] = `${st.size}:${st.mtimeMs}`;
          }
        }
      };
      walk(w.home);
      return out;
    };
    const before = snapshot();
    for (const args of [["install"], ["ls", "-a", "--plain"], ["show", "5ec5", "--plain"], ["search", "deploy", "-a", "--plain"], ["continue", "5ec5"], ["status"], ["install", "--dry-run"]]) {
      expect(run(w, args).code, args.join(" ")).toBe(0);
    }
    expect(snapshot()).toEqual(before);
  });
});
