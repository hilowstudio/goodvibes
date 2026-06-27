# W1.5 — Build-Time Skills + Storage Adapters Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`).

**Goal:** Add the guardrailed external-integration layer to the GoodVibes plugin: a `connect-a-service` skill (conducts any third-party integration in plain language under the rules already in CLAUDE.md), a `set-up-services` skill (guided Supabase + Inngest provisioning), and two vetted server storage adapters (Airtable, MotherDuck) that realize the "lighter server storage rung" the storage-calibration rule references.

**Architecture:** The two skills are plugin `skills/<name>/SKILL.md` (auto-discovered, invoked on intent). The adapters live in `kit/adapters/` as a tiny standalone TypeScript package (typechecked + linted in CI) so they stay real and honest; `connect-a-service` copies/adapts them into the client project when the conversation calls for them. The CLAUDE.md integration-guardrail and storage-calibration rules (shipped in W1) are the always-on policy these skills enact.

**Tech Stack:** Claude Code plugin skills (SKILL.md), TypeScript (the adapters), Zod, `@duckdb/node-api` (MotherDuck), `fetch` (Airtable).

**Builds on:** W1 (the plugin, both variants, the CLAUDE.md additions). The adapters use the same `Result` shape + Zod-at-the-edge conventions as the variants.

## Global Constraints

- **Least privilege, loudly.** Read-only by default; write/delete is a deliberate, named confirmation. (Airtable PATs make this concrete: a read-only token uses only `data.records:read`.)
- **Secrets server-side only.** Tokens come from server env (`AIRTABLE_TOKEN`, `MOTHERDUCK_TOKEN`); never in the browser. A client-only app that wants one of these has outgrown client-only and needs a small server piece.
- **Untrusted responses.** Every adapter Zod-validates the external response before returning it, returns the `{ ok } | { ok: false; error }` Result shape, and times out.
- **TypeScript strict**, no `any`. Voice floor on all skill prose (sentence case, no em dashes, concrete).
- **The skills enact the CLAUDE.md rules; they don't restate policy the model already has.** They give the plain-language flow and point at the vetted adapter code.

> **Verified API forms (2026-06-27):** Airtable Web API uses a personal access token as `Authorization: Bearer`, scopes `data.records:read`/`data.records:write`, endpoint `https://api.airtable.com/v0/{baseId}/{table}` (list max 100/page with `offset` pagination; POST to create). MotherDuck is queried server-side via the DuckDB Node driver with an `md:` connection string carrying the token. The exact DuckDB Node driver package name/API is the one verify-at-build item (Task 2).

---

### Task 1: `kit/adapters/` package + the Airtable adapter

**Files:**
- Create `kit/adapters/package.json`, `kit/adapters/tsconfig.json`, `kit/adapters/.oxlintrc.json`
- Create `kit/adapters/result.ts` (the shared Result shape, mirrors the variants)
- Create `kit/adapters/airtable.ts`

- [ ] **Step 1: `kit/adapters/package.json`**
```json
{
  "name": "goodvibes-adapters",
  "private": true,
  "type": "module",
  "scripts": { "typecheck": "tsc --noEmit", "lint": "oxlint" },
  "dependencies": { "zod": "^3.24.0" },
  "devDependencies": { "@types/node": "^22.0.0", "oxlint": "^1.0.0", "typescript": "^5.7.0" }
}
```

- [ ] **Step 2: `kit/adapters/tsconfig.json`** (strict, ESM)
```json
{
  "compilerOptions": {
    "target": "ES2022", "module": "ESNext", "moduleResolution": "Bundler",
    "strict": true, "exactOptionalPropertyTypes": true, "noUncheckedIndexedAccess": true,
    "noEmit": true, "esModuleInterop": true, "skipLibCheck": true, "lib": ["ES2022", "DOM"]
  },
  "include": ["*.ts"]
}
```
(`.oxlintrc.json`: copy the variants' config.)

- [ ] **Step 3: `kit/adapters/result.ts`**
```ts
export type Result<T> = { ok: true; data: T } | { ok: false; error: string };
export const ok = <T>(data: T): Result<T> => ({ ok: true, data });
export const err = (error: string): Result<never> => ({ ok: false, error });
```

- [ ] **Step 4: `kit/adapters/airtable.ts`** (read-default; explicit create; key server-side; Zod; timeout)
```ts
import { z } from "zod";
import { ok, err, type Result } from "./result";

// The token is read from server-side env only. Create a READ-ONLY personal access
// token (scope data.records:read) by default. Only use a token with
// data.records:write when a feature genuinely needs to create or change records,
// and confirm that with the person first.
const BASE_URL = "https://api.airtable.com/v0";
const TIMEOUT_MS = 10_000;

function token(): string {
  const t = process.env.AIRTABLE_TOKEN;
  if (!t) throw new Error("AIRTABLE_TOKEN is not set");
  return t;
}

async function call(path: string, init?: RequestInit): Promise<Result<unknown>> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${BASE_URL}/${path}`, {
      ...init,
      signal: controller.signal,
      headers: { Authorization: `Bearer ${token()}`, "Content-Type": "application/json", ...init?.headers },
    });
    if (!res.ok) return err(`Airtable request failed (${res.status})`);
    return ok((await res.json()) as unknown);
  } catch {
    return err("Airtable request timed out or failed");
  } finally {
    clearTimeout(timer);
  }
}

const ListResponse = z.object({
  records: z.array(z.object({ id: z.string(), fields: z.record(z.string(), z.unknown()) })),
  offset: z.string().optional(),
});

/** Read records from a table. Read-only; the default and safest operation. */
export async function listRecords(
  baseId: string,
  table: string,
): Promise<Result<Array<{ id: string; fields: Record<string, unknown> }>>> {
  const r = await call(`${baseId}/${encodeURIComponent(table)}`);
  if (!r.ok) return r;
  const parsed = ListResponse.safeParse(r.data);
  if (!parsed.success) return err("Airtable returned data in an unexpected shape");
  return ok(parsed.data.records);
}

/**
 * Create a record. WRITE operation: requires a token with data.records:write and an
 * explicit yes from the person, since it changes their real Airtable data.
 */
export async function createRecord(
  baseId: string,
  table: string,
  fields: Record<string, unknown>,
): Promise<Result<{ id: string }>> {
  const r = await call(`${baseId}/${encodeURIComponent(table)}`, {
    method: "POST",
    body: JSON.stringify({ fields }),
  });
  if (!r.ok) return r;
  const parsed = z.object({ id: z.string() }).safeParse(r.data);
  if (!parsed.success) return err("Airtable returned data in an unexpected shape");
  return ok({ id: parsed.data.id });
}
```

- [ ] **Step 5: Verify** — `cd kit/adapters && npm install && npm run typecheck && npm run lint` all pass.

- [ ] **Step 6: Commit**
```bash
git add kit/adapters/package.json kit/adapters/tsconfig.json kit/adapters/.oxlintrc.json kit/adapters/result.ts kit/adapters/airtable.ts kit/adapters/package-lock.json
git commit -m "feat(adapters): Airtable server adapter (read-default, Zod, Result, timeout)"
```

---

### Task 2: MotherDuck adapter

**Files:**
- Modify `kit/adapters/package.json` (add the DuckDB Node driver dep)
- Create `kit/adapters/motherduck.ts`

> **Verify-at-build:** confirm the current DuckDB Node driver package and its async query API. Try `@duckdb/node-api` first (the modern Neo client). The `md:` connection string carries the token: `md:?motherduck_token=<token>`. If the native package fails to install/typecheck on this machine, note it and fall back to typing the adapter against a minimal local interface (documented), reporting what you did.

- [ ] **Step 1: Add the dep** — `cd kit/adapters && npm install @duckdb/node-api`

- [ ] **Step 2: `kit/adapters/motherduck.ts`**
```ts
import { z } from "zod";
import { ok, err, type Result } from "./result";

// MotherDuck is hosted DuckDB. The token is server-side only. Use this for
// read-mostly analytical queries over data already in MotherDuck or cloud storage.
function connectionString(): string {
  const t = process.env.MOTHERDUCK_TOKEN;
  if (!t) throw new Error("MOTHERDUCK_TOKEN is not set");
  return `md:?motherduck_token=${t}`;
}

/**
 * Run a read-only analytical query and validate each row with the given schema.
 * Adjust the import + instance/connection calls to the installed DuckDB Node driver
 * (see the verify-at-build note); the shape below is the intended contract.
 */
export async function query<T>(sql: string, rowSchema: z.ZodType<T>): Promise<Result<T[]>> {
  try {
    const { DuckDBInstance } = await import("@duckdb/node-api");
    const instance = await DuckDBInstance.create(connectionString());
    const connection = await instance.connect();
    const reader = await connection.runAndReadAll(sql);
    const rows = reader.getRowObjects();
    const parsed = z.array(rowSchema).safeParse(rows);
    if (!parsed.success) return err("MotherDuck returned data in an unexpected shape");
    return ok(parsed.data);
  } catch {
    return err("MotherDuck query failed");
  }
}
```

- [ ] **Step 3: Verify** — `npm run typecheck && npm run lint` pass. Report whether `@duckdb/node-api` installed cleanly and whether the `DuckDBInstance`/`runAndReadAll`/`getRowObjects` API matched (adjust to the installed version if not).

- [ ] **Step 4: Commit**
```bash
git add kit/adapters/package.json kit/adapters/package-lock.json kit/adapters/motherduck.ts
git commit -m "feat(adapters): MotherDuck server query adapter (token server-side, Zod, Result)"
```

---

### Task 3: `connect-a-service` skill

**Files:**
- Create `skills/connect-a-service/SKILL.md`

- [ ] **Step 1: `skills/connect-a-service/SKILL.md`** (frontmatter + the plain-language flow; voice floor)
```markdown
---
description: Use when the person wants to connect an outside service to their app (pull in their Airtable, take payments, send emails, call another app's API). Conducts the integration safely in plain language.
---

The person wants to connect an outside service. Conduct it in plain language and keep
it safe. The rules in CLAUDE.md ("Connecting outside services") are the policy; this
is how you carry it out.

## 1. Name what is being connected and why
Say, in one or two plain sentences, what service you are connecting and what it will
do. Ask what data they want to read or change.

## 2. Default to read-only
Set up read access first. Only set up write or delete access if the feature genuinely
needs it, and confirm it explicitly by naming what could change: "This lets the app
change and delete rows in your real Airtable. Do you want that, or just read?" Wait
for a yes.

## 3. Keep the key on the server
The service's key or token goes in a server-side environment variable, never in the
browser. If this is a browser-only project, connecting a service with a key means it
has outgrown browser-only. Say so plainly, and add a small server piece (a single
serverless function, or move to the full-stack setup) so the key stays hidden. Do not
put the key in client code.

## 4. Use a vetted adapter
For Airtable, copy `${CLAUDE_PLUGIN_ROOT}/kit/adapters/airtable.ts` into the project's
server code (e.g. `src/lib/airtable.ts`) and call it from a Server Action or route. It
reads `AIRTABLE_TOKEN` from the server, validates responses with Zod, returns the
project's Result shape, and times out. Tell the person to create a read-only personal
access token (scope `data.records:read`) and add it to their env; only ask for a
write-scoped token when a write feature is confirmed.

For hosted analytical data (querying large datasets that live in the cloud), use
`${CLAUDE_PLUGIN_ROOT}/kit/adapters/motherduck.ts` the same way, with
`MOTHERDUCK_TOKEN` server-side.

For any other service, follow the same shape: a small server module that reads the key
from env, validates the response with Zod, returns a Result, and has a timeout. Prefer
a normal API call over a heavier integration.

## 5. Add the env var to .env.example
Add the new variable name (with a placeholder, no real value) to `.env.example` so the
next person knows it is needed, and confirm the real value is only in `.env` (which
git ignores).
```

- [ ] **Step 2: Verify** — file exists; frontmatter has `description`; 0 em dashes (`grep -c "—"`); references the two adapters by `${CLAUDE_PLUGIN_ROOT}` path.

- [ ] **Step 3: Commit**
```bash
git add skills/connect-a-service
git commit -m "feat(skill): connect-a-service guardrailed integration conductor"
```

---

### Task 4: `set-up-services` skill

**Files:**
- Create `skills/set-up-services/SKILL.md`

- [ ] **Step 1: `skills/set-up-services/SKILL.md`** (guided Supabase + Inngest provisioning; voice floor)
```markdown
---
description: Use when a full-stack GoodVibes project needs its backend connected for the first time. Walks the person through creating a Supabase project and an Inngest app and putting the keys in place safely.
---

A full-stack project does not run until its database and background-jobs service are
connected. Walk the person through it in plain language. They do not need to
understand the parts; give them one clear step at a time and wait.

## Supabase (database and accounts)
1. Have them create a free project at supabase.com and wait for it to finish setting
   up. (If the Supabase CLI or MCP is available in this environment, you can do more
   of this for them; otherwise guide the click-through.)
2. From the project's API settings, get the project URL and the anon key. Put them in
   a local `.env` file as `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
   These two are safe to expose. Do not put the service-role key in the app.
3. From the project's database settings, get the connection strings. Set `DATABASE_URL`
   to the transaction pooler URL (port 6543) and keep `?pgbouncer=true` on it. Set
   `DIRECT_URL` to the direct connection (port 5432). Both go in `.env`, never in git.
4. Apply the database setup: run the migrations in `prisma/migrations/` and the runtime
   role in `prisma/sql/runtime-role.sql` against the direct connection (the file's
   comment explains the one password setting it needs). Then set `RUNTIME_DATABASE_URL`
   to a connection string for the `app_runtime` role.

## Inngest (background jobs)
1. Have them create an Inngest account and an app.
2. Get the event key and signing key and put them in `.env` as `INNGEST_EVENT_KEY` and
   `INNGEST_SIGNING_KEY`.
3. For local development, the Inngest dev server runs the jobs without these keys.

## Check it
Confirm `.env` has every variable from `.env.example` filled in, that `.env` is git
ignored, and that no key is in any file that ships to the browser. Then run the app.
```

- [ ] **Step 2: Verify** — file exists; frontmatter `description`; 0 em dashes; the env var names match the full-stack variant's `.env.example`.

- [ ] **Step 3: Commit**
```bash
git add skills/set-up-services
git commit -m "feat(skill): set-up-services guided Supabase and Inngest provisioning"
```

---

### Task 5: Wire it in (CI job + version + README)

**Files:**
- Modify `.github/workflows/ci.yml` (add an adapters job)
- Modify `.claude-plugin/plugin.json` (version 0.2.0)
- Modify `README.md` (short note on the build-time skills)

- [ ] **Step 1: Add an `adapters` job to `.github/workflows/ci.yml`**
```yaml
  adapters:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: kit/adapters
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: npm, cache-dependency-path: kit/adapters/package-lock.json }
      - run: npm ci
      - run: npm run typecheck
      - run: npm run lint
```

- [ ] **Step 2: Bump `.claude-plugin/plugin.json`** version to `"0.2.0"`.

- [ ] **Step 3: Add a short README section** ("Build-time skills") noting that, while building, Claude can guide the person through connecting outside services (`connect-a-service`, with vetted Airtable and MotherDuck adapters) and setting up Supabase + Inngest (`set-up-services`), and that these run automatically when the conversation calls for them. Voice floor, no em dashes.

- [ ] **Step 4: Verify** — `cd kit/adapters && npm run typecheck && npm run lint` pass; plugin.json is valid JSON at 0.2.0; README has 0 em dashes in the new section; YAML valid by eye.

- [ ] **Step 5: Commit**
```bash
git add .github/workflows/ci.yml .claude-plugin/plugin.json README.md
git commit -m "ci+docs(plugin): adapters CI job, version 0.2.0, build-time skills in README"
```

---

## Self-Review

**1. Spec coverage (spec §9 C+D + the lighter storage rung):** connect-a-service skill — Task 3. set-up-services skill — Task 4. Airtable adapter (the in-between server storage rung) — Task 1. MotherDuck adapter — Task 2. CI/version/README wiring — Task 5. ✓

**2. Placeholder scan:** The MotherDuck driver API is an explicit verify-at-build (Task 2) with the intended contract written and a documented fallback, not a TODO. The skills give concrete steps, not vague guidance.

**3. Consistency:** The adapters reuse the variants' `Result` shape + Zod-at-the-edge. The skills enact the CLAUDE.md integration-guardrail + storage-calibration rules rather than restating them. The Airtable read-only-default maps to the `data.records:read` PAT scope.

**4. Risks:** `@duckdb/node-api` native install on CI (Task 2 verify note + fallback). The skills are prose (no build/test) so their review is for guardrail fidelity + voice floor + accuracy to the variants.
