# save-to-github skill — design spec

**Date:** 2026-06-27
**Status:** approved (brainstorm), pending plan

## Goal

Give a non-technical GoodVibes user a guided, safe way to commit and push their project to GitHub, including authenticating if they are not already signed in. Available to both variants. Fills the gap where `prepare-handoff` assumes a pushed repo but never walks the person through pushing.

## Form (decided)

A new intent-triggered plugin skill, `skills/save-to-github/SKILL.md`, usable any time while building (not only at handoff). It is a plugin skill, so it reaches both variants automatically. `prepare-handoff` is wired to reference it. Modeled on the existing build-time skills (`set-up-services`, `connect-a-service`): plain language, voice floor (sentence case, no em dashes, no hype), one clear step at a time, variant-aware via the `.goodvibes` marker.

## Authentication approach (decided)

GitHub CLI (`gh`), with an install-if-missing fallback:
- Detect with `gh auth status`.
- If not authenticated, run `gh auth login` and guide the browser / device-code flow in plain language (nothing to copy-paste manually beyond a device code if gh chooses that flow).
- If `gh` is not installed, walk the person through the one-time install for their OS first, then authenticate.
- Repo creation uses `gh repo create`.

## The skill flow

The skill reads `.goodvibes` for the variant, then proceeds one step at a time:

1. **Safety gate (before anything is committed).** Confirm `.gitignore` exists and ignores `.env`, `node_modules`, and build output (`.next/`, `dist/`). Confirm no `.env` or other secret is staged or already tracked. Reuse the secrets logic from `check-the-work`. Variant-specific rules:
   - **full-stack:** `DATABASE_URL`, `DIRECT_URL`, `RUNTIME_DATABASE_URL`, `INNGEST_EVENT_KEY`, `INNGEST_SIGNING_KEY`, and any Supabase service-role key must never be committed. `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` are public by design but live in `.env` (ignored) anyway. `.env.example` (placeholders) is fine to commit.
   - **client-only:** `VITE_GATE_PASSWORD` must never be committed (it is privacy, not security, but still does not belong in the repo). `.env.example` is fine.
   - If anything sensitive would be pushed, STOP, explain in plain language, and fix `.gitignore` / unstage before continuing.
2. **Make it a repo if needed.** Scaffolded projects are not git repos yet. If there is no `.git`, run `git init` and set the default branch to `main`.
3. **Commit.** Stage everything (respecting `.gitignore`) and commit with a clear message. If there is nothing new to commit, say so and continue (still offer to push existing commits).
4. **Authenticate.** Run `gh auth status`. If not authenticated: if `gh` is installed, run `gh auth login` and guide the flow; if `gh` is not installed, guide the one-time install for the person's OS, then `gh auth login`.
5. **Create or reuse the repo.** If the project has no `origin` remote, ask the person in plain language whether the code should be **private** (default, recommended: only they and people they invite can see it) or **public** (anyone can see it), with a one-line trade-off. Use the project folder name as the repo name and confirm it. Then `gh repo create <name> --private|--public --source . --remote origin --push`. If a remote already exists, push to it instead.
6. **Push and confirm.** Ensure `main` is pushed; confirm it landed and give the person the repository URL.
7. **Wrap up.** In plain language: where the code now lives, that they can run this again any time to save new work, and that this is the repository they will hand to their developer (ties to `prepare-handoff`).

Re-runnable: on a second run it is just safety gate -> commit new work -> push.

## prepare-handoff wiring

- Readiness gate: add a check for "the project is pushed to GitHub (an `origin` remote exists and there are no unpushed commits)." If it is not pushed, tell the person plainly and offer to run `save-to-github`.
- "What to send" section: point at `save-to-github` when the repo is not up yet.

## Discoverability ("a step in both variants")

- A one-line pointer in BOTH variant READMEs (`variants/full-stack/README.md`, `variants/client-only/README.md`): saving your work to GitHub is as simple as asking Claude to push it.
- A line in the plugin `README.md` skills list describing the new skill.

## Out of scope (YAGNI)

GitHub only (no GitLab / Bitbucket). No CI, deploy, or branching workflow. No PRs. Just commit, authenticate, create, push.

## Version

Plugin `0.5.1` -> `0.6.0` (new feature).

## Constraints

- Voice floor on all skill prose and any README copy: sentence case, no em dashes, concrete, no hype, plain language for a non-coder.
- The skill explains what each step does and why, not just commands.
- Honest and safe: never push secrets; the safety gate is a hard stop, not a warning.

## Verification

Prose skill (no build/test), like the other build-time skills. Review checks: accuracy of the `gh` and `git` commands, the variant-specific secret rules, voice floor (0 em dashes), variant-awareness via `.goodvibes`, and that `prepare-handoff` + both variant READMEs + the plugin README reference it correctly. The scaffold-smoke CI is unaffected (no scaffold output change), but a quick confirm that scaffolding still works is prudent since variant READMEs change.
