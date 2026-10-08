/**
 * Opt-in check on the machine's own Claude Code sessions: MEME_REAL_SESSIONS=1 bun test.
 * Reads them in place and prints counts only. Run it before upgrading trajectory
 * (plan §4.6.2, §7): every record must carry a native id found in its source file.
 */
import { expect, test } from "bun:test";
import { normalizeToCanonical } from "@letta-ai/trajectory";
import { claudeCode, BOUNDS } from "../../src/adapters/claude-code";
import { parseLines } from "../../src/adapters/read";
import { currentPlatform } from "../../src/platform/paths";

test.skipIf(!process.env.MEME_REAL_SESSIONS)("real sessions: every Claude Code record id is native and in its file", () => {
  const p = currentPlatform();
  let files = 0;
  let records = 0;
  for (const root of claudeCode.roots(p)) {
    let listed: string[] = [];
    try {
      listed = claudeCode.listFiles(root);
    } catch {
      continue;
    }
    for (const file of listed) {
      const text = claudeCode.readText(file);
      const uuids = new Set(parseLines(text).map((l) => l.obj.uuid));
      let recs;
      try {
        recs = normalizeToCanonical({ source: "claude-code", transcript: text, bounds: BOUNDS, sourceContext: { groupId: claudeCode.sessionId(file)! } }).records;
      } catch {
        continue; // sessions without any conversation
      }
      files++;
      for (const r of recs) {
        if (r.record_type === "meta") continue;
        records++;
        expect(r.source_identity_kind).toBe("native");
        expect(uuids.has(r.stable_source_record_id)).toBe(true);
      }
    }
  }
  console.log(`real sessions: ${files} files, ${records} records, all ids native`);
  expect(files).toBeGreaterThan(0);
});
