import * as duckdb from "@duckdb/duckdb-wasm";
import { z } from "zod";
import mvpWasm from "@duckdb/duckdb-wasm/dist/duckdb-mvp.wasm?url";
import mvpWorker from "@duckdb/duckdb-wasm/dist/duckdb-browser-mvp.worker.js?url";
import ehWasm from "@duckdb/duckdb-wasm/dist/duckdb-eh.wasm?url";
import ehWorker from "@duckdb/duckdb-wasm/dist/duckdb-browser-eh.worker.js?url";
import sampleCsv from "@/data/sample.csv?raw";
import { parse } from "@/lib/parse";
import { type Result } from "@/lib/result";

const MANUAL_BUNDLES: duckdb.DuckDBBundles = {
  mvp: { mainModule: mvpWasm, mainWorker: mvpWorker },
  eh: { mainModule: ehWasm, mainWorker: ehWorker },
};

// Validate the RAW DuckDB output at the true edge. `z.coerce.number()` accepts a
// numeric value or numeric string but rejects a non-numeric cell, so a bad value
// fails validation here instead of silently becoming NaN downstream.
const VisitorRows = z.array(
  z.object({ month: z.string(), visitors: z.coerce.number() }),
);
export type VisitorRow = z.infer<typeof VisitorRows>[number];

let dbPromise: Promise<duckdb.AsyncDuckDB> | null = null;

async function getDb(): Promise<duckdb.AsyncDuckDB> {
  if (!dbPromise) {
    dbPromise = (async () => {
      try {
        const bundle = await duckdb.selectBundle(MANUAL_BUNDLES);
        const worker = new Worker(bundle.mainWorker!);
        const db = new duckdb.AsyncDuckDB(new duckdb.ConsoleLogger(), worker);
        await db.instantiate(bundle.mainModule, bundle.pthreadWorker);
        await db.registerFileText("sample.csv", sampleCsv);
        return db;
      } catch (error) {
        // Never cache a rejected promise, or every later retry rejects too.
        dbPromise = null;
        throw error;
      }
    })();
  }
  return dbPromise;
}

export async function queryVisitors(): Promise<Result<VisitorRow[]>> {
  const db = await getDb();
  const conn = await db.connect();
  try {
    const result = await conn.query(
      "SELECT month, visitors FROM read_csv_auto('sample.csv')",
    );
    // Parse the raw Arrow rows so Zod guards the real DuckDB output.
    return parse(VisitorRows, result.toArray());
  } finally {
    await conn.close();
  }
}
