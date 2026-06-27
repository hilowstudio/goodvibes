# GoodVibes

A Claude Code plugin from Hi-Low Studio that helps non-technical "vibe coders" scaffold and build production-shaped apps on a consistent, handoff-ready stack. The studio installs it for the client; the client runs one command.

## Requirements

Claude Code v2.1.100 or newer (plugins/marketplaces support).

## Install

```bash
/plugin marketplace add hilowstudio/goodvibes
/plugin install goodvibes@goodvibes
```

Note: third-party marketplaces do not auto-update by default. Enable auto-update in the /plugin Marketplaces tab to receive new conventions.

## Use it

In an empty project folder, run:

```bash
/goodvibes
```

It asks one question: does the app need accounts and saved data on a server, or does it run entirely in the browser? Then it scaffolds the right variant.

It writes three artifacts:
- `CLAUDE.md`: the build rules (how to develop the app).
- `docs/`: the reasoning (design principles, voice guide, coding standards).
- `.goodvibes`: version stamp (stays meaningful as the plugin updates).

## The two variants

**Full-stack:** Next.js 16 App Router, Supabase for auth and postgres database, Prisma for schema, Inngest for background jobs, deploys to Vercel. Per-user data isolation enforced by postgres row-level security, proven by a keystone test (user A cannot read user B's data).

**Browser-only:** React 19 plus Vite SPA, optional DuckDB-WASM for in-browser data, optional shared-password gate (privacy, not security), deploys to Vercel static hosting.

## Build-time skills

While building, Claude can guide the person through two things automatically, when the
conversation calls for them:

- **Connecting an outside service** (Airtable, payments, email, any API). It conducts
  the integration safely: read-only by default, keys kept on the server, responses
  validated, with vetted Airtable and MotherDuck adapters in `kit/adapters/`.
- **Setting up the backend** for a full-stack project (creating the Supabase project
  and Inngest app and putting the keys in place).

These run on intent. The person does not need to invoke them.

## Checking the work and handing off

Two more skills run on intent while you build:

- **Checking the work:** ask Claude to check the project ("is this safe", "did you
  really do that") and it runs a plain-language health check (secrets out of the code,
  the app builds, the per-user isolation test is in place for full-stack apps).
- **Handing off:** when you are ready to give the project to a developer, ask Claude to
  prepare the handoff. It runs a readiness gate and writes a `HANDOFF.md` that tells
  the developer what the app does, what is built, what is still needed, and how to run
  it.

## Repo layout

- `.claude-plugin/`: plugin manifests.
- `commands/goodvibes.md`: the command flow.
- `scripts/scaffold.mjs`: scaffolding logic.
- `kit/`: docs that travel into scaffolded projects (build rules, design and voice guides, developer-facing reasoning).
- `variants/`: the two bundled starters (full-stack and client-only).
- `.github/workflows/ci.yml`: tests both variants.

## For the studio / maintainer

The plugin version lives in `.claude-plugin/plugin.json`. Bump it each release so the `.goodvibes` stamp in client projects is meaningful. The per-variant CI travels into each scaffolded project; the repo-root CI tests both variants here.
