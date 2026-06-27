---
description: Start a new GoodVibes project. Picks the right setup (full-stack or browser-only) and scaffolds it into the current empty folder.
---

You are starting a new GoodVibes project in the user's current folder.

## Step 1 - Check the folder is empty (greenfield)
Run the guard:

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/scaffold.mjs" check --cwd "$(pwd)"
```

If it exits non-zero, STOP and tell the user, in plain language: "This folder already
has a project in it. /goodvibes is for starting fresh. Open an empty folder and run
it again." Do not continue.

## Step 2 - Ask the one setup question
Ask the user, in plain language:

"One setup question. Think about what your app needs to keep track of. Will different
people have their own accounts and their own data, or does anything need to be saved
on a server and persist or be shared between people? Or does it run entirely in the
visitor's browser, like a page, tool, dashboard, or presentation? A single shared
password you hand to one viewer to keep it private still counts as browser-only."

Classify their answer deterministically:
- Individual accounts, or data saved/persisted/shared on a server -> "full-stack".
- Runs entirely in the browser, nothing saved server-side -> "client-only".
- A single shared/hardcoded password, no accounts, no server-saved data ->
  "client-only", always.
If unclear, give one example each way, then classify.

Confirm before scaffolding: "Sounds like a [full-stack / browser-only] project. Want
me to set that up?" Only proceed on yes.

## Step 3 - Scaffold the chosen variant
Run (substitute the chosen variant):

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/scaffold.mjs" create --variant <full-stack|client-only> --plugin-root "${CLAUDE_PLUGIN_ROOT}" --cwd "$(pwd)"
```

## Step 4 - Hand off to building
Summarize what was set up in plain language. For client-only: "You are set up as a
browser-only project and it runs now. Tell me what you want to build first, like you
would explain it to a friend." For full-stack: also say plainly that the app will not
start until its database and background-jobs service are connected, and that this is a
guided step. Then follow CLAUDE.md for everything after.
