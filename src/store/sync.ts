import type { Database } from "bun:sqlite";

/**
 * The original file is gone: drop it, and drop the session once it has no files
 * left. secure_delete overwrites the freed pages, so the text does not linger in
 * the database file. Returns the sessions whose copy flags need a recount.
 */
export function deleteFile(db: Database, path: string): string[] {
  const touched: string[] = [];
  db.transaction(() => {
    const row = db.query<{ session: string }, [string]>("SELECT session FROM files WHERE path = ?").get(path);
    if (!row) return;
    db.run("DELETE FROM files WHERE path = ?", [path]);
    db.run("DELETE FROM failures WHERE path = ?", [path]);
    const left = db.query("SELECT 1 FROM files WHERE session = ? LIMIT 1").get(row.session);
    if (left) {
      // The copy the mirror held is gone and another source has one (plan §6 ⑪, F10): that one is converted on its next run.
      if (!db.query("SELECT 1 FROM files f JOIN sessions s ON s.id = f.session WHERE s.id = ? AND f.source = s.source LIMIT 1").get(row.session)) {
        db.run("UPDATE sessions SET source = NULL WHERE id = ?", [row.session]);
        db.run("UPDATE files SET size = -1 WHERE session = ?", [row.session]);
      }
      touched.push(row.session);
      return;
    }
    const next = db.query<{ continued_in: string | null }, [string]>("SELECT continued_in FROM sessions WHERE id = ?").get(row.session);
    if (next?.continued_in) touched.push(next.continued_in);
    // Forks of it lose the parent their copied records came from.
    for (const f of db.query<{ id: string }, [string]>("SELECT id FROM sessions WHERE forked_from = ?").all(row.session)) touched.push(f.id);
    db.run("DELETE FROM sessions WHERE id = ?", [row.session]);
  }).immediate();
  return touched;
}

/**
 * Copy flags (plan §4.6.4): when A says `continued-in → B`, the records in B whose
 * uid also appears in A were copied from A. A fork B of A starts with A's
 * records up to the fork point, under the same uids, so the same rule applies.
 * Recounted for every continuation target and fork plus the sessions touched in
 * this run (a deleted A clears B's flags).
 */
export function recomputeCopied(db: Database, touched: Iterable<string>): void {
  const sessions = new Set<string>(touched);
  for (const r of db.query<{ id: string }, []>(
    "SELECT DISTINCT continued_in AS id FROM sessions WHERE continued_in IS NOT NULL UNION SELECT id FROM sessions WHERE forked_from IS NOT NULL",
  ).all()) {
    sessions.add(r.id);
  }
  const wrong = db.prepare<{ seq: number; copied: number }, [string]>(
    `SELECT seq, copied FROM records r
     WHERE r.session = ?1 AND r.copied != (r.uid IS NOT NULL AND EXISTS (
       SELECT 1 FROM records o JOIN sessions a ON a.id = o.session
       WHERE o.uid = r.uid AND (a.continued_in = r.session OR a.id = (SELECT forked_from FROM sessions WHERE id = r.session))))`,
  );
  const flip = db.prepare("UPDATE records SET copied = ? WHERE session = ? AND seq = ?");
  db.transaction(() => {
    for (const id of sessions) {
      for (const r of wrong.all(id)) flip.run(r.copied ? 0 : 1, id, r.seq);
    }
  }).immediate();
}
