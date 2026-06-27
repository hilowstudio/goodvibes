# W1 — Full-Stack Fortress Core Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the per-user data-isolation fortress for the GoodVibes full-stack variant — the scoped data-access wrapper, RLS enforced by a non-owner database role, and a cross-user denial test that proves "user A cannot read user B's data," all green in CI.

**Architecture:** A `variants/full-stack/` app skeleton inside the GoodVibes plugin repo. Prisma talks to Postgres through the `pg` driver adapter. Every data access runs inside a transaction that `set_config('app.current_user_id', <id>, true)` (transaction-local, i.e. `SET LOCAL` semantics); RLS policies read that setting via `current_setting('app.current_user_id', true)` and fail closed when it is null. The runtime connects as a dedicated role without `BYPASSRLS` and without superuser, so RLS is a real floor, not advisory. The keystone test connects as that runtime role and asserts denial.

**Tech Stack:** Next.js 16 (App Router) project shell, TypeScript strict, Prisma 6 + `@prisma/adapter-pg`, `pg` (node-postgres), Vitest, Postgres 16, GitHub Actions.

## Global Constraints

(Every task implicitly includes these. Values copied verbatim from the spec.)

- **Node.js 24 LTS preferred; Next 16's real floor is Node 20.9 — do not break a working Node 20/22 LTS setup.** Do not add an `engines` field that fails Node 20/22.
- **TypeScript strict**, with `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`, and no surviving `any`.
- **Runtime DB connection uses the transaction pooler (port 6543) with `?pgbouncer=true`** (disables Prisma named prepared statements; Supavisor transaction mode does not support them). `DIRECT_URL` (port 5432) is migrations-only. Both appear in `.env.example` with comments; the *why* is recorded in `DECISIONS.md`.
- **Per-user isolation is the default.** `new PrismaClient()` appears exactly once in the whole variant. There is no way to obtain an unscoped client by accident.
- **Secrets stay server-side.** No secret behind a `NEXT_PUBLIC_` prefix; real secrets never committed.
- **Fail closed:** RLS policies deny when `app.current_user_id` is unset (null context → zero rows).
- **The keystone test is non-negotiable and lives at the fixed path `tests/isolation.test.ts`.** The scoped wrapper lives at the fixed path `src/lib/db.ts`.

> **Verified against current docs (2026-06-26):** `@prisma/adapter-pg` with `new PrismaPg({ connectionString })` + `new PrismaClient({ adapter })` is correct (Prisma 6.16+). Driver adapters are GA — no `previewFeatures` flag; this plan uses the GA `provider = "prisma-client"` generator with an `output` path, so `PrismaClient`/`Prisma` import from `@/generated/prisma/client`. `set_config(...)` must cast its value `::text`. Next 16 requires an explicit root layout for `next build`. The only item left to confirm at build is the exact generated entry-file path after `prisma generate` (Task 3 note), with `prisma-client-js` + `@prisma/client` as the documented fallback.
>
> **Execution mode for this build: LOCAL GIT, NO REMOTE.** Initialize a local git repo and commit per task (no push, no GitHub) so the per-task reviews and recovery ledger work. Note: the DB-backed tests (Tasks 8-10) execute in CI or against a local Postgres; with no local Postgres they are authored, typechecked, and committed now, and run green once a remote + CI (or a local DB) is available.

---

### Task 1: Full-stack project scaffold (config)

**Files:**
- Create: `variants/full-stack/package.json`
- Create: `variants/full-stack/tsconfig.json`
- Create: `variants/full-stack/.env.example`
- Create: `variants/full-stack/.gitignore`
- Create: `variants/full-stack/src/app/layout.tsx`
- Create: `variants/full-stack/src/app/page.tsx`

**Interfaces:**
- Consumes: nothing (first task).
- Produces: an installable workspace with scripts `test`, `typecheck`, `prisma:generate`; env var names `DATABASE_URL` (runtime, pooled) and `DIRECT_URL` (migrations/owner) plus the test-only `RUNTIME_DATABASE_URL` (non-owner role).

- [ ] **Step 1: Create `variants/full-stack/package.json`**

```json
{
  "name": "goodvibes-fullstack",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "prisma:generate": "prisma generate",
    "db:deploy": "prisma migrate deploy"
  },
  "dependencies": {
    "@prisma/adapter-pg": "^6.16.0",
    "@prisma/client": "^6.16.0",
    "next": "^16.0.0",
    "pg": "^8.13.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "server-only": "^0.0.1",
    "zod": "^3.24.0"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "@types/pg": "^8.11.0",
    "@types/react": "^19.0.0",
    "prisma": "^6.16.0",
    "typescript": "^5.7.0",
    "vitest": "^2.1.0"
  }
}
```

- [ ] **Step 2: Create `variants/full-stack/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "exactOptionalPropertyTypes": true,
    "noUncheckedIndexedAccess": true,
    "noEmit": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["src", "tests", "next-env.d.ts", "**/*.ts", "**/*.tsx"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 3: Create `variants/full-stack/.env.example`**

```bash
# Runtime connection: Supabase TRANSACTION POOLER (port 6543).
# ?pgbouncer=true is REQUIRED — it disables Prisma's named prepared statements,
# which the pooler's transaction mode does not support. Removing it causes
# intermittent "prepared statement already exists" errors under concurrency.
DATABASE_URL="postgresql://USER:PASSWORD@HOST:6543/postgres?pgbouncer=true"

# Direct connection (port 5432). MIGRATIONS ONLY. Runs as the table owner.
DIRECT_URL="postgresql://USER:PASSWORD@HOST:5432/postgres"

# Non-owner runtime role used by the app at request time and by the keystone test.
# Has CRUD grants but NO BYPASSRLS and is NOT superuser, so RLS actually applies.
RUNTIME_DATABASE_URL="postgresql://app_runtime:PASSWORD@HOST:5432/postgres"
```

- [ ] **Step 4: Create `variants/full-stack/.gitignore`**

```gitignore
node_modules/
.next/
.env
.env*.local
*.tsbuildinfo
next-env.d.ts
src/generated/
```

- [ ] **Step 5: Create the required Next.js root layout and a placeholder page**

Next 16 `next build` fails without a root layout containing `<html>`/`<body>` (it is auto-created only for `next dev`, not `build`).

`variants/full-stack/src/app/layout.tsx`:
```tsx
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
```

`variants/full-stack/src/app/page.tsx`:
```tsx
export default function Page() {
  return <h1>GoodVibes full-stack starter</h1>;
}
```

- [ ] **Step 6: Install and verify typecheck + build**

Run: `cd variants/full-stack && npm install && npm run typecheck && npm run build`
Expected: install succeeds; `tsc --noEmit` exits 0; `next build` completes (root layout present).

- [ ] **Step 7: Commit**

```bash
git add variants/full-stack/package.json variants/full-stack/tsconfig.json variants/full-stack/.env.example variants/full-stack/.gitignore variants/full-stack/src/app
git commit -m "feat(full-stack): scaffold project config, env, and root layout"
```

---

### Task 2: Result helpers (TDD)

**Files:**
- Create: `variants/full-stack/src/lib/result.ts`
- Test: `variants/full-stack/tests/result.test.ts`

**Interfaces:**
- Produces: `type Result<T> = { ok: true; data: T } | { ok: false; error: string }`; `ok<T>(data: T): Result<T>`; `err(error: string): Result<never>`.

- [ ] **Step 1: Write the failing test** — `variants/full-stack/tests/result.test.ts`

```ts
import { describe, it, expect } from "vitest";
import { ok, err, type Result } from "@/lib/result";

describe("result", () => {
  it("ok wraps data in a success result", () => {
    const r: Result<number> = ok(42);
    expect(r).toEqual({ ok: true, data: 42 });
  });

  it("err wraps a message in a failure result", () => {
    const r = err("nope");
    expect(r).toEqual({ ok: false, error: "nope" });
  });

  it("narrows on the ok discriminant", () => {
    const r: Result<string> = ok("hi");
    if (r.ok) {
      expect(r.data.toUpperCase()).toBe("HI");
    } else {
      throw new Error("should be ok");
    }
  });
});
```

- [ ] **Step 2: Add a minimal `vitest.config.ts` so the `@/` alias resolves** — `variants/full-stack/vitest.config.ts`

```ts
import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

export default defineConfig({
  resolve: { alias: { "@": resolve(__dirname, "src") } },
  test: { environment: "node" },
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npm test -- result`
Expected: FAIL — cannot resolve `@/lib/result` (module not found).

- [ ] **Step 4: Write the minimal implementation** — `variants/full-stack/src/lib/result.ts`

```ts
export type Result<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export function ok<T>(data: T): Result<T> {
  return { ok: true, data };
}

export function err(error: string): Result<never> {
  return { ok: false, error };
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npm test -- result`
Expected: PASS (3 tests).

- [ ] **Step 6: Commit**

```bash
git add variants/full-stack/src/lib/result.ts variants/full-stack/tests/result.test.ts variants/full-stack/vitest.config.ts
git commit -m "feat(full-stack): add Result discriminated-union helpers"
```

---

### Task 3: Prisma schema, Note model, and the single client

**Files:**
- Create: `variants/full-stack/prisma/schema.prisma`
- Create: `variants/full-stack/src/lib/prisma.ts`

**Interfaces:**
- Consumes: env `DATABASE_URL`, `DIRECT_URL`.
- Produces: a generated Prisma client; a `Note` model `{ id: uuid pk, userId: uuid, content: text, createdAt: timestamptz }` mapped to table `notes` with column `user_id`; the single client export `prisma` from `src/lib/prisma.ts`.

- [ ] **Step 1: Create `variants/full-stack/prisma/schema.prisma`**

```prisma
generator client {
  provider = "prisma-client"
  output   = "../src/generated/prisma"
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}

model Note {
  id        String   @id @default(uuid()) @db.Uuid
  userId    String   @map("user_id") @db.Uuid
  content   String
  createdAt DateTime @default(now()) @map("created_at") @db.Timestamptz(6)

  @@index([userId])
  @@map("notes")
}
```

- [ ] **Step 2: Generate the client**

Run: `cd variants/full-stack && npm run prisma:generate`
Expected: "Generated Prisma Client" succeeds.

- [ ] **Step 3: Create the single client** — `variants/full-stack/src/lib/prisma.ts`

```ts
import "server-only";
// The GA "prisma-client" generator emits to src/generated/prisma; the current
// generator emits `client.ts`, so import from "@/generated/prisma/client".
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// The ONE PrismaClient in the entire variant. Do not instantiate another.
// Runtime uses the pooled DATABASE_URL (port 6543, ?pgbouncer=true).
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });

export const prisma = new PrismaClient({ adapter });
```

> Verify-at-build: after `prisma generate`, check the generated output under
> `src/generated/prisma` and adjust the import if the entry file differs. If the new
> `prisma-client` generator causes toolchain friction, the documented fallback is
> `provider = "prisma-client-js"` (no `previewFeatures` — driver adapters are GA),
> which imports `PrismaClient` from `@prisma/client`.

- [ ] **Step 4: Typecheck**

Run: `npm run typecheck`
Expected: exits 0.

- [ ] **Step 5: Commit**

```bash
git add variants/full-stack/prisma/schema.prisma variants/full-stack/src/lib/prisma.ts variants/full-stack/package.json variants/full-stack/package-lock.json
git commit -m "feat(full-stack): add Note model and the single Prisma client via pg adapter"
```

---

### Task 4: Initial migration — the `notes` table

**Files:**
- Create: `variants/full-stack/prisma/migrations/0001_init/migration.sql`
- Create: `variants/full-stack/prisma/migrations/migration_lock.toml`

**Interfaces:**
- Produces: a `notes` table that the RLS migration (Task 5) and the test harness (Task 7) depend on.

- [ ] **Step 1: Create `variants/full-stack/prisma/migrations/migration_lock.toml`**

```toml
provider = "postgresql"
```

- [ ] **Step 2: Create `variants/full-stack/prisma/migrations/0001_init/migration.sql`**

```sql
CREATE TABLE "notes" (
  "id"         uuid        NOT NULL DEFAULT gen_random_uuid(),
  "user_id"    uuid        NOT NULL,
  "content"    text        NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "notes_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "notes_user_id_idx" ON "notes" ("user_id");
```

- [ ] **Step 3: Commit**

```bash
git add variants/full-stack/prisma/migrations
git commit -m "feat(full-stack): initial migration for notes table"
```

---

### Task 5: RLS migration — enable, force, fail-closed per-user policies

**Files:**
- Create: `variants/full-stack/prisma/migrations/0002_rls/migration.sql`

**Interfaces:**
- Consumes: the `notes` table (Task 4).
- Produces: RLS enabled + forced on `notes`; four policies keyed on `current_setting('app.current_user_id', true)::uuid`, which is null (→ zero rows) when context is unset.

- [ ] **Step 1: Create `variants/full-stack/prisma/migrations/0002_rls/migration.sql`**

```sql
ALTER TABLE "notes" ENABLE ROW LEVEL SECURITY;
-- FORCE so the table owner is also subject to RLS (owners bypass plain RLS).
ALTER TABLE "notes" FORCE ROW LEVEL SECURITY;

-- Fail closed: current_setting(..., true) returns NULL when unset, and
-- "user_id = NULL" is never true, so an unset context sees zero rows.
CREATE POLICY "notes_select_own" ON "notes"
  FOR SELECT
  USING ("user_id" = current_setting('app.current_user_id', true)::uuid);

CREATE POLICY "notes_insert_own" ON "notes"
  FOR INSERT
  WITH CHECK ("user_id" = current_setting('app.current_user_id', true)::uuid);

CREATE POLICY "notes_update_own" ON "notes"
  FOR UPDATE
  USING ("user_id" = current_setting('app.current_user_id', true)::uuid)
  WITH CHECK ("user_id" = current_setting('app.current_user_id', true)::uuid);

CREATE POLICY "notes_delete_own" ON "notes"
  FOR DELETE
  USING ("user_id" = current_setting('app.current_user_id', true)::uuid);
```

- [ ] **Step 2: Commit**

```bash
git add variants/full-stack/prisma/migrations/0002_rls
git commit -m "feat(full-stack): force RLS with fail-closed per-user policies on notes"
```

---

### Task 6: Runtime non-owner role provisioning SQL

**Files:**
- Create: `variants/full-stack/prisma/sql/runtime-role.sql`

**Interfaces:**
- Consumes: the `notes` table (Task 4).
- Produces: a role `app_runtime` with `LOGIN`, `NOSUPERUSER`, `NOBYPASSRLS`, `NOCREATEDB`, `NOCREATEROLE`, and CRUD grants on `notes`. Idempotent. Applied as owner in CI (Task 10) and later by the W1.5 set-up-services skill against Supabase.

- [ ] **Step 1: Create `variants/full-stack/prisma/sql/runtime-role.sql`**

```sql
-- Run as the table owner / a privileged role. Idempotent.
-- Password is provided by the caller via psql variable :'runtime_password'.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_runtime') THEN
    EXECUTE format(
      'CREATE ROLE app_runtime LOGIN PASSWORD %L NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE',
      current_setting('goodvibes.runtime_password')
    );
  END IF;
END
$$;

GRANT USAGE ON SCHEMA public TO app_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON "notes" TO app_runtime;
-- No table ownership, no BYPASSRLS: RLS is a real floor for this role.
```

> The password is passed via a session GUC the caller sets, e.g.
> `psql -c "SET goodvibes.runtime_password = '...';" -f runtime-role.sql` (CI wires
> this in Task 10). This keeps the password out of the committed file.

- [ ] **Step 2: Commit**

```bash
git add variants/full-stack/prisma/sql/runtime-role.sql
git commit -m "feat(full-stack): idempotent non-owner runtime role provisioning"
```

---

### Task 7: Test harness — owner and runtime connections + reset

**Files:**
- Create: `variants/full-stack/tests/setup/db.ts`

**Interfaces:**
- Consumes: env `DIRECT_URL` (owner) and `RUNTIME_DATABASE_URL` (non-owner).
- Produces: `ownerPool` (`pg.Pool` as owner), `runtimePool` (`pg.Pool` as `app_runtime`), `resetNotes()` (truncates as owner), `seedNote(userId, content)` (inserts as owner, bypassing RLS via FORCE? no — owner is forced too, so seed sets context). See Step 1.

- [ ] **Step 1: Create `variants/full-stack/tests/setup/db.ts`**

```ts
import { Pool } from "pg";

// Owner connection (DIRECT_URL): used for schema reset and seeding.
// Because the table is FORCE RLS, even the owner must set a user context to
// insert; seedNote sets it transaction-locally for the row it plants.
export const ownerPool = new Pool({ connectionString: process.env.DIRECT_URL });

// Non-owner runtime connection: what the app and the keystone test use.
export const runtimePool = new Pool({
  connectionString: process.env.RUNTIME_DATABASE_URL,
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
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: exits 0.

- [ ] **Step 3: Commit**

```bash
git add variants/full-stack/tests/setup/db.ts
git commit -m "test(full-stack): add owner/runtime pg pools and seed/reset helpers"
```

---

### Task 8: The keystone cross-user denial test (TDD)

**Files:**
- Create: `variants/full-stack/tests/isolation.test.ts`

**Interfaces:**
- Consumes: `runtimePool`, `seedNote`, `resetNotes`, `closePools` (Task 7); the RLS policies (Task 5); the runtime role (Task 6).
- Produces: the non-negotiable proof. Asserts (a) non-vacuity: the test connects as a non-owner, non-superuser, non-bypassrls role; (b) denial: user A sees zero of user B's rows; (c) positive control: user B sees their own row.

- [ ] **Step 1: Write the test** — `variants/full-stack/tests/isolation.test.ts`

```ts
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
```

- [ ] **Step 2: Run the test to verify it fails (no DB / role yet, locally)**

Run: `npm test -- isolation`
Expected: FAIL — connection refused, or role `app_runtime` does not exist (the DB and role are provisioned in CI, Task 10; locally this fails until a Postgres + role is available). This confirms the test is wired and not silently passing.

- [ ] **Step 3: Provision a local Postgres to make it pass (optional local loop)**

Run (requires a local Postgres 16 reachable via `DIRECT_URL`):
```bash
psql "$DIRECT_URL" -f prisma/migrations/0001_init/migration.sql
psql "$DIRECT_URL" -f prisma/migrations/0002_rls/migration.sql
psql "$DIRECT_URL" -c "SET goodvibes.runtime_password = 'localpw';" -f prisma/sql/runtime-role.sql
RUNTIME_DATABASE_URL="postgresql://app_runtime:localpw@HOST:5432/postgres" npm test -- isolation
```
Expected: PASS (4 tests). If you cannot run Postgres locally, skip to Task 10 and rely on CI.

- [ ] **Step 4: Commit**

```bash
git add variants/full-stack/tests/isolation.test.ts
git commit -m "test(full-stack): keystone cross-user denial test with non-vacuity guard"
```

---

### Task 9: The scoped data-access wrapper (TDD)

**Files:**
- Create: `variants/full-stack/src/lib/db.ts`
- Test: `variants/full-stack/tests/db.test.ts`

**Interfaces:**
- Consumes: `prisma` (Task 3); the RLS context mechanism (Task 5); the runtime role (Task 6).
- Produces: `runScoped<T>(userId: string, work: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T>` — opens a transaction, sets `app.current_user_id` transaction-locally, runs `work`, commits. This is the only way app code reads or writes tenant data.

- [ ] **Step 1: Write the failing test** — `variants/full-stack/tests/db.test.ts`

```ts
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { runScoped } from "@/lib/db";
import { resetNotes, seedNote, closePools } from "./setup/db";

const USER_A = "11111111-1111-1111-1111-111111111111";
const USER_B = "22222222-2222-2222-2222-222222222222";

describe("runScoped", () => {
  beforeEach(async () => {
    await resetNotes();
    await seedNote(USER_B, "user B note");
  });

  afterAll(async () => {
    await closePools();
  });

  it("scopes reads to the given user (sees own, not others')", async () => {
    await runScoped(USER_A, async (tx) => {
      const a = await tx.note.findMany();
      expect(a).toHaveLength(0);
    });
    await runScoped(USER_B, async (tx) => {
      const b = await tx.note.findMany();
      expect(b).toHaveLength(1);
    });
  });
});
```

> This test requires the runtime client to connect as `app_runtime`. In CI
> (Task 10) `DATABASE_URL` for the test job points at the non-owner role over the
> direct port (no pooler needed in CI). Locally, set `DATABASE_URL` to the
> `app_runtime` DSN before running.

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- db.test`
Expected: FAIL — `runScoped` is not defined / not exported from `@/lib/db`.

- [ ] **Step 3: Write the implementation** — `variants/full-stack/src/lib/db.ts`

```ts
import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * The ONLY way to read or write tenant data. Opens a transaction, sets the
 * per-user RLS context transaction-locally (SET LOCAL semantics), runs `work`,
 * and commits. RLS denies anything outside the user's rows even if `work` forgets
 * to filter — the wrapper and the database policy fail independently.
 */
export async function runScoped<T>(
  userId: string,
  work: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.current_user_id', ${String(userId)}::text, true)`;
    return work(tx);
  });
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run (with `DATABASE_URL` pointing at the `app_runtime` role): `npm test -- db.test`
Expected: PASS. (In CI this runs as part of the suite, Task 10.)

- [ ] **Step 5: Commit**

```bash
git add variants/full-stack/src/lib/db.ts variants/full-stack/tests/db.test.ts
git commit -m "feat(full-stack): add runScoped transaction wrapper (the only data path)"
```

---

### Task 10: CI workflow with role provisioning (the test certifies something)

**Files:**
- Create: `variants/full-stack/.github/workflows/ci.yml`

**Interfaces:**
- Consumes: migrations (Tasks 4-5), runtime-role SQL (Task 6), the tests (Tasks 2, 8, 9).
- Produces: a green pipeline that migrates as owner, creates the non-owner role, and runs the suite connecting as that role — so the keystone proves real denial, not a superuser false-pass.

- [ ] **Step 1: Create `variants/full-stack/.github/workflows/ci.yml`**

```yaml
name: full-stack CI
on:
  push:
  pull_request:

jobs:
  test:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: variants/full-stack
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_PASSWORD: ownerpw
          POSTGRES_DB: postgres
        ports: ["5432:5432"]
        options: >-
          --health-cmd "pg_isready -U postgres"
          --health-interval 5s --health-timeout 5s --health-retries 10
    env:
      # Owner (migrations + role creation). gen_random_uuid needs pgcrypto on PG<13; PG16 has it built in.
      DIRECT_URL: postgresql://postgres:ownerpw@localhost:5432/postgres
      # The suite connects as the NON-OWNER role, so RLS actually applies.
      RUNTIME_DATABASE_URL: postgresql://app_runtime:runtimepw@localhost:5432/postgres
      DATABASE_URL: postgresql://app_runtime:runtimepw@localhost:5432/postgres
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
          cache-dependency-path: variants/full-stack/package-lock.json
      - run: npm ci
      - run: npm run prisma:generate
      - name: Apply migrations as owner
        run: |
          psql "$DIRECT_URL" -v ON_ERROR_STOP=1 -f prisma/migrations/0001_init/migration.sql
          psql "$DIRECT_URL" -v ON_ERROR_STOP=1 -f prisma/migrations/0002_rls/migration.sql
      - name: Create non-owner runtime role
        run: |
          psql "$DIRECT_URL" -v ON_ERROR_STOP=1 \
            -c "SET goodvibes.runtime_password = 'runtimepw';" \
            -f prisma/sql/runtime-role.sql
      - run: npm run typecheck
      - run: npm test
      - run: npm run build
```

> Verify-at-build: confirm the `postgres:16` image ships `psql` on the runner (it
> runs on the runner via `apt`-provided `postgresql-client`; if absent, add a step
> `sudo apt-get update && sudo apt-get install -y postgresql-client`). The
> `set_config`/`current_setting` GUC `goodvibes.runtime_password` works because
> Postgres allows custom GUCs with a dotted name.

- [ ] **Step 2: Verify the workflow runs green**

Run: push the branch and open the Actions run (or run `act` locally if available).
Expected: all steps pass; the keystone non-vacuity assertion confirms `current_user = app_runtime`, `usesuper = false`, `usebypassrls = false`, then denial passes.

- [ ] **Step 3: Commit**

```bash
git add variants/full-stack/.github/workflows/ci.yml
git commit -m "ci(full-stack): provision non-owner role so the keystone certifies real denial"
```

---

## Self-Review

**1. Spec coverage (against §5 fortress spine, §11 testing, Global Constraints):**
- Single PrismaClient at `src/lib/db.ts`/`prisma.ts` — Tasks 3, 9. ✓ (the wrapper is `db.ts`; the lone `new PrismaClient` is in `prisma.ts`, imported only by `db.ts`).
- `SET LOCAL` per-user context inside a transaction — Task 9. ✓
- pgbouncer/DIRECT_URL split — Task 1 `.env.example` + Global Constraints. ✓
- Per-user RLS, non-owner role, FORCE RLS, fail-closed — Tasks 5, 6. ✓
- Keystone cross-user denial test at fixed path with non-vacuity — Task 8. ✓
- CI provisions the non-owner role + non-vacuity — Task 10. ✓
- *Deferred to Plan 1b (out of this plan's scope):* Supabase Auth, notes Server Actions/pages, Inngest, UI primitives, error boundaries, seeded README/DECISIONS/.goodvibes. Tracked, not dropped.

**2. Placeholder scan:** No "TBD/TODO/handle appropriately". The two `> Note`/verify callouts are explicit Principle-Seven verify points with the current-best form already written, not placeholders.

**3. Type consistency:** `Result<T>`/`ok`/`err` (Task 2) consistent. `runScoped(userId, work)` signature consistent between Task 9 definition and Task 8/db.test usage. `seedNote`/`resetNotes`/`closePools`/`runtimePool` names consistent between Task 7 (define) and Tasks 8-9 (consume). Env var names `DATABASE_URL`/`DIRECT_URL`/`RUNTIME_DATABASE_URL` consistent across Tasks 1, 7, 9, 10.

**Note on the `db.test` DATABASE_URL:** Task 9's `runScoped` uses the Prisma client built from `DATABASE_URL` (Task 3). In CI (Task 10) `DATABASE_URL` is the `app_runtime` DSN, so `runScoped`'s reads are RLS-subject — correct. Locally, point `DATABASE_URL` at `app_runtime` per Task 9 Step 4.
