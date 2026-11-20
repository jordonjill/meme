import { describe, expect, test } from "bun:test";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { LockTimeout, withLock } from "../../src/memory/lock";
import { tempDir } from "../helpers";

const lockIn = (dir: string) => path.join(dir, "state", "lock");
const heldBy = (token: string, at = Date.now()) => JSON.stringify({ token, at });

describe("the store's write lock (plan-m2 F1)", () => {
  test("runs the work while the lock file is there, and removes it afterwards", async () => {
    const file = lockIn(tempDir());
    const seen = await withLock(file, () => existsSync(file));
    expect(seen).toBe(true);
    expect(existsSync(file)).toBe(false);
  });

  test("the lock is given back when the work fails", async () => {
    const file = lockIn(tempDir());
    await expect(
      withLock(file, () => {
        throw new Error("no");
      }),
    ).rejects.toThrow("no");
    expect(existsSync(file)).toBe(false);
  });

  test("a second caller waits for the first", async () => {
    const file = lockIn(tempDir());
    const order: string[] = [];
    const first = withLock(file, async () => {
      order.push("first in");
      await Bun.sleep(60);
      order.push("first out");
    });
    const second = withLock(file, () => {
      order.push("second in");
    });
    await Promise.all([first, second]);
    expect(order).toEqual(["first in", "first out", "second in"]);
  });

  test("a lock someone else holds is not taken: the wait ends with LockTimeout, the file stays", async () => {
    const file = lockIn(tempDir());
    await withLock(file, () => {});
    writeFileSync(file, heldBy("someone-else"));
    await expect(withLock(file, () => {}, { waitMs: 80 })).rejects.toBeInstanceOf(LockTimeout);
    expect(JSON.parse(readFileSync(file, "utf8")).token).toBe("someone-else");
  });

  test("a lock left by a process that died is taken over", async () => {
    const file = lockIn(tempDir());
    await withLock(file, () => {});
    writeFileSync(file, heldBy("dead", Date.now() - 60_000));
    expect(await withLock(file, () => "done", { waitMs: 500 })).toBe("done");
    expect(existsSync(file)).toBe(false);
  });

  test("a holder that was taken over does not remove the new holder's lock", async () => {
    const file = lockIn(tempDir());
    await withLock(file, () => {
      // While this one works, its lock is declared stale and someone else takes it.
      writeFileSync(file, heldBy("the-new-holder"));
    });
    expect(JSON.parse(readFileSync(file, "utf8")).token).toBe("the-new-holder");
  });

  test("two processes adding to one number under the lock lose nothing", async () => {
    const dir = tempDir();
    const file = lockIn(dir);
    const number = path.join(dir, "n");
    writeFileSync(number, "0");
    const script = path.join(dir, "adder.ts");
    writeFileSync(
      script,
      [
        `import { readFileSync, writeFileSync } from "node:fs";`,
        `import { withLock } from ${JSON.stringify(path.resolve(import.meta.dir, "../../src/memory/lock.ts"))};`,
        `for (let i = 0; i < 40; i++) {`,
        `  await withLock(${JSON.stringify(file)}, async () => {`,
        `    const n = Number(readFileSync(${JSON.stringify(number)}, "utf8"));`,
        `    await Bun.sleep(1);`,
        `    writeFileSync(${JSON.stringify(number)}, String(n + 1));`,
        `  });`,
        `}`,
      ].join("\n"),
    );
    const adders = [1, 2].map(() => Bun.spawn([process.execPath, script], { stdout: "ignore", stderr: "pipe" }));
    const codes = await Promise.all(adders.map((p) => p.exited));
    expect(codes).toEqual([0, 0]);
    expect(readFileSync(number, "utf8")).toBe("80");
    expect(existsSync(file)).toBe(false);
  });
});
