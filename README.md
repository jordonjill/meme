# meme

[中文](README.zh-CN.md)

Your coding-agent sessions in one place, ready to continue in any agent.

meme reads the sessions of **Claude Code** and **Codex**, mirrors them into one
local SQLite file, and lets you list, read and search them together. When you
want to go on with a session in another agent (or in a fresh session of the same
one), meme hands it over: the new agent runs `meme continue <id>` and gets a
handoff built word for word from the old session.

It works across **WSL and Windows**: meme in WSL also sees your Windows sessions,
and meme on Windows also sees the sessions in your running WSL distributions.

> Status: early (0.1.0). No prebuilt releases or install scripts yet; build it
> from source (below).

## What it does

- **One list.** `meme ls` lists the sessions of the current project from both
  agents and both sides, newest first, with a full-screen picker in a terminal.
- **Read and search.** `meme show` folds each turn into one line and expands the
  ones you pick; `meme search` works like `rg` over what you and the AI said.
- **Continue anywhere.** `meme continue` starts Claude Code or Codex in the
  session's project and lets it fetch the handoff: your messages, the last turns,
  the files that were edited and the last test or build run. No LLM summary is
  made; nothing is written to disk.
- **Forget.** `meme forget` deletes a session for good, from the agent and from
  meme, after showing exactly what will go.

## Install from source

You need [Bun](https://bun.sh) 1.4.2 or later.

```sh
git clone <this repository> meme && cd meme
bun install
bun scripts/build.ts linux-x64      # or: linux-arm64, darwin-x64, darwin-arm64, windows-x64
```

`bun scripts/build.ts` with no target builds all five and writes
`dist/SHA256SUMS`. Each build is a single file of about 60–90 MB with nothing
else to install. Put it on your PATH as `meme` (on Windows, `meme.exe`), for example:

```sh
mkdir -p ~/.local/bin && cp dist/meme-linux-x64 ~/.local/bin/meme
```

Then run:

```sh
meme install     # finds the agents and mirrors all sessions once
```

`meme install` changes nothing outside `~/.meme`: no skills, no `CLAUDE.md` or
`AGENTS.md`, no settings, no hooks. `meme install --dry-run` shows what it would
do.

The Linux x64 and Windows x64 builds are tested; the macOS and Linux arm64 builds
have not been run on real machines yet.

## Continue a session

**In a terminal**

```sh
meme continue          # pick a session, then the agent
meme continue 2        # or name it: a number from the list, an id, last, codex, win, a word from the title
meme continue last --in codex
```

meme starts the agent in the session's project. Its first message asks it to run
`meme continue <id>`; the agent reads the handoff, sums up where things stand and
waits for your go-ahead.

**Inside an agent**

```
! meme continue        see a numbered list
! meme continue 2      hand over number 2
```

- In **Claude Code**, after you choose, the agent runs the command itself.
- In **Codex**, the output of a `!` command is shown to you but not passed to
  the model, so say "continue" after it.

Options: `-a` lists all projects, `--fresh` hands over only your messages (start
over from the repository, not from the previous agent's approach), `--plain`
prints the handoff instead of starting an agent.

The handoff stays under 25,000 characters (about 15,000 tokens), and under
36,000 bytes inside Codex, so it fits in one command output; when a session is
longer, messages from the middle are left out and named, and `meme show` or
`meme search --session` finds them.

## Commands

| Command | What it does |
|---|---|
| `meme ls [-a]` | List sessions: the current project, or all projects with `-a` (and when the current one has none). |
| `meme show <id> [<turn>]` | Show a session, a turn per line; a turn number shows that turn in full. |
| `meme search <pattern>` | Search what was said, like `rg` (`-F`, `-i`, `-C`). `--all` also lists matches in tool calls and output. |
| `meme continue [<target>]` | Hand a session over to a new agent session. |
| `meme forget [<id>...]` | Delete sessions for good, from the agent and from meme. |
| `meme status` | Version, data location and session sources. |
| `meme install` / `uninstall` | Mirror everything once / remove meme's data. |

Session ids can be shortened to any unique start, usually 8 characters; meme
shows more when two sessions start the same way. `meme <command> --help` lists
every option.

### The full-screen list

`meme ls`, `meme continue` and `meme forget` open the same list in a terminal:

- `↑` `↓` select, `Enter` open (or choose), `Space` preview, `Esc` quit
- type to search titles, projects, branches and ids (`meme search` searches what
  was said)
- `←` `→` filter by platform (WSL, Win) or agent (Claude, Codex), `Tab` switch
  between those two rows; with all platforms shown, sessions are grouped by
  platform
- `Ctrl+A` this project / all projects

Outside a terminal, or inside an agent, every command prints plain text instead.

### Search

`meme search` looks in the current project by default. When the current project
has no sessions it searches all of them and says so; when other projects have
matches too, it says how many (`-a` lists them).

### Forget

`meme forget` lists every file it will delete and asks `[y/N]`; Enter alone
deletes nothing. It refuses the session that is running it and asks once more for
a session active in the last few minutes.

- **Claude Code**: the session file and its folders (subagents and large tool
  output, `file-history`, `session-env`).
- **Codex**: meme runs `codex delete --force <id>` with the codex of the side the
  session is on, and never edits Codex's files itself. Codex refuses to delete a
  session while a fork of it exists; name the fork too and meme deletes it first.
  Codex keeps what you typed in its own input history (`~/.codex/history.jsonl`).

Inside an agent, `--yes` is required, and only when you have asked for the
deletion.

## WSL and Windows

- **meme in WSL** reads your Windows sessions through `/mnt/c` and shows them as
  `Claude·Win` / `Codex·Win`. Continuing one starts the agent in WSL, in the
  `/mnt/c/...` path of the project.
- **meme on Windows** reads the sessions of the WSL distributions that are
  running, through `\\wsl.localhost`, and shows them as `Claude·WSL` /
  `Codex·WSL`. It never starts a stopped distribution: their sessions are listed
  as of the last sync, with a note at the top. Continuing a WSL session starts the
  agent inside WSL, so meme and the agent need to be installed there too.
- Each side keeps its own mirror; the two are independent.
- In Windows PowerShell 5.1, output piped to another command (`meme ls | ...`)
  is decoded in the console's code page and Chinese text comes out garbled. Run
  `[Console]::OutputEncoding = [Text.Encoding]::UTF8` first. Output shown
  directly in the window is fine.

## Your data

- Everything stays on your machine. meme makes no network requests.
- The mirror is `~/.meme/meme.sqlite` (on Windows `%USERPROFILE%\.meme`), with
  logs next to it; `MEME_HOME` moves it. Deleted records are overwritten
  (`secure_delete`).
- meme only reads the agents' files (`~/.claude`, or `CLAUDE_CONFIG_DIR`;
  `~/.codex`, or `CODEX_HOME`). The one exception is `meme forget`. It never
  writes Codex's databases.
- Secrets with a clear format are replaced with `[REDACTED:type]` before
  anything is stored: Anthropic and OpenAI API keys, GitHub tokens, AWS key ids,
  private keys, bearer tokens, and passwords in URLs or after `password=`.
- A session deleted in its agent disappears from the mirror the next time meme
  runs. `meme uninstall` removes `~/.meme`; your original sessions are not
  touched.

## Development

```sh
bun test                                   # unit and end-to-end tests
bun run typecheck
bun scripts/build.ts                       # all five targets into dist/
MEME_BIN=dist/meme-linux-x64 bun test test/e2e   # end-to-end tests against a build
```

Test fixtures are synthetic; no real session is ever committed. Test hooks:
`MEME_HOME` (data directory), `MEME_ENV` (force `win`, `wsl`, `mac` or `linux`),
`MEME_WINDOWS_USERS_DIR` (where WSL finds the Windows user folders),
`MEME_WSL_DIR`, `MEME_WSL_RUNNING` and `MEME_WSL_EXE` (WSL as seen from Windows).
