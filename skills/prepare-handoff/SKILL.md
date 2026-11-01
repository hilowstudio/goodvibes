---
description: Use when the person is ready to hand the project to a developer, or wants the app online (e.g. "I'm ready to hand this off", "prepare this for my developer", "get this ready for handoff", "put it online", "deploy this", "make it live", "publish my app"). Runs a readiness gate and writes a HANDOFF.md summary.
---

The person is ready to hand the project to a developer. Do two things: run the
readiness checks, and write a clear `HANDOFF.md` so the developer knows exactly what
they are receiving.

If they came here asking to put the app online, say first, in plain language, that the
developer does that step, and that this gets everything ready for them.

First, read the `.goodvibes` file at the project root for the variant and version.

The GitHub organization this plugin was set up for is: `${user_config.github_org}`. If
that shows nothing, or still shows a placeholder in curly braces, no organization was set.

## 1. Run the readiness gate
Run the checks from the check-the-work skill (secrets out of code, the app builds,
DECISIONS.md current, nothing half-built, and for full-stack: the isolation test
exists, the app logs in as the safe database role, there is one way into the database,
and server secrets stay server-side). Also check:
- The code is committed to git (no large amount of uncommitted work).
- The project is saved to GitHub: an `origin` remote exists and there are no unpushed
  commits. If it is not pushed yet, tell the person plainly and offer to run the
  save-to-github skill before handing off.
- If an organization is set above, the `origin` remote is under it. If the code is in a
  personal account, tell them plainly: the developer needs it moved to the organization
  before it can go live.
- The README's run and going-live steps are present and accurate.
- For full-stack: note whether the live services (Supabase, Inngest) are connected
  yet, since the developer needs to know if that is still pending.

Report each result in plain language. If something important is not ready, tell the
person plainly and offer to fix it before handing off.

## 2. Write HANDOFF.md
Create or update `HANDOFF.md` at the project root, in plain language, voice floor (no
em dashes), covering:
- **What this app does**, in two or three sentences (ask the person if you are not
  sure; use their words).
- **The stack and variant** (from `.goodvibes` and the project): full-stack or
  browser-only, and the main technologies.
- **What is built** so far: the main features and what works.
- **What is not done / still needed**: any half-built parts, services not yet
  connected, or known gaps. Be honest here; this is the most useful section for the
  developer.
- **How to run it locally**: after confirming the README's run steps are in place (the
  readiness gate above checks this), point to them and the environment variables.
- **Going live**: point to the README's going-live steps. They cover which variables go
  in Vercel and setting `"live": true` in `.goodvibes` once the repository is connected.
- **Where the rules and reasoning live**: `CLAUDE.md` for the build conventions, the
  `docs/` folder for the reasoning (the principled-coding, design, and voice guides),
  and `DECISIONS.md` for the consequential choices.
- **The safety note** (full-stack): the project enforces per-user data isolation with
  a keystone test (`tests/isolation.test.ts`) that proves one user cannot read
  another's data.

## 3. Tell the person what to send
End by telling the person, in plain language, what to give their developer: the GitHub
repository (if it is not pushed yet, run the save-to-github skill first), and a note
that `HANDOFF.md` explains the rest. Confirm no secrets are in the repository before
they share it. If they wanted the app online, tell them this is the step that gets it
there: once their developer connects it, it goes live.
