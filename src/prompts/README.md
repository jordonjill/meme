# What meme says to a model

Everything meme writes for a model to read is here, so that it can be read and tuned in
one place (plan-m2 F10). This folder imports nothing else of meme's.

| File | Who reads it | When | Put together in |
|---|---|---|---|
| `read-session.md` | meme's model (`meme model`) | the pipeline reads part of a session: `meme memory update`, also in the background | `src/memory/pipeline.ts`, `proposeAndKeep()` |
| `remember.md` | meme's model | `meme remember`, and an agent's `remember`, with a model set up | `src/memory/remember.ts`, `rememberWords()` |
| `writing.md` | meme's model | the end of both of the above: how a memory is written, and the JSON to answer with | filled into both by `index.ts`; when an answer cannot be read, `ANSWER_AGAIN` there asks once more; when what is read is in no project, `NO_PROJECT` there goes with the question |
| `shelves/rules.md`, `shelves/user.md`, `shelves/general.md`, `shelves/experience.md`, `shelves/project.md` | meme's model | in `writing.md`, so with both prompts: what each kind of memory holds, what it leaves out, how it is written, a good and a bad example | `index.ts` (`KINDS`), which says which "kind" and "about" each one is, as `shelfFor()` in `src/memory/pipeline.ts` places it |
| `shelves.ts` | the person opening a memory file; meme's model; agents | the first lines of each memory file; `{{about}}` in `writing.md`; the `about` of the `remember` tool | `src/memory/entries.ts`, `index.ts`, `agents.ts` |
| `agents.ts` | the agent connected to `meme mcp` | when it connects (`MCP_INSTRUCTIONS`), and all along (each tool's description); the first line of what `meme context` gives (`CONTEXT_NOTICE`) | `src/cli/commands/mcp.ts`, `src/mcp/tools.ts`, `src/memory/context.ts` |

How the Markdown files are filled: `{{name}}` stands for a value given in `index.ts`. A
name without a value, or a value without its name, stops meme when it starts, and the
tests start it. `PROMPTS_VERSION` is a short hash of the two prompts meme's model is
given; each change to memory a model worded, and each session read, notes it
(`state/changes.jsonl`, `state/processed.jsonl`), so that what a version wrote can be
found again.

Not here, on purpose:

- **The question around a prompt**: the project, what memory already holds, the
  records with their numbers. It is put together in code (`proposeAndKeep()`,
  `rememberWords()`), from the session; only its few fixed words are there.
- **The handoff** an agent reads when it continues a session (`src/handoff/build.ts`):
  a document with its own format (handoff.md, format.md), made of many parts.
- **The first message** meme gives an agent it starts (`firstMessage` in each
  `src/adapters/*.profile.ts`): it belongs to how that agent is started.
- **Answers and errors** a tool returns to an agent: they are meme's output, like the
  command line's, and stay with the code that gives them.
