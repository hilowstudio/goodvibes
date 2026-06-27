---
description: Use when a full-stack GoodVibes project needs its backend connected for the first time. Walks the person through creating a Supabase project and an Inngest app and putting the keys in place safely.
---

A full-stack project does not run until its database and background-jobs service are
connected. Walk the person through it in plain language. They do not need to
understand the parts; give them one clear step at a time and wait.

## Supabase (database and accounts)
1. Have them create a free project at supabase.com and wait for it to finish setting
   up. (If the Supabase CLI or MCP is available in this environment, you can do more
   of this for them; otherwise guide the click-through.)
2. From the project's API settings, get the project URL and the anon key. Put them in
   a local `.env` file as `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
   These two are safe to expose. Do not put the service-role key in the app.
3. From the project's database settings, get the connection strings. Set `DATABASE_URL`
   to the transaction pooler URL (port 6543) and keep `?pgbouncer=true` on it. Set
   `DIRECT_URL` to the direct connection (port 5432). Both go in `.env`, never in git.
4. Apply the database setup: run the migrations in `prisma/migrations/` and the runtime
   role in `prisma/sql/runtime-role.sql` against the direct connection (the file's
   comment explains the one password setting it needs). Then set `RUNTIME_DATABASE_URL`
   to a connection string for the `app_runtime` role.

## Inngest (background jobs)
1. Have them create an Inngest account and an app.
2. Get the event key and signing key and put them in `.env` as `INNGEST_EVENT_KEY` and
   `INNGEST_SIGNING_KEY`.
3. For local development, the Inngest dev server runs the jobs without these keys.

## Check it
Confirm `.env` has every variable from `.env.example` filled in, that `.env` is git
ignored, and that no key is in any file that ships to the browser. Then run the app.
