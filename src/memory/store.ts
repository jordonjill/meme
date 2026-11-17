import { appendFileSync, cpSync, existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { errorCode } from "../platform/fs";
import { layout, type Layout } from "../platform/layout";
import { parseShelf, shelfFile, shelfKey, type ShelfText } from "./entries";
import type { Entry, Shelf } from "./types";

/** The format of evidence, memory and state this meme reads and writes. */
export const FORMAT = 1;

/** The memory was written by a later meme; this one must not write to it. */
export class NewerFormat extends Error {}

export interface MemoryPaths extends Layout {
  lock: string;
  /** A number that goes up with every change, so readers know when to rebuild what they derived. */
  version: string;
  tombstones: string;
  snapshots: string;
}

export function memoryPaths(dataDir: string): MemoryPaths {
  const l = layout(dataDir);
  return {
    ...l,
    lock: path.join(l.state, "lock"),
    version: path.join(l.state, "version"),
    tombstones: path.join(l.state, "tombstones.jsonl"),
    snapshots: path.join(l.state, "snapshots"),
  };
}

const RENAME_RETRY_MS = [20, 50, 100, 200, 400];

/**
 * The whole file or nothing: written beside the target, then moved over it. Another
 * program that has the target open can refuse the move for a moment (Windows, and
 * WSL writing to a Windows drive: memory-v0.3-draft §9.3), so it is tried again.
 */
export function writeFileAtomic(file: string, text: string): void {
  mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
  const tmp = `${file}.${process.pid}.tmp`;
  writeFileSync(tmp, text, { mode: 0o600 });
  for (let attempt = 0; ; attempt++) {
    try {
      renameSync(tmp, file);
      return;
    } catch (err) {
      if (attempt >= RENAME_RETRY_MS.length || !["EBUSY", "EPERM", "EACCES"].includes(errorCode(err) ?? "")) {
        rmSync(tmp, { force: true });
        throw err;
      }
      Bun.sleepSync(RENAME_RETRY_MS[attempt]!);
    }
  }
}

export function readText(file: string): string | null {
  try {
    return readFileSync(file, "utf8");
  } catch (err) {
    if (errorCode(err) === "ENOENT") return null;
    throw err;
  }
}

/** Refuses a memory a later meme wrote. */
export function checkFormat(p: MemoryPaths): void {
  const n = Number(readText(p.format)?.trim() ?? FORMAT);
  if (n > FORMAT) throw new NewerFormat(`this memory was written by a newer meme (format ${n}, this one knows ${FORMAT}); update meme to change it`);
}

export function ensureFormat(p: MemoryPaths): void {
  if (!existsSync(p.format)) writeFileAtomic(p.format, `${FORMAT}\n`);
}

export function readVersion(p: MemoryPaths): number {
  return Number(readText(p.version)?.trim() ?? 0) || 0;
}

export function bumpVersion(p: MemoryPaths): number {
  const next = readVersion(p) + 1;
  writeFileAtomic(p.version, `${next}\n`);
  return next;
}

// --- the shelves: the conclusion files that exist

export interface OpenShelf extends ShelfText {
  shelf: Shelf;
  file: string;
}

const USER_FILES = ["RULES", "USER", "EXPERIENCE"] as const;
const PROJECT_FILES = ["MEMORY", "EXPERIENCE"] as const;

/** Every conclusion file there is under a memory folder, the user's first. */
export function shelvesIn(memoryDir: string): OpenShelf[] {
  const shelves: Shelf[] = USER_FILES.map((file) => ({ level: "user", file }));
  let projects: string[] = [];
  try {
    projects = readdirSync(path.join(memoryDir, "projects")).sort();
  } catch {}
  for (const project of projects) shelves.push(...PROJECT_FILES.map((file) => ({ level: "project" as const, project, file })));
  const open: OpenShelf[] = [];
  for (const shelf of shelves) {
    const file = shelfFile(memoryDir, shelf);
    const text = readText(file);
    if (text !== null) open.push({ shelf, file, ...parseShelf(text) });
  }
  return open;
}

export interface Placed {
  shelf: Shelf;
  file: string;
  entry: Entry;
}

export function entriesIn(memoryDir: string): Placed[] {
  return shelvesIn(memoryDir).flatMap((s) => s.entries.map((entry) => ({ shelf: s.shelf, file: s.file, entry })));
}

export { shelfKey };

// --- snapshots: the conclusion files as they were before each change

const KEEP_SNAPSHOTS = 20;

export function snapshotDirs(p: MemoryPaths): string[] {
  try {
    return readdirSync(p.snapshots)
      .sort()
      .map((name) => path.join(p.snapshots, name));
  } catch {
    return [];
  }
}

/** Copies the conclusion files aside; null when there are none yet. */
export function takeSnapshot(p: MemoryPaths): string | null {
  if (!existsSync(p.memory)) return null;
  const dir = path.join(p.snapshots, `${String(readVersion(p)).padStart(8, "0")}-${Date.now().toString(36)}`);
  mkdirSync(p.snapshots, { recursive: true, mode: 0o700 });
  cpSync(p.memory, dir, { recursive: true });
  return dir;
}

/** Puts the conclusion files back as a snapshot has them; with no snapshot there were none. */
export function restoreSnapshot(p: MemoryPaths, dir: string | null): void {
  rmSync(p.memory, { recursive: true, force: true });
  if (dir) cpSync(dir, p.memory, { recursive: true });
}

export function pruneSnapshots(p: MemoryPaths): void {
  for (const dir of snapshotDirs(p).slice(0, -KEEP_SNAPSHOTS)) rmSync(dir, { recursive: true, force: true });
}

// --- tombstones: what was forgotten, as hashes, so it is not learned again

export interface Tombstone {
  id: string;
  hash: string;
  at: string;
}

export function tombstones(p: MemoryPaths): Tombstone[] {
  const text = readText(p.tombstones);
  if (!text) return [];
  const out: Tombstone[] = [];
  for (const line of text.split("\n")) {
    if (!line.trim()) continue;
    try {
      out.push(JSON.parse(line) as Tombstone);
    } catch {}
  }
  return out;
}

export function addTombstones(p: MemoryPaths, stones: Tombstone[]): void {
  if (!stones.length) return;
  mkdirSync(p.state, { recursive: true, mode: 0o700 });
  appendFileSync(p.tombstones, stones.map((t) => JSON.stringify(t) + "\n").join(""), { mode: 0o600 });
}

export function writeTombstones(p: MemoryPaths, stones: Tombstone[]): void {
  writeFileAtomic(p.tombstones, stones.map((t) => JSON.stringify(t) + "\n").join(""));
}
