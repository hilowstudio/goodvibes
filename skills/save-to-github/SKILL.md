---
description: Use when the person wants to put their project on GitHub or save their work online (e.g. "push to GitHub", "save my work online", "back this up", "put this on GitHub", "commit and push"). Walks them through committing, signing in, creating the repository, and pushing, without letting any secret leak.
---

The person wants their project saved on GitHub. Walk them through it in plain
language, one step at a time. They do not need to understand git or GitHub; give them
one clear step and wait. This is safe to run again any time they want to save new work.

First, read the `.goodvibes` file at the project root to learn the variant
(`full-stack` or `client-only`).

The GitHub organization this plugin was set up for is: `${user_config.github_org}`. If
that shows nothing, or still shows a placeholder in curly braces, no organization was set.

## 1. Make sure nothing secret gets pushed (do this first)
Pushing puts files online, so check this before anything is committed:
- Confirm there is a `.gitignore` and that it ignores `.env` and `.env*.local` (where
  real secrets live), `node_modules`, and the build output (`.next/` for full-stack,
  `dist/` for client-only). If `.gitignore` does not already list `.env`, add it before
  going further (an older client-only project may not list it).
- Confirm no real `.env` or `.env*.local` file would be committed, and, on a re-run,
  that no secret is already staged or tracked. Run the secrets check from the
  check-the-work skill.
- For a **full-stack** project, the database URLs (`DATABASE_URL`, `DIRECT_URL`), the
  Inngest keys (`INNGEST_EVENT_KEY`, `INNGEST_SIGNING_KEY`), and any Supabase service-role
  key must never be committed. The `NEXT_PUBLIC_SUPABASE_URL` and
  `NEXT_PUBLIC_SUPABASE_ANON_KEY` are meant to be public, and `.env.example` holds only
  placeholders, so those are fine.
- For a **client-only** project, the `VITE_GATE_PASSWORD` must never be committed (it is
  meant to be readable in the browser, but it still does not belong in the repo).
  `.env.example` is fine.

If anything sensitive would be pushed, stop and fix it (add it to `.gitignore`, or
unstage it) before going on, and explain plainly what you found. Do not continue until
it is safe.

## 2. Make the project a repository if it is not one
If there is no `.git` folder yet, start one with `main` as the branch:
```bash
git init -b main
```

## 3. Sign in to GitHub
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

## 4. Find out whether this project is live
The developer marks a project live by setting `"live": true` in `.goodvibes` on GitHub,
so check GitHub's copy, not just the one on this computer. If the project has a GitHub
remote:
```bash
git fetch origin
git show origin/main:.goodvibes
```
If that says `"live": true`, the project is **live**: its `main` branch is the running
app, and anything pushed there reaches real people. Follow the live path below, even if
the person asks you to push straight to `main`. If there is no remote, the `live` value
is missing, or it is `false`, follow the not-live path.

## 5. Commit the work
**Not live:** stage everything that is not ignored, and commit it with a short message
that says what changed (or just "Save my work" if you are not sure):
```bash
git add -A
git commit -m "Save my work"
```
If there is nothing new to commit, say so and continue to push what is already there.

**Live:** put the work on its own branch first, named for what changed:
- If you are on `main`, start the branch here and move `main` back to GitHub's copy. This
  keeps any commits you already made, on the new branch:
  ```bash
  git switch -c save/<short-description>
  git branch -f main origin/main
  ```
- If you are on a branch whose pull request is still open, stay on it.
- If you are on a branch whose pull request was merged (`gh pr view --json state`), carry
  the unsaved work onto a fresh branch:
  ```bash
  git stash push -u
  git switch -c save/<short-description> origin/main
  git stash pop
  ```
Then commit with the same `git add -A` and `git commit` as above.

## 6. Send it to GitHub
**Not live, no GitHub remote yet:**
1. Choose where the repository goes. If an organization is set above, it goes there and
   it is private; do not ask. If none is set, ask: "Is this for a company with its own
   GitHub organization, or is it your own project? If it is for a company, what is the
   organization called? If you are not sure, ask your developer first." Company code
   should not start out in a personal account.
2. For a personal project, ask whether it should be private or public: "Private means
   only you and people you invite can see it. Public means anyone can. Most projects
   start private. Which do you want?" Default to private if they are unsure.
3. Use the project's folder name as the repository name and confirm it with them.
4. Create it and push in one step (substitute the real names):
```bash
gh repo create <organization>/<name> --private --source . --remote origin --push
```
   For a personal project, drop the `<organization>/` and use `--public` if that is what
   they chose. If the name is already taken, pick another one with them. If GitHub refuses
   because they cannot create repositories in that organization, stop and tell them to ask
   their developer for access. Do not fall back to their personal account.

**Not live, already has a remote:** just push:
```bash
git push -u origin main
```
If GitHub refuses because it has newer work, bring that in with
`git pull --no-rebase origin main`, then push again.

**Live:** bring in the latest `main`, push the branch, and open a pull request if there
is not one yet. Write the title and description in plain language:
```bash
git merge origin/main
git push -u origin HEAD
gh pr create --base main --title "<what changed>" --body "<what changed and why>"
```
If the merge reports conflicts and you are not sure how to resolve them safely, run
`git merge --abort` and tell them this one needs their developer. Do not merge the pull
request yourself.

## 7. Confirm it landed
Confirm the push succeeded and give them the address: the repository, or the pull request
on the live path. `gh repo view --web` or `gh pr view --web` opens it in their browser.

## 8. Tell them what happened
**Not live:** in plain language, their code is now saved on GitHub at that address, they
can ask you to do this again any time to save new work, and this is the repository they
will give their developer when they are ready (the prepare-handoff skill uses it).

**Live:** their work is saved on GitHub, and the live app has not changed yet. The pull
request shows exactly what would change, and a preview link will appear on it so they can
try it safely. It goes live when the pull request is reviewed and merged.
