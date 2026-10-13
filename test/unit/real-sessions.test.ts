/**
 * Opt-in check on the machine's own sessions: MEME_REAL_SESSIONS=1 bun test.
 * Reads them in place and prints counts only. Run it before upgrading trajectory
 * (plan §4.6.2, §7): every record must carry a native id found in its source file;
 * and after an agent upgrade: every record type must be in the agent's profile.
 */
import { expect, test } from "bun:test";
import { normalizeToCanonical } from "@letta-ai/trajectory";
import { ADAPTERS } from "../../src/adapters";
import { claudeCode } from "../../src/adapters/claude-code";
import { BOUNDS } from "../../src/adapters/read";
import { projectResolver } from "../../src/model/project";
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

test.skipIf(!process.env.MEME_REAL_SESSIONS)("real sessions: every record type is in its agent's profile, and every conversation line read (arch.md §6.1)", () => {
  const p = currentPlatform();
  let sessions = 0;
  const unknown: string[] = [];
  for (const adapter of ADAPTERS) {
    for (const root of adapter.roots(p)) {
      let listed: string[] = [];
      try {
        listed = adapter.listFiles(root);
      } catch {
        continue;
      }
      const groups = new Map<string, string[]>();
      for (const f of listed) {
        const id = adapter.sessionId(f);
        if (id) (groups.get(id) ?? groups.set(id, []).get(id)!).push(f);
      }
      for (const [id, files] of groups) {
        sessions++;
        const c = adapter.convert(files, { sessionId: id, root, project: projectResolver(p), filesOf: (x) => groups.get(x) ?? [] });
        // Types and counts only, never content. Both layers: unknown types, and lines of known ones that became nothing.
        for (const u of c.unknown) unknown.push(`${adapter.agent} ${u.version ?? "?"} ${u.type} ×${u.count}`);
        for (const u of c.unread) unknown.push(`${adapter.agent} ${u.version ?? "?"} ${u.type} ×${u.count} (known type, read as nothing)`);
      }
    }
  }
  console.log(`real sessions: ${sessions} sessions, ${unknown.length} kinds of lines meme could not read (unknown types, or known types read as nothing)${unknown.length ? ":\n  " + unknown.join("\n  ") : ""}`);
  expect(sessions).toBeGreaterThan(0);
  expect(unknown).toEqual([]);
});
