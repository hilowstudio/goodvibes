import { z } from "zod";
import { ok, err, type Result } from "./result.js";

// MotherDuck is hosted DuckDB. The token is server-side only. Use this for
// read-mostly analytical queries over data already in MotherDuck or cloud storage.
function connectionString(): string {
  const t = process.env["MOTHERDUCK_TOKEN"];
  if (!t) throw new Error("MOTHERDUCK_TOKEN is not set");
  return `md:?motherduck_token=${t}`;
}

/**
 * Run a read-only analytical query and validate each row with the given schema.
 *
 * Driver: @duckdb/node-api (neo client). API verified at install time:
 *   DuckDBInstance.create(path) → instance
 *   instance.connect() → connection
 *   connection.runAndReadAll(sql) → DuckDBResultReader
 *   reader.getRowObjects() → Record<string, DuckDBValue>[]
 * getRowObjects() returns the driver's DuckDBValue union type; casting to unknown
 * before Zod parse is intentional and type-safe (no any).
 */
export async function query<T>(sql: string, rowSchema: z.ZodType<T>): Promise<Result<T[]>> {
  try {
    const { DuckDBInstance } = await import("@duckdb/node-api");
    const instance = await DuckDBInstance.create(connectionString());
    const connection = await instance.connect();
    const reader = await connection.runAndReadAll(sql);
    const rows: unknown = reader.getRowObjects();
    const parsed = z.array(rowSchema).safeParse(rows);
    if (!parsed.success) return err("MotherDuck returned data in an unexpected shape");
    return ok(parsed.data);
  } catch {
    return err("MotherDuck query failed");
  }
}
