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
  directory the session started in and lets it fetch the handoff: your messages,
  each with a line on what the AI did, the last turns step by step, the files that
  were edited, the recent commands and the last test or build run. A session that was itself
  handed over brings the messages of the sessions before it, and one the agent
  compacted brings the agent's own summary. meme makes no LLM summary and writes
  nothing to disk.
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

Three things to know:

1. **One machine.** Windows and WSL count as one machine: each sees the other's
   sessions. Sessions on another computer or an SSH server are not supported yet;
   continue them on the machine they are on.
2. **Install meme where you use the agent.** `! meme continue` inside an agent
   runs the meme of the system the agent runs in. Only Windows: install it on
   Windows. Only WSL: install it in WSL (it sees the Windows sessions too). Both:
   install it on both; delete a session on one side and the other follows the
   next time it runs.
3. **Continue in the session's project.** Open a new agent in the project and run
   `! meme continue`; or run `meme continue` in a terminal, pick the session, and
   meme opens the agent in the session's directory. Continuing it from another
   project works too: the handoff starts with a note, and the agent asks you where
   to work first.

**In a terminal**

```sh
meme continue          # pick a session, then the agent
meme continue 2        # or name it: a number from the list, an id, last, codex, win, a word from the title
meme continue last --in codex
```

meme opens the agent in the directory the session ran in. Its first message asks
it to run `meme continue <id>`; the agent reads the handoff, sums up where things
stand and waits for your go-ahead.

**Inside an agent**

```
! meme continue        see a numbered list
! meme continue 2      hand over number 2
```

- In **Claude Code**, after you choose, the agent runs the command itself.
- In **Codex**, the output of a `!` command is shown to you but not passed to
  the model, so say "continue" after it.

**I want to…**

| I want to | Do this |
|---|---|
| switch agents in the same project | open the new agent in the project, `! meme continue` |
| find a session that is not listed | `meme ls -a`, or Ctrl+A in the list |
| continue a session of another project | `meme continue -a` in a terminal and pick it; meme opens the agent in that project |
| continue a Windows project in WSL | `meme continue` in a WSL terminal and pick it; the agent opens under `/mnt/c/…` |
| continue a WSL project on Windows | better in WSL; in PowerShell, `meme continue` and pick it, and meme opens the agent inside WSL (meme must be installed there) |
| continue a session of another computer or a server | not supported yet; continue it on that machine |

**When you see…**

| You see | Do this |
|---|---|
| the agent says you are not in the session's repository | tell it where to work; or run `meme continue` in a terminal and pick the session, and meme opens the agent in the right directory |
| "the repository is inside WSL…" | continue in WSL |
| "meme is not installed in WSL…" | install meme in WSL too |
| "WSL (Ubuntu) is not running…" | the list shows WSL's sessions as they were last seen; start WSL and they update |
| "run git with `-c core.autocrlf=true …`" | do as it says |

Options: `-a` lists all projects, `--fresh` hands over only your messages (start
over from the repository, not from the previous agent's approach), `--plain`
prints the handoff instead of starting an agent.

The handoff stays under 15,000 tokens and under what the agent keeps of a
command's output, so it arrives whole: 27,000 bytes in Claude Code (a longer
output is saved to a file there), 36,000 bytes in Codex, and the tighter of the
two when meme cannot tell which agent will read it (a pipe, `--plain`). When a session is longer, the one-line notes go first (oldest first), then the agent's compaction
summary, then the AI's words in the last turns, and last of all messages from
the middle. The handoff says what it left out, and `meme show` or
`meme search --session` finds it.

## Commands

| Command | What it does |
|---|---|
| `meme ls [-a]` | List sessions: the current project, or all projects with `-a` (and when the current one has none). |
| `meme show <id> [<turn>]` | Show a session, a turn per line; a turn number shows that turn in full. |
| `meme search <pattern>` | Search what was said, like `rg` (`-F`, `-i`, `-C`). `--all` also lists matches in tool calls and output. |
| `meme continue [<target>]` | Hand a session over to a new agent session. |
| `meme forget [<id>...]` | Delete sessions for good, from the agent and from meme. |
| `meme status` | Version, data location, session sources, and what meme can't read after an agent update (sessions, and record types it doesn't know, with the agent's version). Attach it when you report a problem. |
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
deletes nothing. It refuses the session that is running it and a session open in
Claude Code or Codex (meme checks the process that has it open). Where it cannot
tell (an older agent, Codex on Windows), it refuses a session active in the last
few minutes.

- **Claude Code**: the session file and its folders (subagents and large tool
  output, `file-history`, `session-env`).
- **Codex**: meme runs `codex delete --force <id>` with the codex of the side the
  session is on, and never edits Codex's files itself. Codex refuses to delete a
  session while a fork of it exists; name the fork too and meme deletes it first.
  Codex keeps what you typed in its own input history (`~/.codex/history.jsonl`).

Inside an agent, `--yes` is required, and only when you have asked for the
deletion.

## WSL and Windows

- **meme in WSL** sees your Windows sessions, as `Claude·Win` / `Codex·Win`.
  Continuing one opens the agent in WSL, at the session's directory under
  `/mnt/c/…` (or wherever `/etc/wsl.conf` mounts the Windows drives).
- **meme on Windows** sees the sessions of the WSL distributions that are
  running, as `Claude·WSL` / `Codex·WSL`. It never starts a stopped distribution:
  its sessions are listed as they were last seen, with a note at the top.
  Continuing a WSL session opens the agent inside WSL, so meme and the agent need
  to be installed there too.
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
