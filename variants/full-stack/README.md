# Full-Stack App

This is a starter full-stack app where people sign in and keep their own private notes. It's a pattern reference for the GoodVibes stack, not a finished product.

## Stack

- **Next.js** 16 (App Router)
- **React** 19
- **TypeScript** (strict)
- **Supabase** for Auth and Postgres
- **Prisma** with the pg driver adapter
- **Tailwind CSS** v4
- **Inngest** for background jobs
- Deploys to **Vercel**

## Requirements

Node 20.9+ is required. Node 24 LTS is preferred.

## Getting Started

### 1. Connect Your Services

The app won't fully run until you set up Supabase and Inngest.

1. Create a Supabase project (this gives you a Postgres database and Auth).
2. Create an Inngest app (for background jobs).
3. Copy `.env.example` to `.env`.
4. Fill in the values from your Supabase and Inngest projects.

### 2. Set Up the Database

Run the database migrations and create the runtime role:

```bash
npm install
prisma migrate deploy
```

Or do this manually:
- Apply the SQL in `prisma/migrations/` (creates tables and row-level security policies).
- Apply `prisma/sql/runtime-role.sql` (creates the `app_runtime` non-owner role the app uses).

### 3. Start Local Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment Variables

All values are in `.env.example`. Here's what each does:

- `DATABASE_URL`: Runtime connection to Postgres via the transaction pooler (port 6543). The `?pgbouncer=true` flag is required; keep it. It disables prepared statements that the pooler can't support.
- `DIRECT_URL`: Direct connection to Postgres (port 5432) for migrations only. Runs as the table owner.
- `RUNTIME_DATABASE_URL`: The non-owner role (`app_runtime`) the app uses at request time. This role has no `BYPASSRLS` privilege, so the database enforces isolation even if app code slips.
- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase Auth. These are public by design; they're protected by row-level security, not secrecy.
- `INNGEST_EVENT_KEY` / `INNGEST_SIGNING_KEY`: Inngest credentials for background jobs.

## Deploy to Vercel

1. Push the repo to Git.
2. Create a Vercel project and link it to your repo.
3. Set all the environment variables in Vercel project settings.
4. Deploy.

Background jobs run via Inngest. For scheduled work, use GitHub Actions or Inngest schedules (not Vercel Cron).

## Tests

Run tests with:

```bash
npm test
```

The keystone test (`tests/isolation.test.ts`) proves that one user cannot read another user's data. This test runs in CI.

## Notes

- Each user's data is isolated by default. Team or organization multi-tenancy is the documented extension to grow into.
- The app connects to Postgres as a non-owner role with no row-level security bypass. Isolation is enforced at the database layer.
- Supabase Auth provides the signed-in user's ID, which is used directly as the per-user data access key. There's no separate users table.
- Built with the GoodVibes scaffold. The scaffold version is recorded in a `.goodvibes` marker file at the project root once present.
