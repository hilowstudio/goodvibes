## Where data should live

Match the storage to what the data is worth if it leaks or is lost, the same way you
match every other kind of care to the stakes. Pick the lightest option that fits;
only move up when the data needs it.

- If the app runs in the browser and only needs to read a fixed dataset (a dashboard,
  a chart, a presentation), keep the data in the browser, a bundled file queried with
  DuckDB-WASM. No database to set up.
- If different people have their own private data, or the data needs real
  relationships and integrity, use Postgres (Supabase) with the per-user isolation
  already wired into this project.
- In between sits a light server store (for example, the person's existing Airtable,
  read and written through a small server piece that hides the key). That option is
  added in a later step of this system; until then, if an app needs to save data on a
  server at all, use the Postgres setup even if it feels heavier than the job strictly
  needs. Do not stand up a database for a brochure site or a read-only chart.
