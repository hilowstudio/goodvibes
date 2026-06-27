import * as duckdb from "@duckdb/duckdb-wasm";
import mvpWasm from "@duckdb/duckdb-wasm/dist/duckdb-mvp.wasm?url";
import mvpWorker from "@duckdb/duckdb-wasm/dist/duckdb-browser-mvp.worker.js?url";
import ehWasm from "@duckdb/duckdb-wasm/dist/duckdb-eh.wasm?url";
import ehWorker from "@duckdb/duckdb-wasm/dist/duckdb-browser-eh.worker.js?url";
import sampleCsv from "@/data/sample.csv?raw";

const MANUAL_BUNDLES: duckdb.DuckDBBundles = {
  mvp: { mainModule: mvpWasm, mainWorker: mvpWorker },
  eh: { mainModule: ehWasm, mainWorker: ehWorker },
};

let dbPromise: Promise<duckdb.AsyncDuckDB> | null = null;

async function getDb(): Promise<duckdb.AsyncDuckDB> {
  if (!dbPromise) {
    dbPromise = (async () => {
      const bundle = await duckdb.selectBundle(MANUAL_BUNDLES);
      const worker = new Worker(bundle.mainWorker!);
      const db = new duckdb.AsyncDuckDB(new duckdb.ConsoleLogger(), worker);
      await db.instantiate(bundle.mainModule, bundle.pthreadWorker);
      await db.registerFileText("sample.csv", sampleCsv);
      return db;
    })();
  }
  return dbPromise;
}

export async function queryVisitors(): Promise<Array<{ month: string; visitors: number }>> {
  const db = await getDb();
  const conn = await db.connect();
  try {
    const result = await conn.query("SELECT month, visitors FROM read_csv_auto('sample.csv')");
    return result.toArray().map((row) => ({
      month: String(row.month),
      visitors: Number(row.visitors),
    }));
  } finally {
    await conn.close();
  }
}
