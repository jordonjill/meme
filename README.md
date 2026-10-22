# meme

[中文](README.zh-CN.md)

Your coding-agent sessions in one place, ready to continue in any agent.

meme reads the sessions of **Claude Code**, **Codex**, **OpenCode** (1.x) and
**Pi**, mirrors them into one local SQLite file, and lets you list, read and search them together. When you
want to go on with a session in another agent (or in a fresh session of the same
one), meme hands it over: the new agent runs `meme continue <id>` and gets a
handoff built word for word from the old session.

It works across **WSL and Windows**: meme in WSL also sees your Windows sessions,
and meme on Windows also sees the sessions in your running WSL distributions.

> Status: early (0.1.0). No prebuilt releases or install scripts yet; build it
> from source (below).

## What it does

- **One list.** `meme ls` lists the sessions of the current project from every
  agent and both sides, newest first, with a full-screen picker in a terminal.
- **Read and search.** `meme show` folds each turn into one line and expands the
  ones you pick; `meme search` works like `rg` over what you and the AI said.
- **Continue anywhere.** `meme continue` starts Claude Code, Codex, OpenCode or Pi in the
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
- In **OpenCode** and **Pi**, as in Claude Code. (In OpenCode, `!` switches the
  input to shell mode; the rest of the line is the command.)

**I want to…**

| I want to | Do this |
|---|---|
| switch agents in the same project | open the new agent in the project, `! meme continue` |
| find a session that is not listed | `meme ls -a`, or Ctrl+A in the list |
| continue a session of another project | `meme continue -a` in a terminal and pick it; meme opens the agent in the directory that session started in |
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
output is saved to a file there), 36,000 bytes in Codex, 46,080 bytes and 1,800
lines in OpenCode and Pi (both keep only the end of a longer output), and the
tightest of them when meme cannot tell which agent will read it (a pipe, or `--plain` outside an
agent; inside one, `--plain` keeps to that agent's limit). When a session is
longer, these go, in this order: the one-line notes (oldest first), the agent's
compaction summary (cut to 1,000 tokens, then dropped), the middle of the step
lists in the last turns, the AI's words in the last turns, the files edited
earliest, the last test or build's output, the recent commands, the last turns'
repeated user messages (pointed to instead), the last turns' remaining steps, and
last of all messages from the middle. If that is still too long, the handoff is
cut at a line and says so. The handoff says what it left out, and `meme show` or
`meme search --session` finds it.

## Commands

| Command | What it does |
|---|---|
| `meme ls [-a]` | List sessions: the current project, or all projects with `-a` (and when the current one has none). |
| `meme show <id> [<turn>]` | Show a session, a turn per line; a turn number expands that turn (`--full`: nothing cut). `--hidden` also shows injected messages and reasoning. |
| `meme search <pattern>` | Search what was said, like `rg` (`-F`, `-i`, `-C`; `-a` all projects). `--tools` also lists matches in tool calls and output. |
| `meme continue [<target>]` | Hand a session over to a new agent session. |
| `meme forget [<id>...]` | Delete sessions for good, from the agent and from meme (`-a`: pick from all projects). |
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
- `←` `→` filter by platform (WSL, Win) or agent (Claude, Codex, OpenCode, Pi), `Tab` switch
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
Claude Code or Codex (meme checks the process that has it open). OpenCode and Pi
do not say which session they have open: meme refuses the sessions of a folder
one of them is running in, and deletes at once when none runs there. Where meme
cannot tell (an older agent, a Codex lock on Windows, a process on the other side
of WSL and Windows, OpenCode or Pi running in a folder meme cannot see), it
refuses a session written in the last 5 minutes and says when it can go
("you can delete it after 17:21").

- **Claude Code**: the session file and its folders (subagents and large tool
  output, `file-history`, `session-env`, and the session's background job under
  `jobs/`). Claude Code keeps what you typed in its own input history
  (`~/.claude/history.jsonl`).
- **Codex**: meme runs `codex delete --force <id>` with the codex of the side the
  session is on, and never edits Codex's files itself. Codex refuses to delete a
  session while a fork of it exists; name the fork too and meme deletes it first.
  Codex keeps what you typed in its own input history (`~/.codex/history.jsonl`).
- **OpenCode**: meme runs `opencode session delete <id>` with the opencode of the
  side the session is on, and deletes the full output of long commands OpenCode
  saved for it (`tool-output/`). OpenCode keeps what you typed in its own prompt
  history (`~/.local/state/opencode/prompt-history.jsonl`).
- **Pi**: Pi has no delete command (its `/resume` list deletes the file too), so
  meme deletes the session file, and the full output of long commands Pi saved for
  it in the temporary folder.

Inside an agent, `--yes` is required, and only when you have asked for the
deletion.

## WSL and Windows

- **meme in WSL** sees your Windows sessions, as `Claude·Win`, `Codex·Win` and so on.
  Continuing one opens the agent in WSL, at the session's directory under
  `/mnt/c/…` (or wherever `/etc/wsl.conf` mounts the Windows drives).
- **meme on Windows** sees the sessions of the WSL distributions that are
  running, as `Claude·WSL`, `Codex·WSL` and so on. Listing, showing, searching and pulling a
  handoff never start a stopped distribution: its sessions are listed as they were
  last seen, with a note at the top. Continuing one in a terminal, or deleting one,
  does start it.
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
  `~/.codex`, or `CODEX_HOME`; `~/.local/share/opencode/opencode.db`, or
  `OPENCODE_DB`; `~/.pi/agent/sessions`, or `PI_CODING_AGENT_DIR`). The one
  exception is `meme forget`. It never writes the agents' databases (Codex's,
  OpenCode's); OpenCode's is opened read-only. Across WSL and Windows it is read
  from a copy kept in `~/.meme/cache`, which `meme uninstall` removes and
  `meme forget` removes with the session it deleted.
- OpenCode 2.0 (`@opencode/cli`) is not supported yet: it keeps sessions in a new
  format in the same database, and `meme status` reports them as not read.
- Secrets with a clear format are replaced with `[REDACTED:type]` before
  anything is stored: Anthropic and OpenAI API keys, GitHub, GitLab, Slack, npm,
  Stripe and Hugging Face tokens, Google API keys, AWS key ids and secret keys,
  private keys, JWTs, bearer tokens and Basic credentials, and passwords in URLs
  or after `password=`. Values with no telling format (a hex string after
  `API_KEY=`) are not: they look like hashes.
- A session deleted in its agent disappears from the mirror the next time meme
  runs. `meme uninstall` removes meme's files from `~/.meme`, then the folder
  if nothing else is in it; your original sessions are not touched.

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
`MEME_WSL_CONF` (another `/etc/wsl.conf`), `MEME_WSL_DIR`, `MEME_WSL_RUNNING` and
`MEME_WSL_EXE` (WSL as seen from Windows), `MEME_TERMINAL` (act as in a terminal),
`MEME_SLOW_MS` (log runs slower than this; 0 logs every run) and
`MEME_DELETE_TIMEOUT_MS` (how long an agent's own delete command may take).
