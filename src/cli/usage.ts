/** The two ways to continue a session (plan §2.2, §2.3), shown by install and continue --help. */
export const HOW_TO_CONTINUE = `How to continue a session:
  In a terminal:   meme continue          pick a session with the arrow keys, then the agent;
                                          meme starts it, and it fetches the handoff itself
  In Claude Code:  ! meme continue        see the numbered list
                   ! meme continue <n>    hand over number n (or: last, codex, win, an id,
                                          a word from the title); it sums up where things
                                          stand and waits for your go-ahead`;
