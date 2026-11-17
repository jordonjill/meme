import { describe, expect, test } from "bun:test";
import { existsSync, lstatSync, mkdirSync, readlinkSync, rmSync, symlinkSync } from "node:fs";
import path from "node:path";
import { pointer, storeDir, StoreUnreachable } from "../../src/memory/place";
import type { Platform } from "../../src/platform/paths";
import { tempDir, testPlatform } from "../helpers";

/** A WSL home and a Windows Users folder with these user folders, each with what makes it someone's home. */
function wsl(users: Record<string, string[]>, vars: Record<string, string> = {}): Platform {
  const home = tempDir();
  const usersDir = path.join(tempDir(), "Users");
  for (const [name, has] of Object.entries(users)) {
    mkdirSync(path.join(usersDir, name), { recursive: true });
    for (const dir of has) mkdirSync(path.join(usersDir, name, dir), { recursive: true });
  }
  return { ...testPlatform(home, "wsl", usersDir), vars };
}

const nobody = () => null;

describe("where memory is kept (plan-m2 F6, memory-v0.3-draft §9)", () => {
  test("on Linux, macOS and Windows: in meme's own data folder", () => {
    for (const env of ["linux", "mac", "win"] as const) {
      const p = testPlatform(tempDir(), env);
      expect(storeDir(p, nobody)).toBe(p.dataDir);
    }
  });

  test("in WSL: in the Windows user's folder, and a link in WSL's data folder says so", () => {
    const p = wsl({ me: [".claude"], Public: ["Documents"], Default: ["AppData"], "All Users": [] });
    const store = path.join(p.windowsUsersDir!, "me", ".meme");
    expect(storeDir(p, nobody)).toBe(store);
    expect(lstatSync(pointer(p.dataDir)).isSymbolicLink()).toBe(true);
    expect(readlinkSync(pointer(p.dataDir))).toBe(store);
    // Nothing is made on the Windows side by asking where memory is.
    expect(existsSync(store)).toBe(false);
  });

  test("once chosen it stays, whoever else turns up under Users", () => {
    const p = wsl({ me: ["AppData"] });
    const store = storeDir(p, nobody);
    mkdirSync(path.join(p.windowsUsersDir!, "other", "AppData"), { recursive: true });
    expect(storeDir(p, () => "C:\\Users\\other")).toBe(store);
  });

  test("with several Windows users, Windows is asked whose WSL this is", () => {
    const p = wsl({ me: ["AppData"], Other: [".codex"] });
    expect(storeDir(p, () => "C:\\Users\\other\\")).toBe(path.join(p.windowsUsersDir!, "Other", ".meme"));
  });

  test("when Windows cannot say, or there is no Windows user, memory stays in WSL and nothing is recorded", () => {
    for (const p of [wsl({ me: ["AppData"], other: ["AppData"] }), wsl({ Public: ["Documents"] }), wsl({ stranger: [] })]) {
      expect(storeDir(p, nobody)).toBe(p.dataDir);
      expect(existsSync(pointer(p.dataDir))).toBe(false);
    }
    const none = { ...testPlatform(tempDir(), "wsl", path.join(tempDir(), "not-there")), vars: {} };
    expect(storeDir(none, nobody)).toBe(none.dataDir);
  });

  test("a data folder named on purpose holds the memory too; MEME_STORE names another place", () => {
    const p = wsl({ me: ["AppData"] }, { MEME_HOME: "/somewhere/data" });
    expect(storeDir(p, nobody)).toBe(p.dataDir);
    expect(storeDir({ ...p, vars: { MEME_STORE: "/elsewhere/memory", MEME_HOME: "/somewhere/data" } }, nobody)).toBe("/elsewhere/memory");
  });

  test("a store on a drive that is not there now is an error, not a new memory in WSL", () => {
    const p = wsl({ me: ["AppData"] });
    storeDir(p, nobody);
    rmSync(p.windowsUsersDir!, { recursive: true });
    expect(() => storeDir(p, nobody)).toThrow(StoreUnreachable);
    // A link someone put there to a folder that exists is taken as it is.
    rmSync(pointer(p.dataDir));
    const mine = path.join(tempDir(), "my-memory");
    symlinkSync(mine, pointer(p.dataDir));
    expect(storeDir(p, nobody)).toBe(mine);
  });
});
