/** Paths across Windows and WSL (arch.md 6.3, rule 5), and where a session's files are (rule 1). */
import { afterEach, describe, expect, test } from "bun:test";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { awayFrom, gitRoot } from "../../src/handoff/place";
import { currentPlatform, mountRoot, parseMountRoot, pathKey, useMountRoot, winToWsl, wslToWin } from "../../src/platform/paths";
import { tempDir, testPlatform } from "../helpers";

afterEach(() => useMountRoot("/mnt/"));

describe("where WSL mounts the Windows drives", () => {
  test("from wsl.conf's [automount] root, /mnt/ otherwise", () => {
    expect(parseMountRoot('[automount]\nroot = /\noptions = "metadata"\n')).toBe("/");
    expect(parseMountRoot("[Automount]\n  root = \"/win\"  # drives\n")).toBe("/win/");
    expect(parseMountRoot("[network]\nroot = /x/\n")).toBeNull();
    expect(parseMountRoot("")).toBeNull();
  });

  test("root = /: /c/... and C:\\... are the same place", () => {
    useMountRoot("/");
    expect(winToWsl("C:\\code\\shop\\web")).toBe("/c/code/shop/web");
    expect(wslToWin("/c/code/shop")).toBe("C:\\code\\shop");
    expect(wslToWin("/mnt/c/code")).toBe("/mnt/c/code");
    expect(pathKey("/c/Code/Shop")).toBe(pathKey("/c/code/shop"));
    expect(pathKey("/home/U")).not.toBe(pathKey("/home/u"));
  });

  test("the Windows user folders follow it", () => {
    const home = tempDir();
    writeFileSync(path.join(home, "wsl.conf"), "[automount]\nroot = /win/\n");
    const saved = { ...process.env };
    try {
      Object.assign(process.env, { MEME_ENV: "wsl", MEME_WSL_CONF: path.join(home, "wsl.conf") });
      delete process.env.MEME_WINDOWS_USERS_DIR;
      expect(currentPlatform().windowsUsersDir).toBe("/win/c/Users");
      expect(mountRoot()).toBe("/win/");
    } finally {
      for (const k of ["MEME_ENV", "MEME_WSL_CONF", "MEME_WINDOWS_USERS_DIR"]) {
        if (saved[k] === undefined) delete process.env[k];
        else process.env[k] = saved[k];
      }
    }
  });
});

describe("on the session's files or not (rule 1)", () => {
  test("a git root is the nearest .git, a worktree's file too; a subfolder counts; outside git, the start directory", () => {
    const home = tempDir();
    mkdirSync(path.join(home, "repo", ".git"), { recursive: true });
    mkdirSync(path.join(home, "repo", "a", "b"), { recursive: true });
    mkdirSync(path.join(home, "tree"), { recursive: true });
    writeFileSync(path.join(home, "tree", ".git"), "gitdir: elsewhere\n");
    mkdirSync(path.join(home, "plain", "sub"), { recursive: true });
    expect(gitRoot(path.join(home, "repo", "a", "b"))).toBe(path.join(home, "repo"));
    expect(gitRoot(path.join(home, "tree"))).toBe(path.join(home, "tree"));
    const p = testPlatform(home);
    const at = (session: string, cwd: string) => awayFrom(session, "linux", p, null, cwd);
    expect(at(path.join(home, "repo"), path.join(home, "repo", "a", "b"))).toBeNull();
    expect(at(path.join(home, "repo", "a"), path.join(home, "repo"))).toBeNull();
    expect(at(path.join(home, "tree"), path.join(home, "repo"))!.repo).toBe(true);
    expect(at(path.join(home, "plain"), path.join(home, "plain", "sub"))).toBeNull();
    expect(at(path.join(home, "plain", "sub"), path.join(home, "plain"))!.repo).toBe(false);
    // A repository inside the plain folder is other files.
    mkdirSync(path.join(home, "plain", "sub", ".git"));
    expect(at(path.join(home, "plain"), path.join(home, "plain", "sub"))).not.toBeNull();
    expect(awayFrom(null, "linux", p, null, home)).toBeNull();
  });
});
