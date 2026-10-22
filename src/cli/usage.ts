import { PROFILES } from "../adapters/profiles";

/** The two ways to continue a session (plan §2.2, §2.3), shown by install and continue --help; each agent's lines are in its profile. */
export const HOW_TO_CONTINUE = [
  "How to continue a session:",
  "  In a terminal:   meme continue          pick a session with the arrow keys, then the agent;",
  "                                          meme starts it, and it fetches the handoff itself",
  ...PROFILES.flatMap((p) => p.howToContinue.map((line, i) => (i === 0 ? `  ${`In ${p.name}:`.padEnd(15)}  ` : " ".repeat(19)) + line)),
].join("\n");

/**
 * How to install meme, as `meme install` says it for the other side of WSL and
 * Windows (plan §6 ⑫, item 8): the install scripts of the latest release (§6 ⑬).
 * The README and the scripts say the same (tested).
 */
export const INSTALL_HINT = {
  linux: "curl -fsSL https://github.com/jordonjill/meme/releases/latest/download/install.sh | sh",
  windows: "irm https://github.com/jordonjill/meme/releases/latest/download/install.ps1 | iex",
};
