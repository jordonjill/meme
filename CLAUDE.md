# meme

meme reads coding-agent sessions (Claude Code, Codex), mirrors them into one local SQLite file, and lets any agent continue a session that started in another agent.

## Where the design lives

The design docs are in Chinese and live outside this repo, in `/home/jihd/work/private/docs/meme/`:

- Start with `README.md` there, then `design/plan.md`, the M1 development plan. The plan has the flows, the command spec, the technical architecture and the milestones.
- Decisions and their evidence are in `design/prd.md`, `design/arch.md`, `design/format.md` and `research/tech/{sessions,storage,list,relay,release}.md`.
- If the code and the docs disagree, ask. Record design changes back in those docs, in Chinese, with the date.

## Rules

- Everything in this repo is in English: code, comments, CLI output, the skill, the handoff text, the README (plus `README.zh-CN.md`) and commit messages. Quoted session text stays as it is.
- Stack: TypeScript on Bun, using `bun:sqlite`. Pin `@letta-ai/trajectory` to 0.4.3. Ship single files with `bun build --compile`.
- Never commit real session files. Test fixtures are synthetic, or downloaded at test time into a gitignored cache.
- Work one milestone at a time (plan §6), and keep each milestone usable on its own.

## Development

- On this machine Bun 1.4.2 is at `~/tools/bun/bin/bun` and is not on PATH by default.
- `bun test` runs the unit and end-to-end tests; `bun run typecheck`; `bun scripts/build.ts [linux-x64|windows-x64]` writes single files to `dist/`. `MEME_BIN=dist/meme-linux-x64 bun test test/e2e` runs the end-to-end tests against a built file.
- `MEME_REAL_SESSIONS=1 bun test test/unit/real-sessions.test.ts` reads this machine's own sessions in place and prints counts only. Run it before upgrading trajectory.
- Test hooks: `MEME_HOME` (data directory), `MEME_ENV` (force win|wsl|mac|linux), `MEME_WINDOWS_USERS_DIR` (WSL: where the Windows user folders are, normally `/mnt/c/Users`).

## Commits

- Conventional Commits in English: `<type>(<scope>): <subject>`. The subject is imperative ("add", not "added"), at most 72 characters, with no trailing period.
- Types: `feat`, `fix`, `test`, `docs`, `build`, `refactor`, `chore`. The scope is the module, e.g. `platform`, `adapters`, `store`, `redact`, `cli`; leave it out when a commit spans the repo.
- Split a step into commits by module (scaffolding, adapters, store, cli, tests, packaging), each with a short body saying what and why.
- Commit locally; push only when asked. Tag the end of each M1 step `m1-1` … `m1-4` (plan §7).
