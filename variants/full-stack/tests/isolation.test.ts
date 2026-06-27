import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { runtimePool, seedNote, resetNotes, closePools } from "./setup/db";

const USER_A = "11111111-1111-1111-1111-111111111111";
const USER_B = "22222222-2222-2222-2222-222222222222";

async function asUser<T>(
  userId: string,
  run: (q: (sql: string, params?: unknown[]) => Promise<{ rows: unknown[] }>) => Promise<T>,
): Promise<T> {
  const client = await runtimePool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT set_config('app.current_user_id', $1::text, true)", [userId]);
    const result = await run((sql, params) => client.query(sql, params));
    await client.query("COMMIT");
    return result;
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

describe("tenant isolation (keystone)", () => {
  beforeEach(async () => {
    await resetNotes();
    await seedNote(USER_B, "user B private note");
  });

  afterAll(async () => {
    await closePools();
  });

  it("non-vacuity: runtime role is non-owner, non-superuser, non-bypassrls", async () => {
    const client = await runtimePool.connect();
    try {
      const { rows } = await client.query<{
        usename: string;
        usesuper: boolean;
        usebypassrls: boolean;
      }>(
        "SELECT usename, usesuper, usebypassrls FROM pg_user WHERE usename = current_user",
      );
      expect(rows[0]?.usename).toBe("app_runtime");
      expect(rows[0]?.usesuper).toBe(false);
      expect(rows[0]?.usebypassrls).toBe(false);
    } finally {
      client.release();
    }
  });

  it("denies: user A sees zero of user B's rows", async () => {
    const rows = await asUser(USER_A, async (q) => {
      const r = await q('SELECT "id" FROM "notes"');
      return r.rows;
    });
    expect(rows).toHaveLength(0);
  });

  it("positive control: user B sees their own row", async () => {
    const rows = await asUser(USER_B, async (q) => {
      const r = await q('SELECT "id" FROM "notes"');
      return r.rows;
    });
    expect(rows).toHaveLength(1);
  });

  it("fail-closed: with no context set, zero rows are visible", async () => {
    const client = await runtimePool.connect();
    try {
      const { rows } = await client.query('SELECT "id" FROM "notes"');
      expect(rows).toHaveLength(0);
    } finally {
      client.release();
    }
  });
});
