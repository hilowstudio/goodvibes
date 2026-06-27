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
