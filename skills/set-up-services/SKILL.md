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
3. From the project's Connect dialog, copy the direct connection string (port 5432)
   into `.env` as `DIRECT_URL`. This is the owner login, used for migrations and tests.
   It stays in `.env`, never in git and never in Vercel. If the direct connection will
   not connect from their network, it may need IPv6; use the Session pooler string from
   the same dialog instead (also port 5432).
4. Create the tables and the app's database role: `npm run db:deploy`.
5. Give that role a password. Generate one with letters and digits only, so it needs no
   escaping inside a URL:
   ```bash
   node -e "console.log(require('crypto').randomBytes(24).toString('hex'))"
   ```
   Then run `prisma/sql/runtime-role.sql` over the direct connection, with
   `SET goodvibes.runtime_password = '<the password>';` first, in the same session. Use
   `psql` if it is installed. Otherwise paste both into the Supabase SQL editor and run
   them together.
6. Build `DATABASE_URL` in `.env`. Start from the Transaction pooler string in the
   Connect dialog (port 6543), and copy the host exactly as shown. Then change two things:
   - the username, from `postgres.<project-ref>` to `app_runtime.<project-ref>`
   - the password, to the one from step 5

   Keep `:6543` and put `?pgbouncer=true` on the end. Do not use the string as copied: it
   logs in as `postgres`, which skips row-level security, so one user could see everyone's
   data. The app refuses to start on that login.
7. Prove it works. Wait about 30 seconds, because Supabase's pooler takes a moment to
   learn a new password, then run `npm run db:verify`. This logs in the way the live app
   will and confirms one user cannot read another's data. It adds one test row and removes
   it again.

If `db:verify` fails with a password or "tenant or user" error, check the username has
the `.<project-ref>` part and the host matches the Connect dialog exactly. Wait 30 seconds
and try once more. Do not keep retrying, because repeated failures can lock the
connection out for a while. If it still fails, stop and tell the person this needs their
developer. Do not switch `DATABASE_URL` to the `postgres` login to get past it, and do not
change the login check in `src/lib/prisma.ts`.

## Inngest (background jobs)
1. Have them create an Inngest account. The app registers itself automatically on the
   first sync of the project's `/api/inngest` route (when the dev server runs or a
   deploy happens), so there is no separate "create app" button to find.
2. Get the event key and signing key and put them in `.env` as `INNGEST_EVENT_KEY` and
   `INNGEST_SIGNING_KEY`.
3. For local development, the Inngest dev server runs the jobs without these keys.

## Check it
Confirm `.env` has every variable from `.env.example` filled in, that `.env` is git
ignored, and that no key is in any file that ships to the browser. Then run the app.
