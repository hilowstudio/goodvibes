# Decisions

All dates are 2026-06-26 unless an entry says otherwise.

## Data Isolation Model

Per-user data isolation is the default. Team or organization multi-tenancy is the documented extension.

## Database Connection Pooling

The runtime database URL must keep `?pgbouncer=true` on the transaction pooler. Do not remove it. It disables prepared statements that the pooler can't support, and removing it causes intermittent errors under load.

## Database Role and Row-Level Security

_Updated 2026-11-01._

The app logs in to Postgres as a non-owner role (`app_runtime`) with no bypass of row-level security, so the database enforces isolation even if app code slips. `DATABASE_URL` is the only runtime connection. Through Supabase's pooler the username is `app_runtime.<project-ref>`.

Do not use the connection string Supabase's dashboard shows as it stands. It logs in as `postgres`, which has `BYPASSRLS`, and that attribute turns off every policy, including `FORCE ROW LEVEL SECURITY`. The failure is silent: the app works and every user sees every row. So `src/lib/prisma.ts` refuses to start on any other login, and `tests/isolation.test.ts` runs through the app's own client. CI cannot see a deployed configuration, so `npm run db:verify` runs that test with the real `.env`.

If Supabase's pooler keeps refusing `app_runtime` with a correct password (check for an expired role, then wait about 30 seconds for its credential cache), the fallback is to log in as `postgres` and drop privileges inside each transaction: run `GRANT app_runtime TO postgres`, add `set_config('role', 'app_runtime', true)` as the first statement in `runScoped`, and relax the login check in `src/lib/prisma.ts`. It is weaker, because a query outside `runScoped` then skips row-level security. Treat it as a last resort and record it here if you use it.

## Table Access Grants

_Dated 2026-11-01._

Each table's grant to `app_runtime` is written explicitly in the migration that creates the table. Default privileges would be shorter, but they would hand the role every new table the moment it exists, including one with no row-level security yet. With explicit grants, a forgotten step is a loud "permission denied" and not a silent leak. The role is created in a migration, with its password set separately, so these grants work on a brand-new database.

## Deployment Goes Through the Developer

_Dated 2026-11-01._

`CLAUDE.md` tells the assistant not to deploy, and to run the handoff instead. That keeps company code and data out of personal accounts and means a developer sees the app before real people do. Once the repo is connected to Vercel, every push to `main` is a production deploy, so setting `"live": true` in `.goodvibes` moves `save-to-github` to branches and pull requests. `DIRECT_URL` is the owner login and is not set in Vercel.

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

This project was scaffolded by the GoodVibes plugin. The scaffold version is recorded in the `.goodvibes` marker file at the project root, which `/goodvibes` writes when it creates the project. The same file holds the `live` flag.

## Next.js Documentation Source for AI Agents

An `AGENTS.md` at the project root points AI agents at the Next.js docs bundled with the installed package at `node_modules/next/dist/docs/`. Those docs match the exact Next.js version in use, so they are more reliable than agent training data, which can lag behind the installed version. `CLAUDE.md` imports `AGENTS.md` with `@AGENTS.md` so Claude Code picks up the same instruction automatically. This applies to full-stack only; client-only projects do not use Next.js and ship no `AGENTS.md`.
