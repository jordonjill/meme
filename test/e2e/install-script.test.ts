/**
 * install.sh (plan §6 ⑬): which file it picks, the checksum, where it puts meme,
 * the PATH line, and `meme install` at the end. Stand-ins for the release files,
 * `uname` and `sysctl`; CPU flags from a file of our own.
 */
import { describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { tempDir } from "../helpers";

const SCRIPT = path.resolve(import.meta.dir, "../../install.sh");
const FILES = ["linux-x64", "linux-x64-baseline", "linux-arm64", "darwin-x64", "darwin-x64-baseline", "darwin-arm64"].map((t) => `meme-${t}`);

/** A release folder whose every file is a little meme that says which file it is and logs how it was run. */
function release(home: string): { dir: string; log: string } {
  const dir = path.join(home, "release");
  const log = path.join(home, "meme-ran.log");
  mkdirSync(dir, { recursive: true });
  const sums: string[] = [];
  for (const f of FILES) {
    const body = `#!/bin/sh\necho "${f} $*" >> "${log}"\necho "meme 0.1.0"\n`;
    writeFileSync(path.join(dir, f), body);
    sums.push(`${createHash("sha256").update(body).digest("hex")}  ${f}`);
  }
  writeFileSync(path.join(dir, "SHA256SUMS"), sums.join("\n") + "\n");
  return { dir, log };
}

/** `uname -s`/`-m` and `sysctl -n <name>` as a machine would answer. */
function machine(home: string, o: { os: string; arch: string; avx2?: boolean; rosetta?: boolean }) {
  const bin = path.join(home, "fake-bin");
  mkdirSync(bin, { recursive: true });
  writeFileSync(path.join(bin, "uname"), `#!/bin/sh\ncase "$1" in -s) echo ${o.os};; -m) echo ${o.arch};; *) echo ${o.os};; esac\n`);
  writeFileSync(
    path.join(bin, "sysctl"),
    `#!/bin/sh\ncase "$2" in sysctl.proc_translated) echo ${o.rosetta ? 1 : 0};; machdep.cpu.leaf7_features) echo "SMEP ERMS ${o.avx2 === false ? "" : "AVX2 "}BMI2";; *) exit 1;; esac\n`,
  );
  for (const f of ["uname", "sysctl"]) chmodSync(path.join(bin, f), 0o755);
  const cpuinfo = path.join(home, "cpuinfo");
  writeFileSync(cpuinfo, `processor\t: 0\nflags\t\t: fpu sse sse2 ${o.avx2 === false ? "" : "avx2 "}bmi2\n`);
  return { bin, cpuinfo };
}

function install(o: { os?: string; arch?: string; avx2?: boolean; rosetta?: boolean; env?: Record<string, string>; shell?: string } = {}) {
  const home = tempDir("meme-install-");
  const rel = release(home);
  const m = machine(home, { os: o.os ?? "Linux", arch: o.arch ?? "x86_64", avx2: o.avx2, rosetta: o.rosetta });
  const env = { HOME: home, PATH: `${m.bin}:/usr/bin:/bin`, SHELL: o.shell ?? "/bin/bash", MEME_FROM: rel.dir, MEME_CPUINFO: m.cpuinfo, ...o.env };
  const runIt = () => {
    const p = Bun.spawnSync(["sh", SCRIPT], { env, stdout: "pipe", stderr: "pipe" });
    return { code: p.exitCode, out: p.stdout.toString(), err: p.stderr.toString() };
  };
  const r = runIt();
  const meme = path.join(home, ".local", "bin", "meme");
  const installed = existsSync(meme) ? readFileSync(meme, "utf8").match(/echo "(meme-[\w-]+) /)?.[1] : null;
  return { ...r, home, meme, installed, ran: existsSync(rel.log) ? readFileSync(rel.log, "utf8") : "", again: runIt, rel };
}

describe.skipIf(process.platform === "win32")("install.sh picks the file for the system and the CPU", () => {
  const cases: [string, Parameters<typeof install>[0], string][] = [
    ["Linux x64 with AVX2", { os: "Linux", arch: "x86_64" }, "meme-linux-x64"],
    ["Linux x64 without AVX2", { os: "Linux", arch: "x86_64", avx2: false }, "meme-linux-x64-baseline"],
    ["Linux on ARM", { os: "Linux", arch: "aarch64" }, "meme-linux-arm64"],
    ["a Mac with Apple silicon", { os: "Darwin", arch: "arm64" }, "meme-darwin-arm64"],
    ["a Rosetta terminal on Apple silicon", { os: "Darwin", arch: "x86_64", rosetta: true }, "meme-darwin-arm64"],
    ["an Intel Mac", { os: "Darwin", arch: "x86_64" }, "meme-darwin-x64"],
    ["an Intel Mac without AVX2", { os: "Darwin", arch: "x86_64", avx2: false }, "meme-darwin-x64-baseline"],
  ];
  for (const [name, o, file] of cases) {
    test(name, () => {
      const r = install(o);
      expect(r.code, r.err).toBe(0);
      expect(r.installed).toBe(file);
    });
  }

  test("Git Bash on Windows is told to use install.ps1", () => {
    const r = install({ os: "MINGW64_NT-10.0-26100", arch: "x86_64" });
    expect(r.code).toBe(1);
    expect(r.err).toContain("install.ps1");
    expect(existsSync(r.meme)).toBe(false);
  });
});

describe.skipIf(process.platform === "win32")("install.sh puts meme in place", () => {
  test("into ~/.local/bin, on PATH through the shell's startup file once, then meme install", () => {
    const r = install();
    expect(r.code, r.err).toBe(0);
    expect(r.out).toContain(`Installed ${r.meme}`);
    expect(r.ran).toBe("meme-linux-x64 install\n");
    const rc = path.join(r.home, ".bashrc");
    expect(readFileSync(rc, "utf8")).toContain(`export PATH="${path.dirname(r.meme)}:$PATH"`);
    expect(r.out).toContain(`Added ${path.dirname(r.meme)} to PATH in ${rc}`);
    r.again();
    expect(readFileSync(rc, "utf8").match(/export PATH=/g)?.length).toBe(1);
  });

  test("zsh's startup file for zsh; none touched with MEME_NO_MODIFY_PATH=1 or when the folder is on PATH already", () => {
    const z = install({ shell: "/bin/zsh" });
    expect(readFileSync(path.join(z.home, ".zshrc"), "utf8")).toContain("export PATH=");
    const no = install({ env: { MEME_NO_MODIFY_PATH: "1" } });
    expect(no.code).toBe(0);
    expect(existsSync(path.join(no.home, ".bashrc"))).toBe(false);
    expect(no.out).toContain("is not on your PATH");
  });

  test("a file that does not match its checksum: nothing installed", () => {
    const home = tempDir("meme-install-");
    const rel = release(home);
    writeFileSync(path.join(rel.dir, "meme-linux-x64"), "#!/bin/sh\necho tampered\n");
    const m = machine(home, { os: "Linux", arch: "x86_64" });
    const p = Bun.spawnSync(["sh", SCRIPT], { env: { HOME: home, PATH: `${m.bin}:/usr/bin:/bin`, SHELL: "/bin/bash", MEME_FROM: rel.dir, MEME_CPUINFO: m.cpuinfo }, stdout: "pipe", stderr: "pipe" });
    expect(p.exitCode).toBe(1);
    expect(p.stderr.toString()).toContain("meme-linux-x64 does not match its checksum; nothing was installed");
    expect(existsSync(path.join(home, ".local", "bin", "meme"))).toBe(false);
  });

  test("downloads from the release, with curl", async () => {
    const home = tempDir("meme-install-");
    const rel = release(home);
    const asked: string[] = [];
    const server = Bun.serve({
      port: 0,
      fetch(req) {
        const name = new URL(req.url).pathname.split("/").pop()!;
        asked.push(name);
        const file = path.join(rel.dir, name);
        return existsSync(file) ? new Response(Bun.file(file)) : new Response("not found", { status: 404 });
      },
    });
    try {
      const m = machine(home, { os: "Linux", arch: "aarch64" });
      const p = Bun.spawn(["sh", SCRIPT], {
        env: { HOME: home, PATH: `${m.bin}:/usr/bin:/bin`, SHELL: "/bin/bash", MEME_RELEASE_URL: `http://127.0.0.1:${server.port}/download`, MEME_CPUINFO: m.cpuinfo },
        stdout: "pipe",
        stderr: "pipe",
      });
      expect(await p.exited).toBe(0);
      expect(asked).toEqual(["SHA256SUMS", "meme-linux-arm64"]);
      expect(readFileSync(path.join(home, ".local", "bin", "meme"), "utf8")).toContain("meme-linux-arm64");
    } finally {
      server.stop(true);
    }
  });
});
