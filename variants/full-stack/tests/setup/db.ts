import { Pool } from "pg";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set`);
  return value;
}

// Owner connection (DIRECT_URL): used only to plant and clear test rows. The code
// under test connects through the app's own client (DATABASE_URL), never this pool.
// Because the table is FORCE RLS, even the owner must set a user context to
// insert; seedNote sets it transaction-locally for the row it plants.
const ownerPool = new Pool({ connectionString: requireEnv("DIRECT_URL") });

// Removes only the given users' rows, never the whole table: npm run db:verify runs
// this suite against the real database.
export async function clearNotes(userIds: string[]): Promise<void> {
  await ownerPool.query('DELETE FROM "notes" WHERE "user_id" = ANY($1::uuid[])', [userIds]);
}

export async function seedNote(userId: string, content: string): Promise<void> {
  const client = await ownerPool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT set_config('app.current_user_id', $1::text, true)", [
      userId,
    ]);
    await client.query(
      'INSERT INTO "notes" ("user_id", "content") VALUES ($1, $2)',
      [userId, content],
    );
    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

export async function closePool(): Promise<void> {
  await ownerPool.end();
}
