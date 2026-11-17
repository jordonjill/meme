import path from "node:path";

/**
 * Where things are in meme's data folder. Memory is kept in layers, one folder each:
 * the raw material, the evidence taken from it, the conclusions drawn from the
 * evidence, and what is derived from those and can be rebuilt. `state` is what meme
 * needs to run and cannot rebuild.
 */
export interface Layout {
  /** The mirror of the agents' sessions; rebuilt from them when it is gone. */
  mirror: string;
  /** Where the mirror was up to 0.1.0, in the data folder itself. */
  oldMirror: string;
  /** Material the user gave meme; unlike the mirror it cannot be rebuilt. */
  uploads: string;
  evidence: string;
  memory: string;
  derived: string;
  state: string;
  /** The version of the format of evidence, memory and state. */
  format: string;
}

export function layout(dataDir: string): Layout {
  return {
    mirror: path.join(dataDir, "raw", "sessions.sqlite"),
    oldMirror: path.join(dataDir, "meme.sqlite"),
    uploads: path.join(dataDir, "raw", "uploads"),
    evidence: path.join(dataDir, "evidence"),
    memory: path.join(dataDir, "memory"),
    derived: path.join(dataDir, "derived"),
    state: path.join(dataDir, "state"),
    format: path.join(dataDir, "FORMAT"),
  };
}

/** The files SQLite may keep beside a database. */
export const SQLITE_SIDE_FILES = ["-journal", "-wal", "-shm"];
