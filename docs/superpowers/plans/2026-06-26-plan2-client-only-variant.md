# Plan 2 — Client-Only Variant Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Build the GoodVibes client-only variant: a minimal React 19 + Vite SPA that deploys to Vercel as static, embodying the conventions that still apply with no backend — Zod at every external edge, the `Result` shape, an error boundary, calm-tech tokens + accessible primitives, a DuckDB-WASM in-browser data option, and the opt-in shared-password gate.

**Architecture:** A separate Vite app at `variants/client-only/` (its own package.json, builds to `dist/`, deploys static to Vercel). No server, so no secrets live here; data is read-only in the browser (a bundled dataset queried with DuckDB-WASM). The shared-password gate is privacy-by-obscurity, stated honestly.

**Tech Stack:** Vite (create-vite 9.x), React 19, TypeScript strict, Tailwind CSS v4 (`@tailwindcss/vite`), `radix-ui` + `class-variance-authority`, Zod, `@duckdb/duckdb-wasm`, Vitest + React Testing Library + jsdom.

**Builds on:** The same branch as Plan 1/1b (`w1-fullstack-fortress-core`). Independent of the full-stack variant's code (separate dir). Reuses the calm-tech token values and primitive patterns by re-implementing them in this variant (variants are independently distributed, so deliberate duplication is fine).

## Global Constraints

- **No backend, so no safe place for a secret.** Anything needing a key (Airtable, payments) means the project has outgrown client-only — the rules say to surface that, not to embed a key. The shared-password gate is an explicit exception: privacy, not security, and labeled as such.
- **Zod at every external edge** — API responses, URL params, anything read from a file or `localStorage`/`sessionStorage` is parsed before use.
- **The `{ ok: true; data } | { ok: false; error }` Result shape** for async work.
- **TypeScript strict** with `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`, no `any`.
- **Tailwind v4, CSS-first, Vite plugin** (`@tailwindcss/vite`) — no `tailwind.config.js`, no PostCSS. Tokens in `@theme` in `src/index.css`. Semantic color names only; no arbitrary values.
- **A11y floor:** visible focus ring, 44×44px min target, `prefers-reduced-motion`, AA contrast, semantic HTML.
- **Voice floor** on all user-facing copy: sentence case, no em dashes, concrete, no hype.
- **Node 20.19+ / 22.12+** (Vite requirement); 24 LTS preferred. Don't pin `engines` to exclude 20/22.

> **Verified API forms (checked 2026-06-26):** Tailwind v4 Vite plugin `@tailwindcss/vite` (not PostCSS). create-vite 9.x `react-ts`; install React 19 explicitly. Vitest + `@testing-library/react` + jsdom with `test: { globals, environment: 'jsdom', setupFiles }`. Vercel auto-detects Vite (`dist`); `vercel.json` rewrites for SPA. DuckDB-WASM in Vite uses manual `?url` bundles — the exact dist filenames/worker names are version-specific, so Task 4 carries a strong verify-at-build note.

---

### Task 1: Vite + React 19 + TS scaffold, Tailwind v4, tokens, cn, vercel.json

**Files:**
- Create the Vite project at `variants/client-only/` (package.json, tsconfig*.json, vite.config.ts, index.html, src/main.tsx, src/App.tsx, src/index.css, .gitignore)
- Create `variants/client-only/vercel.json`
- Create `variants/client-only/src/lib/cn.ts`

- [ ] **Step 1: Scaffold**
From `variants/`, run `npm create vite@latest client-only -- --template react-ts`, then `cd client-only` and install React 19 + Tailwind v4 (Vite) + utils + Zod + radix + duckdb:
```bash
npm install
npm install react@19 react-dom@19
npm install -D @types/react@19 @types/react-dom@19
npm install tailwindcss @tailwindcss/vite class-variance-authority clsx tailwind-merge zod radix-ui @duckdb/duckdb-wasm
```

- [ ] **Step 2: `vite.config.ts`** (React + Tailwind v4 plugin + @ alias)
```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { resolve } from "node:path";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { "@": resolve(__dirname, "src") } },
});
```

- [ ] **Step 3: Ensure tsconfig strict flags** — in the app tsconfig (the one create-vite uses for `src`, typically `tsconfig.app.json`), confirm/add: `"strict": true`, `"exactOptionalPropertyTypes": true`, `"noUncheckedIndexedAccess": true`, and the `@/*` path alias (`"paths": { "@/*": ["./src/*"] }`, with `"baseUrl": "."`). Report which tsconfig file you edited.

- [ ] **Step 4: `src/index.css`** (Tailwind v4 + calm-tech tokens — same palette as the full-stack variant)
```css
@import "tailwindcss";

@theme {
  --color-surface: oklch(0.99 0.005 95);
  --color-surface-muted: oklch(0.97 0.005 95);
  --color-primary: oklch(0.25 0.01 260);
  --color-secondary: oklch(0.45 0.01 260);
  --color-accent: oklch(0.62 0.13 250);
  --color-status-danger: oklch(0.55 0.18 25);
  --color-status-success: oklch(0.6 0.13 150);
  --color-border: oklch(0.9 0.005 95);

  --font-sans: ui-sans-serif, system-ui, sans-serif;
  --font-serif: ui-serif, Georgia, serif;
  --text-sm: 0.8rem;
  --text-base: 1rem;
  --text-lg: 1.25rem;
  --text-xl: 1.5625rem;
  --text-2xl: 1.953rem;
}

:root { color-scheme: light; }
body { background: var(--color-surface); color: var(--color-primary); font-family: var(--font-sans); }

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
}
```
Ensure `src/main.tsx` imports `./index.css` (create-vite imports a css file by default; point it at index.css and delete the default `App.css` if present).

- [ ] **Step 5: `src/lib/cn.ts`**
```ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
```

- [ ] **Step 6: `vercel.json`** (SPA deep-link rewrite)
```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

- [ ] **Step 7: Replace `src/App.tsx`** with a minimal placeholder (real content in Task 4)
```tsx
export default function App() {
  return <main className="mx-auto mt-12 max-w-xl px-4"><h1 className="font-serif text-2xl">GoodVibes client-only starter</h1></main>;
}
```

- [ ] **Step 8: Verify** — `npm run build` (vite build) and a typecheck (`tsc -b` or `npm run build` runs tsc in the create-vite template). Both pass; `dist/` produced.

- [ ] **Step 9: Commit**
```bash
git add variants/client-only
git commit -m "feat(client-only): Vite + React 19 + Tailwind v4 scaffold with calm-tech tokens"
```
(Do NOT push. `variants/client-only/node_modules` and `dist` are gitignored by the create-vite .gitignore — confirm.)

---

### Task 2: Result + Zod parse helpers + UI primitives + ErrorBoundary

**Files:**
- Create `variants/client-only/src/lib/result.ts`
- Create `variants/client-only/src/lib/parse.ts`
- Create `variants/client-only/src/components/ui/{button,input,card}.tsx`
- Create `variants/client-only/src/components/ErrorBoundary.tsx`

- [ ] **Step 1: `src/lib/result.ts`**
```ts
export type Result<T> = { ok: true; data: T } | { ok: false; error: string };
export function ok<T>(data: T): Result<T> { return { ok: true, data }; }
export function err(error: string): Result<never> { return { ok: false, error }; }
```

- [ ] **Step 2: `src/lib/parse.ts`** (Zod edge helper returning a Result)
```ts
import { z } from "zod";
import { ok, err, type Result } from "@/lib/result";

export function parse<T>(schema: z.ZodType<T>, input: unknown): Result<T> {
  const r = schema.safeParse(input);
  return r.success ? ok(r.data) : err(r.error.issues[0]?.message ?? "Invalid data");
}
```

- [ ] **Step 3: `src/components/ui/button.tsx`** (same accessible pattern as the full-stack variant)
```tsx
import { Slot } from "radix-ui";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { cn } from "@/lib/cn";

const button = cva(
  "inline-flex min-h-11 min-w-11 items-center justify-center rounded-md px-4 text-base font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:pointer-events-none disabled:opacity-50",
  { variants: { variant: { primary: "bg-primary text-surface hover:bg-secondary", ghost: "bg-transparent text-primary hover:bg-surface-muted", danger: "bg-status-danger text-surface hover:opacity-90" } }, defaultVariants: { variant: "primary" } },
);

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof button> {
  asChild?: boolean;
}
export function Button({ className, variant, asChild = false, ...props }: ButtonProps) {
  const Comp = asChild ? Slot.Root : "button";
  return <Comp className={cn(button({ variant }), className)} {...props} />;
}
```
> Verify-at-build: confirm `Slot.Root` from `radix-ui` (as in the full-stack variant); adjust to the installed export if needed.

- [ ] **Step 4: `src/components/ui/input.tsx`**
```tsx
import * as React from "react";
import { cn } from "@/lib/cn";
export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn("min-h-11 w-full rounded-md border border-border bg-surface px-3 text-base text-primary placeholder:text-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent", className)} {...props} />;
}
```

- [ ] **Step 5: `src/components/ui/card.tsx`**
```tsx
import * as React from "react";
import { cn } from "@/lib/cn";
export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-lg border border-border bg-surface p-6 shadow-sm", className)} {...props} />;
}
```

- [ ] **Step 6: `src/components/ErrorBoundary.tsx`** (plain React class boundary, no extra dep)
```tsx
import * as React from "react";

interface Props { children: React.ReactNode }
interface State { hasError: boolean }

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };
  static getDerivedStateFromError(): State { return { hasError: true }; }
  componentDidCatch(error: unknown) { console.error(error); }
  render() {
    if (this.state.hasError) {
      return (
        <main className="mx-auto mt-24 max-w-sm text-center">
          <h1 className="mb-2 font-serif text-xl">Something went wrong</h1>
          <p className="text-secondary">Reload the page to try again.</p>
        </main>
      );
    }
    return this.props.children;
  }
}
```

- [ ] **Step 7: Verify** — `npm run build` passes.

- [ ] **Step 8: Commit**
```bash
git add variants/client-only/src/lib variants/client-only/src/components
git commit -m "feat(client-only): Result/parse helpers, accessible primitives, error boundary"
```

---

### Task 3: Shared-password gate (opt-in, honest)

**Files:**
- Create `variants/client-only/src/components/PasswordGate.tsx`
- Modify `variants/client-only/.env.example` (create it) for `VITE_GATE_PASSWORD`

- [ ] **Step 1: `.env.example`**
```bash
# Optional shared-password gate. PRIVACY, NOT SECURITY: this value ships in the
# browser bundle and a determined visitor can read it. Use it to keep casual
# visitors out of a presentation. For anything sensitive, use the full-stack setup.
VITE_GATE_PASSWORD=""
```

- [ ] **Step 2: `src/components/PasswordGate.tsx`**
```tsx
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

const REQUIRED = import.meta.env.VITE_GATE_PASSWORD ?? "";
const UNLOCK_KEY = "goodvibes-gate-unlocked";

export function PasswordGate({ children }: { children: React.ReactNode }) {
  // No gate configured: render normally.
  const [unlocked, setUnlocked] = React.useState(
    () => REQUIRED === "" || sessionStorage.getItem(UNLOCK_KEY) === "1",
  );
  const [value, setValue] = React.useState("");
  const [error, setError] = React.useState(false);

  if (unlocked) return <>{children}</>;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (value === REQUIRED) {
      sessionStorage.setItem(UNLOCK_KEY, "1");
      setUnlocked(true);
    } else {
      setError(true);
    }
  }

  return (
    <main className="mx-auto mt-24 max-w-sm">
      <Card>
        <h1 className="mb-2 font-serif text-xl">Enter the password</h1>
        <p className="mb-4 text-sm text-secondary">
          This keeps casual visitors out. It is not real security; anyone technical can get past it.
        </p>
        <form onSubmit={submit} className="flex flex-col gap-3">
          <Input
            type="password"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            aria-label="Password"
            autoFocus
          />
          {error ? <p role="alert" className="text-sm text-status-danger">That password did not match. Try again.</p> : null}
          <Button type="submit">Continue</Button>
        </form>
      </Card>
    </main>
  );
}
```
> Verify-at-build: `import.meta.env.VITE_GATE_PASSWORD` is typed `string | undefined` by Vite. The `?? ""` handles undefined. If strict flags complain about `import.meta.env` typing, add a `vite-env.d.ts` `ImportMetaEnv` augmentation and note it.

- [ ] **Step 3: Verify** — `npm run build` passes.

- [ ] **Step 4: Commit**
```bash
git add variants/client-only/.env.example variants/client-only/src/components/PasswordGate.tsx
git commit -m "feat(client-only): opt-in shared-password gate (privacy, not security)"
```

---

### Task 4: DuckDB-WASM data option + bundled dataset + example

**Files:**
- Create `variants/client-only/src/lib/duckdb.ts`
- Create `variants/client-only/src/data/sample.csv`
- Create `variants/client-only/src/components/DataTable.tsx`
- Modify `variants/client-only/src/App.tsx`

> **Verify-at-build (intricate — the highest-risk part of this plan):** DuckDB-WASM's manual Vite bundle uses `?url` imports of version-specific dist files. The filenames below are the current-canonical shape; after install, check `node_modules/@duckdb/duckdb-wasm/dist/` for the actual `*.wasm` and `*.worker.js` names and adjust. Confirm `selectBundle`, `AsyncDuckDB`, `ConsoleLogger`, `registerFileText`, and `read_csv_auto` against the installed `@duckdb/duckdb-wasm` version. If the manual-bundle path proves fragile, the documented fallback is `duckdb.getJsDelivrBundles()` (loads the wasm from the jsDelivr CDN instead of bundling locally) — note which you used and why.

- [ ] **Step 1: `src/data/sample.csv`** (tiny domain-neutral dataset)
```csv
month,visitors
Jan,1200
Feb,1800
Mar,1500
Apr,2200
May,2600
```

- [ ] **Step 2: `src/lib/duckdb.ts`** (instantiate once; query the bundled CSV)
```ts
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
```

- [ ] **Step 3: `src/components/DataTable.tsx`** (queries via DuckDB, Zod-parses, renders)
```tsx
import * as React from "react";
import { z } from "zod";
import { queryVisitors } from "@/lib/duckdb";
import { parse } from "@/lib/parse";
import { Card } from "@/components/ui/card";

const Rows = z.array(z.object({ month: z.string(), visitors: z.number() }));

export function DataTable() {
  const [rows, setRows] = React.useState<Array<{ month: string; visitors: number }>>([]);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let active = true;
    queryVisitors()
      .then((data) => {
        if (!active) return;
        const parsed = parse(Rows, data);
        if (parsed.ok) setRows(parsed.data);
        else setError(parsed.error);
      })
      .catch(() => active && setError("Could not load the data."));
    return () => { active = false; };
  }, []);

  if (error) return <p role="alert" className="text-status-danger">{error}</p>;

  return (
    <Card>
      <table className="w-full text-left">
        <thead><tr><th className="pb-2">Month</th><th className="pb-2">Visitors</th></tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.month}><td className="py-1">{r.month}</td><td className="py-1">{r.visitors}</td></tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}
```

- [ ] **Step 4: Update `src/App.tsx`** to wrap with the gate + boundary and render the example
```tsx
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { PasswordGate } from "@/components/PasswordGate";
import { DataTable } from "@/components/DataTable";

export default function App() {
  return (
    <ErrorBoundary>
      <PasswordGate>
        <main className="mx-auto mt-12 max-w-xl px-4">
          <h1 className="mb-6 font-serif text-2xl">Visitors by month</h1>
          <DataTable />
        </main>
      </PasswordGate>
    </ErrorBoundary>
  );
}
```

- [ ] **Step 5: Verify** — `npm run build` passes (the `?url`/`?raw` imports resolve; DuckDB worker bundles emit). Report the actual dist filenames used and whether the manual-bundle or CDN fallback was needed.

- [ ] **Step 6: Commit**
```bash
git add variants/client-only/src/lib/duckdb.ts variants/client-only/src/data variants/client-only/src/components/DataTable.tsx variants/client-only/src/App.tsx
git commit -m "feat(client-only): DuckDB-WASM in-browser query of a bundled dataset"
```

---

### Task 5: Tests (Vitest + RTL), CI workflow, README + DECISIONS

**Files:**
- Modify `package.json` (test script + dev deps), `vite.config.ts` (test block), tsconfig types
- Create `src/setupTests.ts`, `src/lib/parse.test.ts`, `src/components/PasswordGate.test.tsx`
- Create `.github/workflows/ci.yml`, `README.md`, `DECISIONS.md`

- [ ] **Step 1: Add test deps** — `npm install -D vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom`

- [ ] **Step 2: Add the test block to `vite.config.ts`** (merge into the existing config)
```ts
// add to defineConfig({...}):
  test: { globals: true, environment: "jsdom", setupFiles: "./src/setupTests.ts" },
```
And add `"test": "vitest run"` to package.json scripts. Add `"vitest/globals"` and `"@testing-library/jest-dom"` to the tsconfig `types` array (the app tsconfig).

- [ ] **Step 3: `src/setupTests.ts`**
```ts
import "@testing-library/jest-dom";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";
afterEach(() => cleanup());
```

- [ ] **Step 4: `src/lib/parse.test.ts`** (Zod-edge behavior)
```ts
import { describe, it, expect } from "vitest";
import { z } from "zod";
import { parse } from "@/lib/parse";

describe("parse", () => {
  it("returns ok with valid data", () => {
    const r = parse(z.object({ n: z.number() }), { n: 1 });
    expect(r).toEqual({ ok: true, data: { n: 1 } });
  });
  it("returns err with a message on invalid data", () => {
    const r = parse(z.object({ n: z.number() }), { n: "x" });
    expect(r.ok).toBe(false);
  });
});
```

- [ ] **Step 5: `src/components/PasswordGate.test.tsx`** (render smoke + gate behavior when no password set)
```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { PasswordGate } from "@/components/PasswordGate";

describe("PasswordGate", () => {
  it("renders children when no password is configured", () => {
    // VITE_GATE_PASSWORD is unset in the test env, so the gate is open.
    render(<PasswordGate><p>protected content</p></PasswordGate>);
    expect(screen.getByText("protected content")).toBeInTheDocument();
  });
});
```

- [ ] **Step 6: `.github/workflows/ci.yml`**
```yaml
name: client-only CI
on:
  push:
  pull_request:
jobs:
  test:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: variants/client-only
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
          cache-dependency-path: variants/client-only/package-lock.json
      - run: npm ci
      - run: npm run build
      - run: npm test
```

- [ ] **Step 7: `README.md`** — what it is (a browser-only starter: a page/tool/dashboard that runs entirely client-side; runs immediately, nothing to provision), the stack, `npm install` / `npm run dev` / `npm run build`, the optional password gate (privacy not security), the DuckDB-WASM data option, deploy to Vercel (auto-detected, `dist`, vercel.json handles SPA routes), tests. Voice floor, no em dashes.

- [ ] **Step 8: `DECISIONS.md`** — dated 2026-06-26: browser-only (no server, no secrets); the password gate is privacy not security; Tailwind v4 via the Vite plugin; DuckDB-WASM for in-browser read-only data; Zod at every edge; built with the GoodVibes scaffold (version in the `.goodvibes` marker once the init routine stamps it).

- [ ] **Step 9: Verify** — `npm run build && npm test` pass.

- [ ] **Step 10: Commit**
```bash
git add variants/client-only
git commit -m "test+docs(client-only): Vitest/RTL tests, CI, README and DECISIONS"
```

---

## Self-Review

**1. Spec coverage (against the W1 spec §6 client-only items):** React 19 + Vite + TS strict — Task 1. Zod edges + Result — Tasks 2, 4. Error boundary — Task 2. Calm-tech tokens + Radix primitives — Tasks 1, 2. DuckDB-WASM — Task 4. Shared-password gate — Task 3. Example feature — Task 4. Seeded docs + own CI — Task 5. Deploys static to Vercel — Task 1 (vercel.json). ✓

**2. Placeholder scan:** README/DECISIONS (Task 5) specify required content rather than full prose (documentation deliverable, voice-floor governed). The DuckDB and `import.meta.env` items carry explicit verify-at-build notes with current-best code, not TODOs. The sample dataset and DataTable are an intentional, clearly-replaceable example.

**3. Type consistency:** `Result<T>`/`ok`/`err` reused; `parse(schema, input): Result<T>` defined Task 2, consumed Task 4; `cn` Task 1; primitives Task 2 consumed by gate (Task 3) and example (Task 4); `queryVisitors()` defined Task 4 consumed by DataTable.

**4. Risks flagged:** DuckDB-WASM manual-bundle dist filenames (Task 4 verify note + CDN fallback) — the single highest-risk item. `import.meta.env` strict typing (Task 3 note). The DuckDB worker/wasm bundling under `vite build` is verified by Task 4's build step; if it fails to emit workers, the CDN fallback removes the bundling dependency.
