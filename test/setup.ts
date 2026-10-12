import { afterAll, afterEach } from "bun:test";
import { removeTempDirs } from "./helpers";

// Dates in output are local time; pin the zone so expectations are stable.
process.env.TZ = "UTC";

// Here, not in helpers.ts: a hook registered when a module is first imported only
// covered the first test file, and the temporary directories of all the others stayed.
afterEach(removeTempDirs);
afterAll(removeTempDirs);
