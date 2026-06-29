# save-to-github Skill Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `save-to-github` plugin skill that walks a non-technical GoodVibes user through committing and pushing their project to GitHub (authenticating if needed), and wire it into handoff and discovery.

**Architecture:** A new intent-triggered prose skill (`skills/save-to-github/SKILL.md`) modeled on the existing build-time skills, variant-aware via the `.goodvibes` marker. It is a plugin skill, so it reaches both variants automatically. `prepare-handoff` references it; both variant READMEs and the plugin README point at it so it is a discoverable step.

**Tech Stack:** Claude Code plugin skill (SKILL.md prose). Operates a client project with `git` and the GitHub CLI (`gh`). No app code, no automated tests (prose skill).

## Global Constraints

- **Voice floor** on all skill prose and README copy: sentence case, no em dashes, concrete, no hype, contractions ok, plain language for a non-coder.
- **The skill explains what each step does and why**, not just commands; one clear step at a time.
- **Safety is a hard stop:** never push secrets. The pre-commit secrets gate blocks, it does not merely warn.
- **GitHub only.** No GitLab/Bitbucket, no CI/deploy/branching/PR workflow. Just commit, authenticate, create, push.
- **Auth = `gh` with install-if-missing fallback:** detect with `gh auth status`; `gh auth login` if needed; if `gh` is absent, guide the one-time install first.
- **Variant-aware** via `.goodvibes` (`{ plugin, version, variant, generatedAt }`). Variant secret rules are exact (see Task 1).
- **Re-runnable:** a second run is safety gate, commit new work, push.
- **Plugin version:** `.claude-plugin/plugin.json` `0.5.1` -> `0.6.0`.
- **Branch/push:** all commits local on `main`; the finished, reviewed feature is pushed to `main` at the end (not mid-feature).

---

### Task 1: The `save-to-github` skill

**Files:**
- Create: `skills/save-to-github/SKILL.md`

**Interfaces:**
- Produces: the skill file at `skills/save-to-github/SKILL.md`, referenced by name ("save-to-github skill") in Task 2's edits to `prepare-handoff`, both variant READMEs, and the plugin README.

- [ ] **Step 1: Create `skills/save-to-github/SKILL.md`** with exactly this content:

```markdown
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
- Confirm there is a `.gitignore` and that it ignores `.env`, `node_modules`, and the
  build output (`.next/` for full-stack, `dist/` for client-only).
- Confirm no `.env` file and no secret is already staged or tracked. Run the secrets
  check from the check-the-work skill.
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
\```bash
git init -b main
\```

## 3. Commit the work
Stage everything that is not ignored, and commit it with a short message that says what
changed (or just "Save my work" if you are not sure):
\```bash
git add -A
git commit -m "Save my work"
\```
If there is nothing new to commit, say so and continue to push what is already there.

## 4. Sign in to GitHub
Check whether they are signed in:
\```bash
gh auth status
\```
- If it shows they are signed in, continue.
- If they are not signed in and `gh` is installed, run `gh auth login` and walk them
  through it in plain language. It opens GitHub in their browser, or shows a short code
  to type at github.com/login/device. Have them confirm, and wait.
- If `gh` is not installed, help them install it once first (the GitHub CLI:
  `winget install GitHub.cli` on Windows, `brew install gh` on a Mac, or the
  instructions at cli.github.com), then run `gh auth login`.

## 5. Create the repository, or use the existing one
If the project has no GitHub remote yet:
1. Ask, in plain language, whether the code should be private or public: "Private means
   only you and people you invite can see it. Public means anyone can. Most projects
   start private. Which do you want?" Default to private if they are unsure.
2. Use the project's folder name as the repository name and confirm it with them.
3. Create it and push in one step (substitute their choice and the name):
\```bash
gh repo create <name> --private --source . --remote origin --push
\```
   Use `--public` instead of `--private` if that is what they chose. If the name is
   already taken, pick another one with them.

If the project already has a remote, skip creating one and just push:
\```bash
git push -u origin main
\```

## 6. Confirm it landed
Confirm the push succeeded and give them the repository address. `gh repo view --web`
opens it in their browser.

## 7. Tell them what happened
In plain language: their code is now saved on GitHub at that address, they can ask you
to do this again any time to save new work, and this is the repository they will give
their developer when they are ready (the prepare-handoff skill uses it).
```

Note for the implementer: in the content above, the triple-backtick code fences are escaped as `\``` so they survive this plan's own code block. Write them as normal triple backticks (` ``` `) in the actual file.

- [ ] **Step 2: Verify the skill file**
  - `test -f skills/save-to-github/SKILL.md` passes.
  - The file has YAML frontmatter with a `description:` line (first lines between `---`).
  - `grep -c "—" skills/save-to-github/SKILL.md` returns 0 (no em dashes). Also check there are no en dashes (`–`).
  - The shell commands are valid and correct: `git init -b main`, `git add -A`, `git commit -m`, `gh auth status`, `gh auth login`, `gh repo create <name> --private --source . --remote origin --push`, `git push -u origin main`, `gh repo view --web`.
  - The variant secret rules name the exact env vars: full-stack `DATABASE_URL`, `DIRECT_URL`, `RUNTIME_DATABASE_URL`, `INNGEST_EVENT_KEY`, `INNGEST_SIGNING_KEY`, service-role key as secret; `NEXT_PUBLIC_*` and `.env.example` as safe; client-only `VITE_GATE_PASSWORD` as secret.
  - The skill reads `.goodvibes` for the variant and the safety gate is a hard stop ("Do not continue until it is safe").

- [ ] **Step 3: Commit**
```bash
git add skills/save-to-github/SKILL.md
git commit -m "feat(skill): save-to-github - guided commit, auth, and push to GitHub"
```

---

### Task 2: Wire it in (handoff reference, discovery, version)

**Files:**
- Modify: `skills/prepare-handoff/SKILL.md`
- Modify: `variants/full-stack/README.md`
- Modify: `variants/client-only/README.md`
- Modify: `README.md` (plugin README)
- Modify: `.claude-plugin/plugin.json`

**Interfaces:**
- Consumes: the `save-to-github` skill from Task 1 (referenced by name).

- [ ] **Step 1: Reference save-to-github from `prepare-handoff`.**
  In `skills/prepare-handoff/SKILL.md`, in the "## 1. Run the readiness gate" list, add this bullet immediately after the existing "The code is committed to git (no large amount of uncommitted work)." bullet:
```markdown
- The project is saved to GitHub: an `origin` remote exists and there are no unpushed
  commits. If it is not pushed yet, tell the person plainly and offer to run the
  save-to-github skill before handing off.
```
  And in "## 3. Tell the person what to send", replace this sentence:
```
End by telling the person, in plain language, what to give their developer: the git
repository (pushed somewhere the developer can access), and a note that `HANDOFF.md`
explains the rest. Confirm no secrets are in the repository before they share it.
```
  with:
```
End by telling the person, in plain language, what to give their developer: the GitHub
repository (if it is not pushed yet, run the save-to-github skill first), and a note
that `HANDOFF.md` explains the rest. Confirm no secrets are in the repository before
they share it.
```

- [ ] **Step 2: Add a discovery pointer to BOTH variant READMEs.**
  Append this section to the end of `variants/full-stack/README.md` AND `variants/client-only/README.md` (identical text; match each file's existing heading style):
```markdown
## Saving your work to GitHub

To back up your project or get it ready to hand off, just ask Claude to push it to
GitHub (for example, "save my work to GitHub"). It walks you through signing in,
creating the repository, and pushing, without letting any secret leak.
```

- [ ] **Step 3: Add the skill to the plugin README.**
  In `README.md`, find the section that lists the build-time / handoff skills (near the "Build-time skills" and "Checking the work and handing off" sections) and add a short bullet describing the new skill, matching the surrounding style. Suggested copy:
```markdown
- **Saving to GitHub:** ask Claude to push the project to GitHub ("save my work
  online", "put this on GitHub") and it handles committing, signing in, creating the
  repository, and pushing, without committing any secret.
```

- [ ] **Step 4: Bump the plugin version.**
  In `.claude-plugin/plugin.json`, change `"version": "0.5.1"` to `"version": "0.6.0"`. Keep valid JSON.

- [ ] **Step 5: Verify the wiring**
  - `grep -n "save-to-github" skills/prepare-handoff/SKILL.md` shows the readiness-gate bullet and the "what to send" reference.
  - `grep -rn "Saving your work to GitHub" variants/full-stack/README.md variants/client-only/README.md` shows the section in both.
  - `grep -n "Saving to GitHub" README.md` shows the plugin README line.
  - Em dashes: `grep -c "—"` on all five changed files returns 0 for the new content (check the whole files; if a file already had em dashes elsewhere from before, ensure you introduced none).
  - `node -e "JSON.parse(require('fs').readFileSync('.claude-plugin/plugin.json','utf8'))"` succeeds and the version is `0.6.0`.
  - **Scaffold smoke (the variant READMEs ship into projects):** scaffold both variants into temp dirs and confirm the README pointer comes through, and the scaffold still works:
```bash
T1=$(mktemp -d); node scripts/scaffold.mjs create --variant full-stack --plugin-root "$(pwd)" --cwd "$T1"
grep -q "Saving your work to GitHub" "$T1/README.md" && echo "full-stack README OK"
T2=$(mktemp -d); node scripts/scaffold.mjs create --variant client-only --plugin-root "$(pwd)" --cwd "$T2"
grep -q "Saving your work to GitHub" "$T2/README.md" && echo "client-only README OK"
rm -rf "$T1" "$T2"
```

- [ ] **Step 6: Commit**
```bash
git add skills/prepare-handoff/SKILL.md variants/full-stack/README.md variants/client-only/README.md README.md .claude-plugin/plugin.json
git commit -m "feat(plugin): wire save-to-github into handoff + READMEs; v0.6.0"
```

---

## Self-Review

**1. Spec coverage:** The skill (Task 1) implements the 7-step flow, the safety gate hard-stop, gh-with-install-fallback auth, variant secret rules, and private-default repo creation. The prepare-handoff wiring, both variant README pointers, the plugin README line, and the 0.6.0 bump are Task 2. Verification (em-dash scan, command accuracy, variant rules, scaffold smoke) is in each task. All spec sections are covered.

**2. Placeholder scan:** No TBD/TODO. The full SKILL.md content and the exact edit text are inline. The only `<name>` is a deliberate runtime substitution (the repo name), explained in the step.

**3. Consistency:** The skill is referenced by the exact name "save-to-github skill" in prepare-handoff, both READMEs, and the plugin README. The variant env-var names match `.env.example` (full-stack `DATABASE_URL`/`DIRECT_URL`/`RUNTIME_DATABASE_URL`/`INNGEST_EVENT_KEY`/`INNGEST_SIGNING_KEY`; client-only `VITE_GATE_PASSWORD`). The version path `0.5.1 -> 0.6.0` matches the current plugin.json.
