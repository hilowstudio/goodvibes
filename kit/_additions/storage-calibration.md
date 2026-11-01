## Where data should live

Match the storage to what the data is worth if it leaks or is lost, the same way you
match every other kind of care to the stakes. Pick the lightest option that fits;
only move up when the data needs it.

- If the app runs in the browser and only needs to read a fixed dataset (a dashboard,
  a chart, a presentation), keep the data in the browser, a bundled file queried with
  DuckDB-WASM. No database to set up.
- If the app keeps a small amount of shared data and the person already has a home for
  it, use a light server store, for example their existing Airtable, read and written
  through a small server piece that hides the key. The connect-a-service skill has a
  vetted adapter for this.
- If different people have their own private data, or the data needs real
  relationships and integrity, use Postgres (Supabase). A full-stack project has
  per-user isolation wired in already. A browser-only project has outgrown its setup at
  this point, so say so plainly before going further.

Do not stand up a database for a brochure site or a read-only chart.
