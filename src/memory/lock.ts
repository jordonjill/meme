import { closeSync, mkdirSync, openSync, readFileSync, renameSync, unlinkSync, writeSync } from "node:fs";
import path from "node:path";
import { errorCode } from "../platform/fs";

export interface LockOptions {
  /** How long to wait for the lock before giving up. */
  waitMs?: number;
  /** A lock held longer than this was left by a process that died. */
  staleMs?: number;
}

/** The lock could not be had in time: someone else is still writing. */
export class LockTimeout extends Error {}

const WAIT_MS = 10_000;
const STALE_MS = 30_000;

interface Held {
  token: string;
  at: number;
}

/**
 * Runs `fn` while holding a lock: a file that is created only if it is not there yet.
 * Unlike a file lock, that works between a Windows process and a WSL one writing in
 * the same folder (plan-m2 F1; tried on 2026-11-17, memory-v0.3-draft §9.3). The WSL
 * side wins such a lock far less often, so waiting is part of it.
 *
 * Hold it for the write itself, never while a model is being called. A holder that
 * died leaves the file behind; another process cannot see whether it lives (not
 * across the two systems), so a lock older than `staleMs` is taken over.
 */
export async function withLock<T>(file: string, fn: () => T | Promise<T>, opts: LockOptions = {}): Promise<T> {
  const token = await take(file, opts.waitMs ?? WAIT_MS, opts.staleMs ?? STALE_MS);
  try {
    return await fn();
  } finally {
    release(file, token);
  }
}

async function take(file: string, waitMs: number, staleMs: number): Promise<string> {
  mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
  const token = `${process.pid}-${crypto.randomUUID()}`;
  const deadline = Date.now() + waitMs;
  for (let pause = 5; ; pause = Math.min(pause * 2, 100)) {
    if (create(file, token)) return token;
    if (dropIfStale(file, token, staleMs)) continue;
    if (Date.now() >= deadline) throw new LockTimeout(`another meme has been writing for over ${Math.round(waitMs / 1000)} seconds (${file})`);
    // Not all at the same moment, when several are waiting.
    await Bun.sleep(pause + Math.random() * pause);
  }
}

/** Creates the lock file if there is none; false when someone else holds it. */
function create(file: string, token: string): boolean {
  let fd: number;
  try {
    fd = openSync(file, "wx", 0o600);
  } catch (err) {
    // EEXIST: held. EPERM, EACCES, EBUSY: Windows, while the last holder's file is still going away.
    if (["EEXIST", "EPERM", "EACCES", "EBUSY"].includes(errorCode(err) ?? "")) return false;
    throw err;
  }
  try {
    writeSync(fd, JSON.stringify({ token, at: Date.now() } satisfies Held));
  } finally {
    closeSync(fd);
  }
  return true;
}

function read(file: string): string | null {
  try {
    return readFileSync(file, "utf8");
  } catch {
    return null;
  }
}

/**
 * Removes a lock its holder left behind. The file is moved aside first and only if it
 * still says what was just read, so two waiters do not both remove it, and a lock
 * taken in the meantime is not the one that goes.
 */
function dropIfStale(file: string, token: string, staleMs: number): boolean {
  const text = read(file);
  if (text === null) return false; // released just now, or not readable: wait like for any holder
  let at: number;
  try {
    at = (JSON.parse(text) as Held).at;
  } catch {
    return false; // being written this moment
  }
  if (!(Date.now() - at > staleMs)) return false;
  const aside = `${file}.${token}.stale`;
  try {
    if (read(file) !== text) return false;
    renameSync(file, aside);
    unlinkSync(aside);
  } catch {
    return false;
  }
  return true;
}

function release(file: string, token: string): void {
  const text = read(file);
  try {
    // Only one's own: after a takeover the file is someone else's.
    if (text !== null && (JSON.parse(text) as Held).token === token) unlinkSync(file);
  } catch {}
}
