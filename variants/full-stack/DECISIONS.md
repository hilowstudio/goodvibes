# Decisions

All dates are 2026-06-26.

## Data Isolation Model

Per-user data isolation is the default. Team or organization multi-tenancy is the documented extension.

## Database Connection Pooling

The runtime database URL must keep `?pgbouncer=true` on the transaction pooler. Do not remove it. It disables prepared statements that the pooler can't support, and removing it causes intermittent errors under load.

## Database Role and Row-Level Security

The app connects to Postgres as a non-owner role (`app_runtime`) with no bypass of row-level security. The database enforces isolation even if app code slips.

## User Identification

Supabase Auth provides the signed-in user's ID, which is used directly as the per-user key for data access. There is no separate users table.

## Styling

Styling uses Tailwind v4, which is CSS-first. Design tokens live in `globals.css`, not a JavaScript config.

## Request Interceptor

The request interceptor file is `proxy.ts`. Next.js 16 renamed `middleware.ts` to `proxy.ts`.

## NPM Configuration

`.npmrc` sets `legacy-peer-deps=true` so installs resolve an optional Inngest peer dependency cleanly.

## Cross-Boundary Serialization

`superjson` is a documented convention for sending `Date` and `Decimal` across the server/client boundary. It is not wired into this minimal scaffold yet. Add it when a feature needs those types.

## Linting

The linter is oxlint (not ESLint or Prettier). Configuration lives in `.oxlintrc.json`.

## GoodVibes Scaffold Version

This project was scaffolded by the GoodVibes plugin. The scaffold version is recorded in a `.goodvibes` marker file at the project root once the `/goodvibes` init routine stamps it. That init step is a later part of the GoodVibes system, so the marker may not be present yet.

## Next.js Documentation Source for AI Agents

An `AGENTS.md` at the project root points AI agents at the Next.js docs bundled with the installed package at `node_modules/next/dist/docs/`. Those docs match the exact Next.js version in use, so they are more reliable than agent training data, which can lag behind the installed version. `CLAUDE.md` imports `AGENTS.md` with `@AGENTS.md` so Claude Code picks up the same instruction automatically. This applies to full-stack only; client-only projects do not use Next.js and ship no `AGENTS.md`.
