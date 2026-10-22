/**
 * install.ps1 (plan §6 ⑬), where Windows' own PowerShell 5.1 can be reached from
 * WSL. Everything lands in Windows' temporary folder: the install folder, meme's
 * data and the user folder meme reads; PATH is left alone and WSL is not read.
 */
import { describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";

const POWERSHELL = "/mnt/c/Windows/System32/WindowsPowerShell/v1.0/powershell.exe";
const ROOT = path.resolve(import.meta.dir, "../..");
const DIST = path.join(ROOT, "dist");
const can = process.platform === "linux" && existsSync(POWERSHELL);

const wslpath = (flag: string, p: string) => Bun.spawnSync(["wslpath", flag, p]).stdout.toString().trim();

/** A folder in Windows' temporary folder, as WSL sees it. */
function windowsTemp(): string {
  const win = Bun.spawnSync([POWERSHELL, "-NoProfile", "-Command", "[IO.Path]::GetTempPath()"]).stdout.toString().trim();
  const dir = path.join(wslpath("-u", win), `meme-ps-test-${process.pid}-${Math.random().toString(36).slice(2, 8)}`);
  mkdirSync(path.join(dir, "home"), { recursive: true });
  return dir;
}

/** Windows may hold a new exe a moment longer (an antivirus scan): try again for a few seconds. */
function removeLater(dir: string): void {
  for (let i = 0; ; i++) {
    try {
      rmSync(dir, { recursive: true, force: true });
      return;
    } catch (err) {
      if (i >= 20) throw err;
      Bun.sleepSync(500);
    }
  }
}

function runScript(tmp: string, from: string) {
  const env = {
    ...process.env,
    MEME_FROM: from,
    MEME_INSTALL_DIR: path.join(tmp, "bin"),
    MEME_HOME: path.join(tmp, "data"),
    USERPROFILE: path.join(tmp, "home"),
    MEME_NO_MODIFY_PATH: "1",
    MEME_NO_WSL: "1",
    WSLENV: "MEME_FROM/p:MEME_INSTALL_DIR/p:MEME_HOME/p:USERPROFILE/p:MEME_NO_MODIFY_PATH:MEME_NO_WSL",
  };
  const p = Bun.spawnSync([POWERSHELL, "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", wslpath("-w", path.join(ROOT, "install.ps1"))], { env, stdout: "pipe", stderr: "pipe" });
  return { code: p.exitCode, out: p.stdout.toString().replace(/\r\n/g, "\n"), err: p.stderr.toString().replace(/\r\n/g, "\n") };
}

describe.skipIf(!can)("install.ps1 in Windows PowerShell 5.1", () => {
  test.skipIf(!existsSync(path.join(DIST, "meme-windows-x64.exe")))("installs meme.exe from a build, leaves PATH alone, and runs meme install", () => {
    const tmp = windowsTemp();
    try {
      const r = runScript(tmp, DIST);
      expect(r.code, r.out + r.err).toBe(0);
      expect(r.out).toMatch(/Installed .*\\bin\\meme\.exe\n/);
      expect(r.out).toContain("is not on your PATH; add it to run meme by name.");
      expect(r.out).toContain("meme 0.1.0\n");
      expect(existsSync(path.join(tmp, "bin", "meme.exe"))).toBe(true);
    } finally {
      removeLater(tmp);
    }
  }, 60_000);

  test("a file that does not match its checksum: nothing installed", () => {
    const tmp = windowsTemp();
    try {
      const rel = path.join(tmp, "release");
      mkdirSync(rel);
      for (const f of ["meme-windows-x64.exe", "meme-windows-x64-baseline.exe"]) writeFileSync(path.join(rel, f), "not meme");
      writeFileSync(path.join(rel, "SHA256SUMS"), `${"0".repeat(64)}  meme-windows-x64.exe\n${"0".repeat(64)}  meme-windows-x64-baseline.exe\n`);
      const r = runScript(tmp, rel);
      expect(r.code).not.toBe(0);
      expect(r.out + r.err).toContain("does not match its checksum; nothing was installed");
      expect(existsSync(path.join(tmp, "bin", "meme.exe"))).toBe(false);
    } finally {
      removeLater(tmp);
    }
  }, 60_000);
});
