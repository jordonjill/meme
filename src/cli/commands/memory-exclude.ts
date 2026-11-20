import path from "node:path";
import { ConfigError, configFile, readConfigFile, writeConfigFile } from "../../memory/config";
import { storeDir } from "../../memory/place";
import { normalizeRemote, projectRef } from "../../memory/projects";
import { currentPlatform, displayPath, type Platform } from "../../platform/paths";
import { isReadOnlyError } from "../../store/db";
import { CommandError } from "../args";
import { projectOf, write } from "../context";

/**
 * What an exclusion is kept as: for a folder, what its project is known by (the
 * address of its remote, so that the WSL and the Windows path of one repository are
 * one); for a folder in no repository, its path, which then covers what is under it;
 * anything else is taken as the address of a remote.
 */
export function exclusionFor(platform: Platform, raw: string): string {
  const s = raw.trim();
  const isPath = s === "." || s === ".." || /^[.~/\\]/.test(s) || /^[A-Za-z]:[\\/]/.test(s);
  if (!isPath) return normalizeRemote(s);
  const abs = s === "~" || s.startsWith("~/") ? path.join(platform.home, s.slice(1)) : path.resolve(s);
  return projectRef(projectOf(platform, abs)).identity;
}

export function exclude(o: { target?: string; remove: boolean }): number {
  const platform = currentPlatform();
  const home = platform.home;
  const store = storeDir(platform);
  const guard = <T>(fn: () => T): T => {
    try {
      return fn();
    } catch (err) {
      if (err instanceof ConfigError) throw new CommandError(err.message);
      if (isReadOnlyError(err)) throw new CommandError(`meme cannot write ${displayPath(configFile(store), home)} here; nothing was changed`);
      throw err;
    }
  };
  const file = guard(() => readConfigFile(store));
  const list = Array.isArray(file.exclude) ? file.exclude.filter((x): x is string => typeof x === "string") : [];
  const shown = (x: string) => (path.isAbsolute(x) ? displayPath(x, home) : x);

  if (!o.target) {
    write(list.length ? `Never sent to the model:\n${list.map((x) => `  ${shown(x)}`).join("\n")}\n` : "No project is excluded: the sessions of every project may be sent to the model you set up.\n");
    return 0;
  }
  const x = exclusionFor(platform, o.target);
  if (o.remove) {
    if (!list.includes(x)) throw new CommandError(`${shown(x)} is not excluded${list.length ? `; excluded are: ${list.map(shown).join(", ")}` : ""}`);
    file.exclude = list.filter((y) => y !== x);
    guard(() => writeConfigFile(store, file));
    write(`${shown(x)} is no longer excluded.\n`);
    return 0;
  }
  if (list.includes(x)) {
    write(`${shown(x)} is excluded already.\n`);
    return 0;
  }
  file.exclude = [...list, x];
  guard(() => writeConfigFile(store, file));
  write(`Excluded ${shown(x)}: its sessions are never sent to the model, and what you ask to remember there is kept in your own words.\n`);
  return 0;
}
