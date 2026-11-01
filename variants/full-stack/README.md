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

Run the database migrations. They create the tables, the row-level security policies, and the `app_runtime` non-owner role the app uses:

```bash
npm install
npm run db:deploy
```

Then give `app_runtime` its login by running `prisma/sql/runtime-role.sql` over the direct connection (the comment at the top of the file explains the password setting), and point `DATABASE_URL` at that role. Once `.env` is filled in, prove it against the real database:

```bash
npm run db:verify
```

### 3. Start Local Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment Variables

All values are in `.env.example`. Here's what each does:

- `DATABASE_URL`: The app's connection to Postgres, through the transaction pooler (port 6543), logged in as the non-owner `app_runtime` role. The pooler username is `app_runtime.<project-ref>`. This role has no `BYPASSRLS` privilege, so the database enforces isolation even if app code slips, and the app refuses to start on any other login. The `?pgbouncer=true` flag is required; keep it. It disables prepared statements that the pooler can't support.
- `DIRECT_URL`: Direct connection to Postgres (port 5432) for migrations and tests only. Runs as the table owner. It stays on your machine and never goes in Vercel.
- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase Auth. These are public by design; they're protected by row-level security, not secrecy.
- `INNGEST_EVENT_KEY` / `INNGEST_SIGNING_KEY`: Inngest credentials for background jobs.

## Going Live (For Your Developer)

If you're building this with Claude and want it online, ask Claude to prepare the handoff. Putting it online is your developer's step. These notes are for them.

1. Keep the repo in the company's GitHub organization.
2. Import it into the company's Vercel team, not a personal Hobby account. Hobby is for non-commercial projects and can't deploy a private repo from an organization.
3. Set these in Vercel: `DATABASE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `INNGEST_EVENT_KEY`, `INNGEST_SIGNING_KEY`. Leave `DIRECT_URL` out. It's the owner login, and the running app never needs it.
4. Deploy.
5. Set `"live": true` in `.goodvibes` and commit it to `main`. From then on `save-to-github` uses a branch and a pull request, because `main` is production. On a paid GitHub plan, add a ruleset that blocks direct pushes to `main` as well.

Vercel doesn't run migrations. Before merging a schema change, run `npm run db:deploy` from a machine that has `DIRECT_URL`.

Background jobs run via Inngest. For scheduled work, use GitHub Actions or Inngest schedules (not Vercel Cron).

## Tests

Run tests with:

```bash
npm test
```

The keystone test (`tests/isolation.test.ts`) proves that one user cannot read another user's data, through the same client and `runScoped` path the app uses. This test runs in CI, but CI only proves its own configuration, so `npm run db:verify` runs the same test with your real `.env`. It adds one test row and removes it again.

## Notes

- Each user's data is isolated by default. Team or organization multi-tenancy is the documented extension to grow into.
- The app connects to Postgres as a non-owner role with no row-level security bypass. Isolation is enforced at the database layer.
- Supabase Auth provides the signed-in user's ID, which is used directly as the per-user data access key. There's no separate users table.
- Built with the GoodVibes scaffold. The scaffold version is recorded in the `.goodvibes` marker file at the project root.

## Saving your work to GitHub

To back up your project or get it ready to hand off, just ask Claude to push it to
GitHub (for example, "save my work to GitHub"). It walks you through signing in,
creating the repository, and pushing, without letting any secret leak.
