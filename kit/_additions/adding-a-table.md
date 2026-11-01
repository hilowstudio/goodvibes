## Adding a table

Every table that holds user data follows these steps, in one migration, the way `notes`
does. Copy that pattern. A missing step either breaks the app loudly or, worse, lets one
user read another's data. Supabase also serves tables in the `public` schema through its
public API key, so a table without row-level security can be readable by anyone.

1. Add the model to `prisma/schema.prisma`, with a `userId` column mapped to `user_id`
   and an index on it.
2. Write the migration by hand in the next numbered folder,
   `prisma/migrations/NNNN_name/migration.sql`. After the `CREATE TABLE`, add:

   ```sql
   ALTER TABLE "things" ENABLE ROW LEVEL SECURITY;
   ALTER TABLE "things" FORCE ROW LEVEL SECURITY;
   -- The four policies from 0002_rls: select, insert, update, delete.
   GRANT SELECT, INSERT, UPDATE, DELETE ON "things" TO app_runtime;
   ```

3. Read and write only through `runScoped`, and filter by `userId` in the query as well.
   The filter and the policy fail independently, so keep both.
4. Add to `tests/isolation.test.ts`: a test that another user is denied, and the
   positive control that the owner can see their row, the way the `notes` tests do.
5. Run `npm run prisma:generate`, then `npm run db:deploy`.

Background jobs have no signed-in user. Pass the `userId` in the event and go through
`runScoped(event.data.userId, ...)`. Without it a job sees zero rows.

A table with nothing private in it (a public lookup list) still enables and forces
row-level security, with one select policy that uses `USING (true)`. Record why in
DECISIONS.md. A feature that needs one user to see another's rows, like teams, changes
the isolation model: stop and bring in the developer.

If a query fails with "permission denied", the table is missing its grant. If it returns
nothing, check the policy and the user context. Never fix either by logging the app in as
`postgres`, or by removing the login check in `src/lib/prisma.ts`. Those are what keep
row-level security switched on.
