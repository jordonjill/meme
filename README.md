# meme

[中文](README.zh-CN.md)

Your coding-agent sessions in one place, ready to continue in any agent.

meme reads the sessions of **Claude Code**, **Codex**, **OpenCode** (1.x) and
**Pi**, mirrors them into one local SQLite file, and lets you list, read and search them together. When you
want to go on with a session in another agent (or in a fresh session of the same
one), meme hands it over: the new agent runs `meme continue <id>` and gets a
handoff built word for word from the old session.

It also keeps a **memory** that the agents share: the rules and facts you tell
it, what an agent keeps for you, and what a model you choose reads out of your
sessions. Every entry points at the words it rests on.

It works across **WSL and Windows**: meme in WSL also sees your Windows sessions,
and meme on Windows also sees the sessions in your running WSL distributions;
the memory is one for both.

> Status: early. Memory is new and has been tried little with real agents and
> models so far.

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
- **Remember.** A memory your agents share: `meme remember` keeps a rule or a
  fact in your own words, an agent can keep one for you, and with a model set up
  meme reads your sessions for what is worth keeping. `meme context` gives an
  agent what holds where it works, with the work left unfinished there. See
  [Memory](#memory).

## Install

On Linux, WSL or macOS:

```sh
curl -fsSL https://github.com/jordonjill/meme/releases/latest/download/install.sh | sh
```

On Windows, in PowerShell:

```powershell
irm https://github.com/jordonjill/meme/releases/latest/download/install.ps1 | iex
```

(These work from meme's first release on.) The script picks the single file for
your system and CPU, checks it against the release's `SHA256SUMS`, puts it in
`~/.local/bin` (on Windows `%USERPROFILE%\.local\bin`), adds that folder to your
PATH if it is not there yet, and runs `meme install`, which finds the agents and
mirrors all sessions once. `MEME_VERSION=v0.1.0` installs that release;
`MEME_NO_MODIFY_PATH=1` leaves PATH alone. To use `! meme continue` in agents on
both sides of WSL and Windows, meme has to be on both: when `meme install` finds
agents on the other side and no meme, it offers to install the same version
there too, with that side's installer. It asks first, and only in a terminal;
elsewhere it shows the line to run there.

`meme install` changes nothing outside `~/.meme`: no skills, no `CLAUDE.md` or
`AGENTS.md`, no settings, no hooks. `meme install --dry-run` shows what it would
do.

### From source

You need [Bun](https://bun.sh) 1.4.2 or later.

```sh
git clone https://github.com/jordonjill/meme && cd meme
bun install
bun scripts/build.ts linux-x64      # or another target, below
```

The targets are `linux-x64`, `linux-arm64`, `darwin-x64`, `darwin-arm64` and
`windows-x64`, and `linux-x64-baseline`, `darwin-x64-baseline` and
`windows-x64-baseline` for x64 CPUs without AVX2. With no target it builds all
eight and writes `dist/SHA256SUMS`. Each is a single file of about 60–90 MB with
nothing else to install. `MEME_FROM=dist sh install.sh` (or `$env:MEME_FROM =
'dist'` before `install.ps1`) installs from `dist` as from a release.

Each build runs its tests on its own kind of machine in GitHub Actions before a
release: Linux x64 and arm64, macOS on Intel and on Apple silicon, Windows.

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

A command you ran in Pi with `!!`, which Pi keeps from its model, is not handed
over either: the handoff only says one was run there. `meme show` and
`meme search` still have it.

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

## Memory

meme keeps a memory that all your agents share: what you told one of them holds
in the others. It has three kinds of things:

- **Facts**: your rules for how agents should work with you, facts about you and
  your machines, and facts about a project.
- **Experience**: what was learned from how something turned out, and when it
  applies.
- **Unfinished work**: the sessions of a project that you stopped, or that ended
  in the middle of a step. Nothing is stored for these; meme works them out from
  the sessions each time.

Memory is new, and has been tried little with real agents and models so far.

### It forms by itself

With a model set up (below), you do not have to do anything: when an agent
starts, meme reads in the background the sessions that have gone quiet since,
at most every 6 hours, and keeps what will matter later. Now and then, read what
changed:

```sh
meme memory digest      # what came in, what replaced what, what waits to be seen again
```

`meme status` says when there is something new. Something wrong in it?
`meme memory forget <id>`. To stop the background runs, put `"auto": false` in
`~/.meme/config.json`.

### Tell it something

```sh
meme remember "Reply in Chinese; keep everything in the repository in English"
meme remember --project "Tests need the database running"
meme remember --about-me "I work in WSL and on Windows"
```

Without an option it is a rule for every agent; `--project` makes it a fact about
the project of the current directory, `--about-me` a fact about you. Saying the
same thing again adds no second entry. With a model set up (below), the model
words it, decides where it belongs (the options are then hints) and whether it
repeats or replaces something remembered; your words stay as the evidence. What
it judges meant for this time only ("skip the tests this time") is not kept;
`--as-is` keeps the words anyway. Without a model, your words go in as they are
and nothing is sent.

- `meme memory` lists what is remembered, file by file.
- `meme memory show <id>` shows the words an entry rests on and when they were
  said.
- `meme memory forget <id>` removes an entry for good, asking first: the entry,
  the evidence only it rested on, and its text in meme's own backups. What stays
  is a hash, so that the same words are not learned again from your sessions;
  saying them again yourself brings the entry back.

Memory is plain Markdown you can read: the entries in `~/.meme/memory`
(`RULES.md`, `USER.md` and `EXPERIENCE.md`, and a `MEMORY.md` and an
`EXPERIENCE.md` for each project), and the evidence, one file per day, in
`~/.meme/evidence`. Secrets are masked before anything is written, as in the
mirror.

### Give it to your agents

`meme context` prints what memory holds for the current directory: your rules,
facts about you and about the project, the work left unfinished there and, given
the task in a few words (`meme context "add rate limiting"`), the entries that
have to do with it. It says it is reference, not instructions. Inside an agent,
`! meme context` puts it into the conversation. For an agent to get it by itself:

- **MCP.** `meme mcp` serves memory over the Model Context Protocol. Connect it
  once, with the agent's own command (`meme mcp --help` lists them):

  ```sh
  claude mcp add -s user meme -- meme mcp
  codex mcp add meme -- meme mcp
  ```

  The agent then has four tools: `context`, `recall` (look something up),
  `explain` (where an entry comes from) and `remember`.
- **A plugin, for Claude Code.** `meme plugin` writes a plugin into
  `~/.meme/plugins/claude-code` and shows the two commands that install it. With
  it Claude Code is given `meme context` at the start of every session, and has
  the tools above.

meme itself changes none of the agents' files: you run those commands.

When an agent keeps something for you with `remember`, it only passes on your
own words; it is not the one who writes the memory. meme looks for the words in
your sessions, and refuses when they are not there. Found, the agent is answered
at once, and meme writes the entry itself in the background: with its model,
from your message and the ones around it, by the same rules as below; without a
model, in your words as they are. The entry points at
the message you said it in. An agent cannot change what you said yourself, or
bring back what you forgot.

The same holds for `meme remember` run inside an agent, since meme cannot tell
the agent running it from you typing `! meme remember`: the words are kept once
they are found among what you said. Your own `!` command shows in the session
only after it has run, so it is kept a moment later, in the background; words
that do not show within two minutes are not kept, and `meme memory digest --all`
says so.

### Let a model read your sessions

Set up a model once. It can be any service that speaks the OpenAI chat format;
one on your own machine keeps everything there:

```sh
meme model set          # asks for the address, the model's name and the key, tries it, saves it
meme model              # which model is set up (of the key, only its last 4 characters)
meme memory exclude .   # never send the sessions of this project
```

The key is typed at a prompt that does not show it, never on the command line;
`meme model set --key-env <VAR>` takes it from an environment variable instead.
From then on meme reads the sessions that have gone quiet by itself (above). To
see what it would send, or to run it now:

```sh
meme memory update --dry-run    # what would be read and sent; sends nothing
meme memory update
```

- **This sends the text of those sessions to that model**, with secrets masked,
  and to nowhere else: what you and the AI said (long messages shortened), one
  short line for each command or tool the AI used, and a tool's output only when
  it failed. The AI's reasoning and its own task lists are not sent. With no
  model set up nothing is sent; a model on your own machine keeps everything
  there. The sessions of an excluded project are never sent, and what you ask to
  remember there is kept in your own words.
- The model decides what to keep and how to word it. meme keeps an entry only
  when the words the model quotes for it are really in the session. What you
  said, or a failing tool printed, is in force at once; what only the AI said, or what
  was read out of what happened, waits until it is seen in a second session.
- A session is read once it has been quiet for 2 hours, and only its new part
  when it goes on later. A session that ended over 14 days ago and was never read
  is left alone unless you add `--all`; `--session <id>` reads one session. A
  run that starts by itself reads at most 20 sessions; the rest wait for the next.
- The model and the exclusions are kept in `~/.meme/config.json`. What meme asks
  the model is in [`src/prompts`](src/prompts/README.md).
  `MEME_MODEL_URL`, `MEME_MODEL_NAME` and `MEME_MODEL_KEY` set the model from the
  environment instead, and win over the file.

## Commands

| Command | What it does |
|---|---|
| `meme ls [-a]` | List sessions: the current project, or all projects with `-a` (and when the current one has none). |
| `meme show <id> [<turn>]` | Show a session, a turn per line; a turn number expands that turn (`--full`: nothing cut). `--hidden` also shows injected messages and reasoning. |
| `meme search <pattern>` | Search what was said, like `rg` (`-F`, `-i`, `-C`; `-a` all projects). `--tools` also lists matches in tool calls and output. |
| `meme continue [<target>]` | Hand a session over to a new agent session. |
| `meme forget [<id>...]` | Delete sessions for good, from the agent and from meme (`-a`: pick from all projects). |
| `meme remember "<words>"` | Keep a rule or a fact in memory, in your own words (`--project`, `--about-me`). |
| `meme memory` | List what is remembered. `show <id>` traces an entry to the words it rests on, `forget <id>` removes it for good, `update` reads quiet sessions with a model (`--dry-run` sends nothing), `exclude` lists or changes the projects never sent to it, `digest` tells what changed since you last looked. |
| `meme context [<task>]` | What memory holds for the current directory, for an agent to read before it starts. |
| `meme recall <words>` | Find what meme remembers about something (`--all`: in other projects too). |
| `meme mcp` | Serve memory to an agent over MCP; `--help` shows how to connect each agent. |
| `meme plugin [<agent>]` | Write meme's plugin for an agent (Claude Code) and show how to install it. |
| `meme model` | The model meme asks: show it, `set` it up (the key is not shown as you type it), `test` it, `remove` it. |
| `meme status` | Version, data location, where memory is, session sources, and what meme can't read after an agent update (sessions, and record types it doesn't know, with the agent's version). |
| `meme install` / `uninstall` | Mirror everything once / remove meme's data. |
| `meme report` | A report to paste into an issue when something goes wrong: versions, `status`, recent errors; no conversation content, and your home folder, user names and project paths masked. `--session <id>` adds that session's structure. Read it before you paste it. |

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
refuses a session written in the last 5 minutes, or in the last hour when it
stopped on a command that may still be running, and says when it can go
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
- Claude Desktop runs Claude Code in WSL and keeps a copy of each such session
  in Windows' `.claude\projects\ssh-<id>`. meme reads the original in WSL and
  skips these copies; `meme forget` deletes the copy with the session. Any other session found in two places (a home folder copied
  to the other side) is listed once, from the copy written last; `meme status`
  says how many there are, and `meme forget` deletes every copy.
- **Memory is one, on the Windows side.** meme in WSL keeps its memory in the
  Windows user's folder (`C:\Users\<you>\.meme`), so the agents on both sides
  share it; `~/.meme/store` in WSL is a link to that folder, and `meme status`
  says where memory is. The mirror of the sessions stays on each side. With
  `MEME_HOME` set, memory is kept in that folder instead.
- In Windows PowerShell 5.1, output piped to another command (`meme ls | ...`)
  is decoded in the console's code page and Chinese text comes out garbled. Run
  `[Console]::OutputEncoding = [Text.Encoding]::UTF8` first. Output shown
  directly in the window is fine.

## Your data

- Everything stays on your machine and meme makes no network requests, with two
  exceptions that you start yourself. `meme memory update` sends the text of the
  sessions it reads to the model you set up, and only there (see
  [Memory](#memory)). And saying yes when `meme install` offers to install on the
  other side of WSL and Windows runs that side's installer, which downloads meme.
- The mirror is `~/.meme/raw/sessions.sqlite` (on Windows under
  `%USERPROFILE%\.meme`), with logs in `~/.meme/logs`; `MEME_HOME` moves the
  folder. Deleted records are overwritten (`secure_delete`).
- Memory is in `~/.meme/memory` and `~/.meme/evidence`, and what meme needs to
  keep it in `~/.meme/state`; in WSL these are in the Windows user's `.meme`
  (above). The model's key in `~/.meme/config.json` is plain text, readable by
  you only, unless you set it up with `meme model set --key-env <VAR>`. `meme uninstall` leaves memory where it is;
  delete those folders yourself to remove it.
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
`MEME_SLOW_MS` (log runs slower than this; 0 logs every run),
`MEME_DELETE_TIMEOUT_MS` (how long an agent's own delete command may take),
`MEME_WSL_TIMEOUT_MS` (how long Windows waits for `wsl.exe`), `MEME_STORE`
(where memory is kept), `MEME_MODEL_URL`, `MEME_MODEL_NAME` and
`MEME_MODEL_KEY` (the model, instead of `config.json`) and `MEME_NO_AUTO_UPDATE`
(1: the pipeline never starts by itself).

## License

MIT, see [LICENSE](LICENSE).
