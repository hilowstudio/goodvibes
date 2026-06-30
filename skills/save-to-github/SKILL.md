---
description: Use when the person wants to put their project on GitHub or save their work online (e.g. "push to GitHub", "save my work online", "back this up", "put this on GitHub", "commit and push"). Walks them through committing, signing in, creating the repository, and pushing, without letting any secret leak.
---

The person wants their project saved on GitHub. Walk them through it in plain
language, one step at a time. They do not need to understand git or GitHub; give them
one clear step and wait. This is safe to run again any time they want to save new work.

First, read the `.goodvibes` file at the project root to learn the variant
(`full-stack` or `client-only`).

## 1. Make sure nothing secret gets pushed (do this first)
Pushing puts files online, so check this before anything is committed:
- Confirm there is a `.gitignore` and that it ignores `.env` and `.env*.local` (where
  real secrets live), `node_modules`, and the build output (`.next/` for full-stack,
  `dist/` for client-only).
- Confirm no real `.env` or `.env*.local` file would be committed, and, on a re-run,
  that no secret is already staged or tracked. Run the secrets check from the
  check-the-work skill.
- For a **full-stack** project, the database URLs (`DATABASE_URL`, `DIRECT_URL`,
  `RUNTIME_DATABASE_URL`), the Inngest keys (`INNGEST_EVENT_KEY`, `INNGEST_SIGNING_KEY`),
  and any Supabase service-role key must never be committed. The
  `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are meant to be public,
  and `.env.example` holds only placeholders, so those are fine.
- For a **client-only** project, the `VITE_GATE_PASSWORD` must never be committed.
  `.env.example` is fine.

If anything sensitive would be pushed, stop and fix it (add it to `.gitignore`, or
unstage it) before going on, and explain plainly what you found. Do not continue until
it is safe.

## 2. Make the project a repository if it is not one
If there is no `.git` folder yet, start one with `main` as the branch:
```bash
git init -b main
```

## 3. Commit the work
Stage everything that is not ignored, and commit it with a short message that says what
changed (or just "Save my work" if you are not sure):
```bash
git add -A
git commit -m "Save my work"
```
If there is nothing new to commit, say so and continue to push what is already there.

## 4. Sign in to GitHub
Check whether they are signed in:
```bash
gh auth status
```
- If it shows they are signed in, continue.
- If they are not signed in and `gh` is installed, run `gh auth login` and walk them
  through it in plain language. It opens GitHub in their browser, or shows a short code
  to type at github.com/login/device. Have them confirm, and wait.
- If `gh` is not installed, help them install it once first (the GitHub CLI:
  `winget install GitHub.cli` on Windows, `brew install gh` on a Mac, or the
  instructions at cli.github.com), then run `gh auth login`.

## 5. Create the repository, or use the existing one
If the project has no GitHub remote yet (no online copy linked):
1. Ask, in plain language, whether the code should be private or public: "Private means
   only you and people you invite can see it. Public means anyone can. Most projects
   start private. Which do you want?" Default to private if they are unsure.
2. Use the project's folder name as the repository name and confirm it with them.
3. Create it and push in one step (substitute their choice and the name):
```bash
gh repo create <name> --private --source . --remote origin --push
```
   Use `--public` instead of `--private` if that is what they chose. If the name is
   already taken, pick another one with them.

If the project already has a remote, skip creating one and just push:
```bash
git push -u origin main
```

## 6. Confirm it landed
Confirm the push succeeded and give them the repository address. `gh repo view --web`
opens it in their browser.

## 7. Tell them what happened
In plain language: their code is now saved on GitHub at that address, they can ask you
to do this again any time to save new work, and this is the repository they will give
their developer when they are ready (the prepare-handoff skill uses it).
