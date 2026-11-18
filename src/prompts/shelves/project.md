Keep: facts about this project that its files do not plainly say: decisions and their reasons, how it is built, run, deployed and tested when that is not obvious, what it depends on outside the repository, known traps.
Leave out: what reading the files shows (what a Dockerfile or a configuration file says, which libraries are used, how the folders are laid out); the state of the task at hand; the project's name.
Write it as a fact, with its reason when the session gives one.
Good: "Pushing to main deploys to production through the CI workflow; there is no staging."
Not this: "The project uses React and TypeScript." (package.json says so)
