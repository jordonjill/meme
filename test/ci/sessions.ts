/**
 * CI on Windows (plan §6 ⑬): a Claude Code and a Codex session in a home folder,
 * for meme.exe to read there.  bun test/ci/sessions.ts <home>
 */
import path from "node:path";
import { sampleSession } from "../fixtures/gen-claude";
import { sampleCodex } from "../fixtures/gen-codex";

const home = process.argv[2];
if (!home) throw new Error("usage: bun test/ci/sessions.ts <home>");
sampleSession({ id: "aaaa1111-0000-4000-8000-000000000001", cwd: "C:\\work\\demo" }).write(path.join(home, ".claude", "projects"));
sampleCodex({ id: "bbbb2222-0000-4000-8000-000000000002", cwd: "C:\\work\\demo" }).write(path.join(home, ".codex"));
