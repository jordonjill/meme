import { existsSync, mkdirSync, readdirSync, readFileSync, rmdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import skillText from "../../skills/meme/SKILL.md" with { type: "text" };
import { removeFile } from "../platform/fs";

/** The skill meme installs, bundled into the single file. */
export const SKILL = skillText;

/** The line that marks a skill as meme's own (plan §3.7); install and uninstall only touch these. */
const MARKER = /<!--\s*meme-skill v\d+\s*-->/;

export type SkillState = "missing" | "current" | "outdated" | "foreign";

export function skillFile(skillDir: string): string {
  return path.join(skillDir, "meme", "SKILL.md");
}

/** What is at `<skillDir>/meme/` now. Anything without meme's marker is someone else's. */
export function skillState(skillDir: string): SkillState {
  const dir = path.join(skillDir, "meme");
  const file = skillFile(skillDir);
  if (!existsSync(file)) {
    if (!existsSync(dir)) return "missing";
    try {
      return readdirSync(dir).length === 0 ? "missing" : "foreign";
    } catch {
      return "foreign";
    }
  }
  const text = readFileSync(file, "utf8");
  if (!MARKER.test(text)) return "foreign";
  return text === SKILL ? "current" : "outdated";
}

export function placeSkill(skillDir: string): void {
  mkdirSync(path.join(skillDir, "meme"), { recursive: true });
  writeFileSync(skillFile(skillDir), SKILL);
}

/** Remove meme's skill file, and its folder when nothing else is in it. */
export function removeSkill(skillDir: string): void {
  removeFile(skillFile(skillDir));
  const dir = path.join(skillDir, "meme");
  try {
    if (readdirSync(dir).length === 0) rmdirSync(dir);
  } catch {}
}
