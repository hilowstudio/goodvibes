# W2 — Handoff Layer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`).

**Goal:** Add the handoff layer to the GoodVibes plugin so a non-technical client can (a) sanity-check the AI's work at any time and (b) run a pre-handoff gate that produces a clear "what you're receiving" document for the studio developer. This is the piece that most directly serves the clean-handoff goal.

**Architecture:** Two plugin skills (`check-the-work`, `prepare-handoff`) that read the project's `.goodvibes` marker to learn the variant (full-stack vs client-only) and run variant-appropriate, plain-language checks. `prepare-handoff` additionally writes a `HANDOFF.md` at the project root. No new scaffolded files are needed up front; the orientation already lives in CLAUDE.md + docs/ + README/DECISIONS, and HANDOFF.md is the tailored handoff artifact.

**Tech Stack:** Claude Code plugin skills (SKILL.md), plain language. No external APIs.

**Builds on:** W1 (the variants, the `.goodvibes` stamp with `variant`, the per-variant CIs, the isolation test, README/DECISIONS conventions) and W1.5 (the skills pattern).

## Global Constraints

- **Voice floor** on all skill prose and the generated HANDOFF.md: sentence case, no em dashes, concrete, no hype, contractions ok.
- **Plain language for a non-coder.** The checks explain what they mean and why, not just pass/fail jargon.
- **Variant-aware.** Read `.goodvibes` (JSON `{ plugin, version, variant, generatedAt }`) for the variant; run full-stack checks (isolation test, server secrets, RLS) only for full-stack; run client-only checks (no secret in the browser, the build) for client-only.
- **Honest, not performative.** A check reports a real concern plainly; it never claims green without looking.
- **No new dependencies.** These skills use the file/shell tools the assistant already has.

---

### Task 1: `check-the-work` skill

**Files:**
- Create `skills/check-the-work/SKILL.md`

- [ ] **Step 1: `skills/check-the-work/SKILL.md`**
```markdown
---
description: Use when the person wants to check that the AI actually did what it said, or that their project is healthy (e.g. "did you really do that", "is this safe", "is my app ok"). A plain-language health check.
---

The person wants to know the work is real and the project is healthy. Run these checks
and report each one in plain language: what you checked, and whether it is fine or
needs attention. Do not claim something is fine without looking.

First, read the `.goodvibes` file at the project root to learn the variant
(`full-stack` or `client-only`). If it is missing, say so and run the checks that
apply by inspecting the project.

## Checks for every project
- **Secrets are out of the code.** Search the project for hardcoded keys, tokens, and
  passwords. Confirm real secrets live only in `.env` (not committed) and that `.env`
  is in `.gitignore`. The Supabase anon key in `.env.example` and `NEXT_PUBLIC_`
  values are meant to be public, so those are fine; flag anything else.
- **The app still builds.** Run the project's build (`npm run build`). Report pass or
  the first real error in plain language.
- **DECISIONS.md is current.** Open `DECISIONS.md` and check it mentions the
  consequential choices made so far. If recent significant work is not reflected,
  say what is missing.
- **Nothing is half-built.** Look for obvious dead code, commented-out blocks, or
  features that were started and abandoned. Name any you find.

## Extra checks for a full-stack project
- **The isolation test exists.** Confirm `tests/isolation.test.ts` is present (the
  test that proves one user cannot read another user's data) and that CI runs it.
  This is the most important safety check for an app with accounts. If it is missing,
  flag it loudly.
- **Server secrets stay on the server.** Confirm no service-role key or database URL
  is in any file that ships to the browser (no secret behind `NEXT_PUBLIC_` except the
  Supabase URL and anon key).

## Report
List each check with a clear result: fine, or a specific concern and what to do about
it. End with a one-line plain-language summary: is the project in good shape, or are
there things to fix first. Be honest. If everything is fine, say so simply.
```

- [ ] **Step 2: Verify** — file exists with `description` frontmatter; `grep -c "—"` = 0; the referenced paths (`.goodvibes`, `tests/isolation.test.ts`, `DECISIONS.md`, `.env`/`.gitignore`) match the actual variants.

- [ ] **Step 3: Commit**
```bash
git add skills/check-the-work
git commit -m "feat(skill): check-the-work plain-language project health check"
```

---

### Task 2: `prepare-handoff` skill

**Files:**
- Create `skills/prepare-handoff/SKILL.md`

- [ ] **Step 1: `skills/prepare-handoff/SKILL.md`**
```markdown
---
description: Use when the person is ready to hand the project to a developer (e.g. "I'm ready to hand this off", "prepare this for my developer", "get this ready for handoff"). Runs a readiness gate and writes a HANDOFF.md summary.
---

The person is ready to hand the project to a developer. Do two things: run the
readiness checks, and write a clear `HANDOFF.md` so the developer knows exactly what
they are receiving.

First, read the `.goodvibes` file at the project root for the variant and version.

## 1. Run the readiness gate
Run the checks from the check-the-work skill (secrets out of code, the app builds,
DECISIONS.md current, nothing half-built, and for full-stack: the isolation test
exists and server secrets stay server-side). Also check:
- The code is committed to git (no large amount of uncommitted work).
- The README's run and deploy steps are present and accurate.
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
- **How to run it locally**: point to the README steps and the environment variables.
- **Where the rules and reasoning live**: `CLAUDE.md` for the build conventions, the
  `docs/` folder for the reasoning (the principled-coding, design, and voice guides),
  and `DECISIONS.md` for the consequential choices.
- **The safety note** (full-stack): the project enforces per-user data isolation with
  a keystone test (`tests/isolation.test.ts`) that proves one user cannot read
  another's data.

## 3. Tell the person what to send
End by telling the person, in plain language, what to give their developer: the git
repository (pushed somewhere the developer can access), and a note that `HANDOFF.md`
explains the rest. Confirm no secrets are in the repository before they share it.
```

- [ ] **Step 2: Verify** — file exists with `description` frontmatter; 0 em dashes; references match the variants; the HANDOFF.md sections cover what-it-does / stack / built / not-done / run / where-rules-live / safety.

- [ ] **Step 3: Commit**
```bash
git add skills/prepare-handoff
git commit -m "feat(skill): prepare-handoff readiness gate and HANDOFF.md generator"
```

---

### Task 3: Wire it in (README + version)

**Files:**
- Modify `README.md` (add a "Checking the work and handing off" section)
- Modify `.claude-plugin/plugin.json` (version 0.3.0)

- [ ] **Step 1: Add a README section** (after "Build-time skills"; voice floor, no em dashes):
```markdown
## Checking the work and handing off

Two more skills run on intent while you build:

- **Checking the work:** ask Claude to check the project ("is this safe", "did you
  really do that") and it runs a plain-language health check (secrets out of the code,
  the app builds, the per-user isolation test is in place for full-stack apps).
- **Handing off:** when you are ready to give the project to a developer, ask Claude to
  prepare the handoff. It runs a readiness gate and writes a `HANDOFF.md` that tells
  the developer what the app does, what is built, what is still needed, and how to run
  it.
```

- [ ] **Step 2: Bump `.claude-plugin/plugin.json`** version to `"0.3.0"`.

- [ ] **Step 3: Verify** — README has 0 em dashes in the new section; plugin.json valid JSON at 0.3.0.

- [ ] **Step 4: Commit**
```bash
git add README.md .claude-plugin/plugin.json
git commit -m "docs(plugin): document handoff skills, version 0.3.0"
```

---

## Self-Review

**1. Spec coverage (the original review's handoff gaps + spec W2):** client "did the AI do its job" verification — Task 1 (check-the-work). Pre-handoff packet + "what you're receiving" doc — Task 2 (prepare-handoff + HANDOFF.md). START-HERE orientation — covered by the existing plugin README + per-project README/CLAUDE.md/docs + the generated HANDOFF.md's "where rules and reasoning live" section (no redundant static file). README + version wiring — Task 3. ✓

**2. Placeholder scan:** The skills are concrete check lists, not vague guidance. HANDOFF.md content is specified by section. No TODOs.

**3. Consistency:** Both skills read the `.goodvibes` marker for the variant (the W1 stamp). Checks reference the real variant paths (`tests/isolation.test.ts`, `DECISIONS.md`, `.env`/`.gitignore`, `NEXT_PUBLIC_` allowance). prepare-handoff reuses check-the-work's checks. Voice floor throughout.

**4. Risks:** These are prose skills (no build/test); review is for accuracy to the variants, guardrail/honesty fidelity, and voice floor. They run their checks at use time against whatever project they are invoked in.
