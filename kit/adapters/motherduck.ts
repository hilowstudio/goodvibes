import { z } from "zod";
import type { DuckDBInstance as DuckDBInstanceType, DuckDBConnection } from "@duckdb/node-api";
import { ok, err, type Result } from "./result.js";

// MotherDuck is hosted DuckDB. The token is server-side only. Use this for
// read-mostly analytical queries over data already in MotherDuck or cloud storage.
function connectionString(): string {
  const t = process.env["MOTHERDUCK_TOKEN"];
  if (!t) throw new Error("MOTHERDUCK_TOKEN is not set");
  return `md:?motherduck_token=${t}`;
}

/**
 * Run an analytical query and validate each row with the given schema.
 *
 * Safety. This adapter runs whatever SQL it is handed, so:
 * - Never build `sql` by concatenating untrusted input. Pass user-supplied values
 *   through `params`; the driver binds them safely. Put positional placeholders
 *   ($1, $2, ...) in `sql` that line up with the `params` array.
 * - Read-only is NOT enforced here. Enforce it at the credential layer: use a
 *   read-only MotherDuck token (a "read scaling" token), which cannot write whatever
 *   the query says, the same idea as the full-stack variant's non-owner Postgres
 *   role. For extra lockdown `saas_mode=true` also blocks local files and extensions,
 *   but it disables httpfs, so only use it when queries do not read cloud storage.
 * - No built-in timeout by design: OLAP queries can run for seconds to minutes, so a
 *   caller that needs a cutoff should wrap this in a Promise.race.
 *
 * Driver: @duckdb/node-api (neo client):
 *   DuckDBInstance.create(path) -> instance; instance.connect() -> connection;
 *   connection.runAndReadAll(sql, params?) -> reader; reader.getRowObjects() -> rows.
 * getRowObjects() returns the driver's DuckDBValue union; casting to unknown before
 * Zod parse is intentional and type-safe (no any). Targets the default MotherDuck
 * database; use `USE db;` or fully-qualified names to query others.
 */
export async function query<T>(
  sql: string,
  rowSchema: z.ZodType<T>,
  params?: (string | number | bigint | boolean | null)[],
): Promise<Result<T[]>> {
  let instance: DuckDBInstanceType | undefined;
  let connection: DuckDBConnection | undefined;
  try {
    const { DuckDBInstance } = await import("@duckdb/node-api");
    instance = await DuckDBInstance.create(connectionString());
    connection = await instance.connect();
    const reader = params
      ? await connection.runAndReadAll(sql, params)
      : await connection.runAndReadAll(sql);
    const rows: unknown = reader.getRowObjects();
    const parsed = z.array(rowSchema).safeParse(rows);
    if (!parsed.success) return err("MotherDuck returned data in an unexpected shape");
    return ok(parsed.data);
  } catch (error) {
    console.error(error);
    return err("MotherDuck query failed");
  } finally {
    // Close the connection before the instance: closing an instance while a
    // connection is still live is undefined behavior in the driver.
    connection?.closeSync();
    instance?.closeSync();
  }
}
