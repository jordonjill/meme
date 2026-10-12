/**
 * Internal check of handoff content (plan §5, the V5 pilot in relay.md §4). Not
 * shipped. For each case, cut a session after turn k, build meme's handoff of
 * what came before, and ask a fresh agent three questions; the answers are then
 * compared by hand with what really happened next.
 *
 *   bun eval/v5.ts <session>:<turn> ...          write the prompts and the truth
 *   bun eval/v5.ts --run <session>:<turn> ...    also ask `claude -p` (costs money)
 *
 * Output goes to .cache/eval/v5/ (gitignored): it holds real session content.
 */
import { mkdirSync, mkdtempSync, realpathSync, rmdirSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import path from "node:path";
import { createContext } from "../src/cli/context";
import { buildHandoff } from "../src/handoff/build";
import { estimateTokens } from "../src/handoff/budget";
import { callsOf, contentOf, promptText } from "../src/model/record";
import { editedFiles } from "../src/model/tools";
import { groupTurns } from "../src/model/turns";
import { handedOver, resolveSession, sessionRecords } from "../src/store/queries";

const QUESTIONS = `---
You are taking over an earlier coding session; the text above is about it. Answer only from the text above, and say you do not know rather than guess:
1. What is the goal of the session?
2. Which files have been changed so far?
3. Where did it stop, and what should be done next?
Answer each in one or two sentences.`;

const args = process.argv.slice(2);
const runClaude = args.includes("--run");
const cases = args.filter((a) => a !== "--run");
if (!cases.length || cases.some((c) => !/^[0-9a-f-]+:\d+$/i.test(c))) {
  console.error("usage: bun eval/v5.ts [--run] <session>:<turn> ...");
  process.exit(2);
}

const root = path.resolve(import.meta.dir, "..", ".cache", "eval", "v5");
mkdirSync(root, { recursive: true });
const ctx = await createContext();
const db = ctx.store.db;

for (const c of cases) {
  const [ref, k] = [c.split(":")[0]!, Number(c.split(":")[1])];
  const session = resolveSession(db, ref);
  const all = sessionRecords(db, session.id);
  const kept = all.filter((r) => r.turn <= k);
  const last = kept.filter((r) => r.ts).at(-1)?.ts ?? session.ended_at;
  const handoff = buildHandoff(
    { session: { ...session, ended_at: last, mtime: null }, records: kept, env: ctx.platform.env, now: ctx.now, lookup: (ref, before) => handedOver(db, ref, before) },
    { fresh: false },
  );

  // What really happened after the cut, for grading by hand.
  const { turns } = groupTurns(all);
  const next = turns.find((t) => t.n === k + 1);
  const edited = new Set<string>();
  for (const t of turns.filter((t) => t.n <= k)) for (const r of t.records) for (const call of callsOf(r.body)) {
    for (const f of editedFiles(call)) edited.add(f);
  }
  const truth = {
    session: session.id,
    cutAfterTurn: k,
    turns: turns.length ? turns[turns.length - 1]!.n : 0,
    nextUserMessage: next?.prompt ? promptText(contentOf(next.prompt.body) ?? "").slice(0, 600) : null,
    editedSoFar: [...edited],
    lastReplyTail: turns.find((t) => t.n === k)?.reply?.slice(-600) ?? null,
  };

  const dir = path.join(root, `${session.id.slice(0, 8)}-${k}`);
  mkdirSync(dir, { recursive: true });
  writeFileSync(path.join(dir, "handoff.md"), handoff.text);
  writeFileSync(path.join(dir, "prompt.txt"), handoff.text + "\n" + QUESTIONS + "\n");
  writeFileSync(path.join(dir, "truth.json"), JSON.stringify(truth, null, 1) + "\n");
  console.log(`${session.id.slice(0, 8)} cut after turn ${k}: handoff ${estimateTokens(handoff.text)} tokens → ${path.relative(process.cwd(), dir)}`);

  if (runClaude) {
    // An empty directory, no tools, nothing saved: the answer can only come from the prompt.
    const empty = mkdtempSync(path.join(tmpdir(), "meme-v5-"));
    const p = Bun.spawnSync(["claude", "-p", "Answer as asked above.", "--tools", "", "--no-session-persistence", "--output-format", "json"], {
      cwd: empty,
      stdin: Bun.file(path.join(dir, "prompt.txt")),
      stdout: "pipe",
      stderr: "pipe",
    });
    writeFileSync(path.join(dir, "answer.json"), p.stdout.toString());
    // Claude Code still makes a project folder holding an empty memory/ for the directory; rmdir removes only empty ones.
    const project = path.join(process.env.CLAUDE_CONFIG_DIR || path.join(homedir(), ".claude"), "projects", realpathSync(empty).replace(/[^A-Za-z0-9]/g, "-"));
    for (const d of [path.join(project, "memory"), project, empty]) {
      try {
        rmdirSync(d);
      } catch {}
    }
    if (p.exitCode !== 0) console.log(`  claude exited with ${p.exitCode}: ${p.stderr.toString().slice(0, 300)}`);
    else {
      const out = JSON.parse(p.stdout.toString());
      console.log(`  answered, $${Number(out.total_cost_usd ?? 0).toFixed(3)}`);
    }
  }
}
