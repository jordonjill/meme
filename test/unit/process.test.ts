/** Whether a process still runs (plan §6 ⑧.3): the parts that need no other process. */
import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { statStart } from "../../src/platform/process";

describe("processes", () => {
  test("the start time is field 22 of /proc/<pid>/stat, also when the command name has spaces and parentheses", () => {
    const fields = (start: string) => `S 1 ${Array.from({ length: 17 }, (_, i) => i + 5).join(" ")} ${start} 4096 0 0`;
    expect(statStart(`5088 (claude) ${fields("43704")}`)).toBe("43704");
    expect(statStart(`5088 (a b) (c)) ${fields("812")}\n`)).toBe("812");
    expect(statStart("garbage")).toBeNull();
  });

  test.skipIf(process.platform !== "linux")("on this machine: what awk reads as field 22", () => {
    const stat = readFileSync("/proc/self/stat", "utf8");
    expect(statStart(stat)).toBe(stat.split(" ")[21]!);
  });
});
