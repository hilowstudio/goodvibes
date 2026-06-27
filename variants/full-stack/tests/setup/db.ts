import { Pool } from "pg";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set`);
  return value;
}

// Owner connection (DIRECT_URL): used for schema reset and seeding.
// Because the table is FORCE RLS, even the owner must set a user context to
// insert; seedNote sets it transaction-locally for the row it plants.
export const ownerPool = new Pool({ connectionString: requireEnv("DIRECT_URL") });

// Non-owner runtime connection: what the app and the keystone test use.
export const runtimePool = new Pool({
  connectionString: requireEnv("RUNTIME_DATABASE_URL"),
});

export async function resetNotes(): Promise<void> {
  await ownerPool.query('TRUNCATE TABLE "notes"');
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

export async function closePools(): Promise<void> {
  await Promise.all([ownerPool.end(), runtimePool.end()]);
}
