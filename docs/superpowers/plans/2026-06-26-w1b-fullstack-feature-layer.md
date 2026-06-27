# W1b — Full-Stack Feature Layer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Add the user-facing feature layer on top of the Plan 1 fortress core: Supabase Auth, a calm-tech styling foundation + accessible UI primitives, the notes feature (Server Actions + pages built on `runScoped`), an Inngest background job, and seeded handoff docs.

**Architecture:** Auth identity comes from Supabase (`getUser()` → the user's uuid), which is passed directly to `runScoped(userId, …)` as the per-user RLS tenant key from Plan 1 — data still flows through Prisma as the non-owner `app_runtime` role, not the Supabase client. Styling is Tailwind v4 (CSS-first `@theme` tokens). Slow work moves off the request path via Inngest.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript strict, `@supabase/ssr`, Tailwind CSS v4, `radix-ui` (unified package) + `class-variance-authority`, Inngest, Zod, Prisma (from Plan 1).

**Builds on:** Plan 1 (`docs/superpowers/plans/2026-06-26-w1-fullstack-fortress-core.md`) — assumes `src/lib/{prisma,db,result}.ts`, the `notes` table + RLS, and the variant scaffold already exist on branch `w1-fullstack-fortress-core`.

## Global Constraints

(Every task implicitly includes these. Continues Plan 1's constraints — strict TS, single PrismaClient, secrets server-side, etc.)

- **Auth identity is re-derived server-side via `supabase.auth.getUser()`** (NEVER `getSession()` for authorization, and never trust a client-passed user id). The returned `user.id` is the `userId` for `runScoped`.
- **`cookies()` from `next/headers` is async in Next 16** — always `await cookies()`.
- **Server Actions are public endpoints.** Each one: `await`s the current user (redirect/deny if absent), Zod-parses input, calls `runScoped(userId, …)`, returns the `Result` union, then `revalidatePath`.
- **Tailwind v4, CSS-first.** No `tailwind.config.js`; tokens live in `@theme` in `globals.css`. No arbitrary values in markup (`w-[37px]`) — use tokens.
- **Semantic color names only** (`bg-surface`, `text-primary`, `status-danger`) — never hue names (`blue-500`).
- **A11y floor (non-negotiable):** visible focus ring (never `outline:none` without a replacement), 44×44px min touch target, `prefers-reduced-motion` respected, WCAG AA contrast.
- **Voice floor** (from `kit`/`writing-voice-guide.md`): sentence case, no em dashes, no hype, concrete copy. Applies to all user-facing strings.
- **Public Supabase env is intentional:** `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are designed to be public (protected by Supabase-side RLS on auth). The service-role key is NOT used anywhere.

> **Verified API forms (checked against current docs 2026-06-26):** Tailwind v4 (`@tailwindcss/postcss`, `@import "tailwindcss"`, `@theme`). `radix-ui` unified single package (shadcn new-york, Feb 2026). `@supabase/ssr` `createServerClient`/`createBrowserClient` + `updateSession` middleware, `await cookies()`, `getUser()` for auth. Inngest `serve` from `inngest/next` at `app/api/inngest/route.ts`; `createFunction` + `step.run`; idempotency via CEL. React 19 `useActionState` from `react`, `useFormStatus` from `react-dom`. The exact Supabase server/middleware code is intricate — Task 3 carries a verify-at-build note to confirm it against the current Supabase Next.js SSR guide.

---

### Task 1: Styling foundation (Tailwind v4 + design tokens + cn util)

**Files:**
- Modify: `variants/full-stack/package.json` (add deps)
- Create: `variants/full-stack/postcss.config.mjs`
- Create: `variants/full-stack/src/app/globals.css`
- Create: `variants/full-stack/src/lib/cn.ts`
- Modify: `variants/full-stack/src/app/layout.tsx` (import globals.css + fonts)

**Interfaces produced:** semantic Tailwind tokens; `cn(...inputs)` class-merge helper.

- [ ] **Step 1: Add deps** — `cd variants/full-stack && npm install tailwindcss @tailwindcss/postcss postcss class-variance-authority clsx tailwind-merge`

- [ ] **Step 2: Create `postcss.config.mjs`**
```js
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};
export default config;
```

- [ ] **Step 3: Create `src/app/globals.css`** (CSS-first theme: semantic tokens, 4px spacing already default in v4, 1.25 type scale, serif/sans pairing)
```css
@import "tailwindcss";

@theme {
  /* Calm-tech palette — semantic names only. */
  --color-surface: oklch(0.99 0.005 95);      /* paper white */
  --color-surface-muted: oklch(0.97 0.005 95);
  --color-primary: oklch(0.25 0.01 260);      /* ink */
  --color-secondary: oklch(0.45 0.01 260);    /* charcoal */
  --color-accent: oklch(0.62 0.13 250);
  --color-status-danger: oklch(0.55 0.18 25);
  --color-status-success: oklch(0.6 0.13 150);
  --color-border: oklch(0.9 0.005 95);

  /* Type: serif headings, sans body; 1.25 modular scale. */
  --font-sans: ui-sans-serif, system-ui, sans-serif;
  --font-serif: ui-serif, Georgia, serif;
  --text-sm: 0.8rem;
  --text-base: 1rem;
  --text-lg: 1.25rem;
  --text-xl: 1.5625rem;
  --text-2xl: 1.953rem;
}

:root {
  color-scheme: light;
}

body {
  background: var(--color-surface);
  color: var(--color-primary);
  font-family: var(--font-sans);
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

- [ ] **Step 4: Create `src/lib/cn.ts`**
```ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
```

- [ ] **Step 5: Wire globals.css into the root layout** — modify `src/app/layout.tsx`:
```tsx
import "./globals.css";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
```

- [ ] **Step 6: Verify** — `npm run typecheck && npm run build`. Expected: both pass; Tailwind compiles `globals.css`.

- [ ] **Step 7: Commit**
```bash
git add variants/full-stack/package.json variants/full-stack/package-lock.json variants/full-stack/postcss.config.mjs variants/full-stack/src/app/globals.css variants/full-stack/src/lib/cn.ts variants/full-stack/src/app/layout.tsx
git commit -m "feat(full-stack): Tailwind v4 styling foundation with calm-tech tokens"
```

---

### Task 2: Accessible UI primitives (Button, Input, Card)

**Files:**
- Modify: `variants/full-stack/package.json` (add `radix-ui`)
- Create: `variants/full-stack/src/components/ui/button.tsx`
- Create: `variants/full-stack/src/components/ui/input.tsx`
- Create: `variants/full-stack/src/components/ui/card.tsx`

**Interfaces produced:** `Button` (with `cva` variants), `Input`, `Card` — all honoring the a11y floor.

- [ ] **Step 1: Add dep** — `npm install radix-ui`

> Verify-at-build: confirm the unified `radix-ui` package is the current shadcn/Radix approach and exposes `Slot` (used below) at `radix-ui`. If `Slot` is imported differently in the installed version, adjust the import and note it.

- [ ] **Step 2: Create `src/components/ui/button.tsx`**
```tsx
import { Slot } from "radix-ui";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { cn } from "@/lib/cn";

const button = cva(
  "inline-flex min-h-11 min-w-11 items-center justify-center rounded-md px-4 text-base font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary: "bg-primary text-surface hover:bg-secondary",
        ghost: "bg-transparent text-primary hover:bg-surface-muted",
        danger: "bg-status-danger text-surface hover:opacity-90",
      },
    },
    defaultVariants: { variant: "primary" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof button> {
  asChild?: boolean;
}

export function Button({ className, variant, asChild = false, ...props }: ButtonProps) {
  const Comp = asChild ? Slot.Root : "button";
  return <Comp className={cn(button({ variant }), className)} {...props} />;
}
```

> Verify-at-build: `Slot.Root` vs `Slot` — confirm the export shape of `Slot` in the unified `radix-ui` package and use the correct one.

- [ ] **Step 3: Create `src/components/ui/input.tsx`**
```tsx
import * as React from "react";
import { cn } from "@/lib/cn";

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "min-h-11 w-full rounded-md border border-border bg-surface px-3 text-base text-primary placeholder:text-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
        className,
      )}
      {...props}
    />
  );
}
```

- [ ] **Step 4: Create `src/components/ui/card.tsx`**
```tsx
import * as React from "react";
import { cn } from "@/lib/cn";

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("rounded-lg border border-border bg-surface p-6 shadow-sm", className)}
      {...props}
    />
  );
}
```

- [ ] **Step 5: Verify** — `npm run typecheck && npm run build`. Expected: pass.

- [ ] **Step 6: Commit**
```bash
git add variants/full-stack/package.json variants/full-stack/package-lock.json variants/full-stack/src/components/ui
git commit -m "feat(full-stack): accessible Button/Input/Card primitives (radix-ui + cva)"
```

---

### Task 3: Supabase auth utilities + middleware

**Files:**
- Modify: `variants/full-stack/package.json` (add `@supabase/ssr @supabase/supabase-js`)
- Create: `variants/full-stack/src/lib/supabase/server.ts`
- Create: `variants/full-stack/src/lib/supabase/client.ts`
- Create: `variants/full-stack/src/lib/supabase/middleware.ts`
- Create: `variants/full-stack/src/middleware.ts`
- Modify: `variants/full-stack/.env.example` (add Supabase vars)

**Interfaces produced:** `createClient()` (server, async), `createBrowserSupabase()` (browser), `updateSession(request)` (middleware).

> **Verify-at-build (intricate):** This is the most error-prone file set. Confirm the exact code against the current Supabase "Setting up Server-Side Auth for Next.js" guide (https://supabase.com/docs/guides/auth/server-side/nextjs). Two gotchas to preserve: (a) `cookies()` is async — `await` it; (b) in `updateSession`, do NOT run any code between `createServerClient(...)` and `await supabase.auth.getUser()`, or you risk random logouts. The code below is the current canonical shape; adjust only if the live guide differs, and note it.

- [ ] **Step 1: Add deps** — `npm install @supabase/ssr @supabase/supabase-js`

- [ ] **Step 2: Create `src/lib/supabase/server.ts`**
```ts
import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Called from a Server Component — safe to ignore; middleware refreshes.
          }
        },
      },
    },
  );
}
```

- [ ] **Step 3: Create `src/lib/supabase/client.ts`**
```ts
import { createBrowserClient } from "@supabase/ssr";

export function createBrowserSupabase() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
```

- [ ] **Step 4: Create `src/lib/supabase/middleware.ts`**
```ts
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Do NOT run code between createServerClient and getUser.
  await supabase.auth.getUser();

  return response;
}
```

- [ ] **Step 5: Create `src/middleware.ts`**
```ts
import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
```

- [ ] **Step 6: Append Supabase vars to `.env.example`**
```bash

# Supabase Auth (PUBLIC by design — anon key is safe in the browser; protected by RLS).
NEXT_PUBLIC_SUPABASE_URL="https://YOUR-PROJECT.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="YOUR-ANON-KEY"
```

- [ ] **Step 7: Verify** — `npm run typecheck && npm run build`. Expected: pass (build does not need live Supabase env; the `!` on public env is acceptable here since these are required public values — or guard them if strict complains).

- [ ] **Step 8: Commit**
```bash
git add variants/full-stack/package.json variants/full-stack/package-lock.json variants/full-stack/src/lib/supabase variants/full-stack/src/middleware.ts variants/full-stack/.env.example
git commit -m "feat(full-stack): Supabase SSR auth client + session-refresh middleware"
```

---

### Task 4: Session helper + minimal auth UI

**Files:**
- Create: `variants/full-stack/src/lib/auth.ts`
- Create: `variants/full-stack/src/app/login/page.tsx`
- Create: `variants/full-stack/src/app/login/actions.ts`

**Interfaces produced:** `getCurrentUserId(): Promise<string | null>`; `requireUserId(): Promise<string>` (redirects to /login if absent); sign-in + sign-out actions.

- [ ] **Step 1: Create `src/lib/auth.ts`**
```ts
import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function getCurrentUserId(): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

export async function requireUserId(): Promise<string> {
  const userId = await getCurrentUserId();
  if (!userId) redirect("/login");
  return userId;
}
```

- [ ] **Step 2: Create `src/app/login/actions.ts`** (email + password sign-in/up + sign-out)
```ts
"use server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { ok, err, type Result } from "@/lib/result";

const Credentials = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export async function signIn(_prev: Result<null> | null, formData: FormData): Promise<Result<null>> {
  const parsed = Credentials.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return err("Enter a valid email and a password of at least 8 characters.");

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return err("That email and password did not match. Try again.");
  redirect("/notes");
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
```

- [ ] **Step 3: Create `src/app/login/page.tsx`** (uses `useActionState`)
```tsx
"use client";
import { useActionState } from "react";
import { signIn } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

export default function LoginPage() {
  const [state, action, pending] = useActionState(signIn, null);
  return (
    <main className="mx-auto mt-24 max-w-sm">
      <Card>
        <h1 className="mb-4 font-serif text-xl">Sign in</h1>
        <form action={action} className="flex flex-col gap-3">
          <label className="text-sm" htmlFor="email">Email</label>
          <Input id="email" name="email" type="email" autoComplete="email" required />
          <label className="text-sm" htmlFor="password">Password</label>
          <Input id="password" name="password" type="password" autoComplete="current-password" required />
          {state && !state.ok ? (
            <p role="alert" className="text-sm text-status-danger">{state.error}</p>
          ) : null}
          <Button type="submit" disabled={pending}>
            {pending ? "Signing in..." : "Sign in"}
          </Button>
        </form>
      </Card>
    </main>
  );
}
```

- [ ] **Step 4: Verify** — `npm run typecheck && npm run build`. Expected: pass.

- [ ] **Step 5: Commit**
```bash
git add variants/full-stack/src/lib/auth.ts variants/full-stack/src/app/login
git commit -m "feat(full-stack): session helpers and email/password sign-in"
```

---

### Task 5: Inngest client, route handler, and example function

**Files:**
- Modify: `variants/full-stack/package.json` (add `inngest`)
- Create: `variants/full-stack/src/inngest/client.ts`
- Create: `variants/full-stack/src/inngest/functions.ts`
- Create: `variants/full-stack/src/app/api/inngest/route.ts`
- Modify: `variants/full-stack/.env.example` (add Inngest vars)

**Interfaces produced:** `inngest` client; `noteCreated` function; the `/api/inngest` route.

- [ ] **Step 1: Add dep** — `npm install inngest`

- [ ] **Step 2: Create `src/inngest/client.ts`**
```ts
import { Inngest } from "inngest";

export const inngest = new Inngest({ id: "goodvibes-fullstack" });
```

- [ ] **Step 3: Create `src/inngest/functions.ts`** (timeout-bounded, idempotent example)
```ts
import { inngest } from "@/inngest/client";

// Example background job: runs off the request path when a note is created.
// Idempotency: at most one run per note id per 24h.
export const noteCreated = inngest.createFunction(
  {
    id: "note-created-enrichment",
    idempotency: "event.data.noteId",
    retries: 3,
  },
  { event: "note/created" },
  async ({ event, step }) => {
    await step.run("enrich", async () => {
      // Placeholder for slow work (e.g. summarize, index). Kept off the request path.
      return { noteId: event.data.noteId, enrichedAt: new Date().toISOString() };
    });
  },
);
```

- [ ] **Step 4: Create `src/app/api/inngest/route.ts`**
```ts
import { serve } from "inngest/next";
import { inngest } from "@/inngest/client";
import { noteCreated } from "@/inngest/functions";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [noteCreated],
});
```

- [ ] **Step 5: Append Inngest vars to `.env.example`**
```bash

# Inngest (background jobs). Local dev uses the Inngest Dev Server; prod needs these.
INNGEST_EVENT_KEY="YOUR-EVENT-KEY"
INNGEST_SIGNING_KEY="YOUR-SIGNING-KEY"
```

- [ ] **Step 6: Verify** — `npm run typecheck && npm run build`. Expected: pass.

> Verify-at-build: confirm `inngest.createFunction` accepts `idempotency` (CEL string) and `retries` in the config object in the installed Inngest version; confirm `serve` from `inngest/next` exports `{ GET, POST, PUT }`. Adjust to the current signature and note it.

- [ ] **Step 7: Commit**
```bash
git add variants/full-stack/package.json variants/full-stack/package-lock.json variants/full-stack/src/inngest variants/full-stack/src/app/api/inngest variants/full-stack/.env.example
git commit -m "feat(full-stack): Inngest client, route, and example background job"
```

---

### Task 6: Notes Server Actions

**Files:**
- Create: `variants/full-stack/src/app/notes/actions.ts`

**Interfaces produced:** `createNote(prev, formData): Promise<Result<null>>`; `deleteNote(formData): Promise<void>`.

- [ ] **Step 1: Create `src/app/notes/actions.ts`**
```ts
"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { runScoped } from "@/lib/db";
import { requireUserId } from "@/lib/auth";
import { inngest } from "@/inngest/client";
import { ok, err, type Result } from "@/lib/result";

const NoteInput = z.object({ content: z.string().min(1).max(2000) });

export async function createNote(
  _prev: Result<null> | null,
  formData: FormData,
): Promise<Result<null>> {
  const userId = await requireUserId();
  const parsed = NoteInput.safeParse({ content: formData.get("content") });
  if (!parsed.success) return err("Write something first (up to 2000 characters).");

  const note = await runScoped(userId, (tx) =>
    tx.note.create({ data: { userId, content: parsed.data.content } }),
  );

  await inngest.send({ name: "note/created", data: { noteId: note.id } });
  revalidatePath("/notes");
  return ok(null);
}

export async function deleteNote(formData: FormData): Promise<void> {
  const userId = await requireUserId();
  const id = z.string().uuid().parse(formData.get("id"));
  // RLS + the runScoped context guarantee a user can only delete their own row.
  await runScoped(userId, (tx) => tx.note.deleteMany({ where: { id, userId } }));
  revalidatePath("/notes");
}
```

- [ ] **Step 2: Verify** — `npm run typecheck`. Expected: pass. (Runtime needs DB + Supabase; deferred to CI/manual.)

- [ ] **Step 3: Commit**
```bash
git add variants/full-stack/src/app/notes/actions.ts
git commit -m "feat(full-stack): notes server actions (scoped, validated, revalidating)"
```

---

### Task 7: Notes pages + error boundaries

**Files:**
- Create: `variants/full-stack/src/app/notes/page.tsx`
- Create: `variants/full-stack/src/app/notes/create-form.tsx`
- Create: `variants/full-stack/src/app/error.tsx`
- Create: `variants/full-stack/src/app/not-found.tsx`

- [ ] **Step 1: Create `src/app/notes/create-form.tsx`** (client, `useActionState`)
```tsx
"use client";
import { useActionState } from "react";
import { createNote } from "./actions";
import { Button } from "@/components/ui/button";

export function CreateForm() {
  const [state, action, pending] = useActionState(createNote, null);
  return (
    <form action={action} className="flex flex-col gap-2">
      <textarea
        name="content"
        rows={3}
        className="w-full rounded-md border border-border bg-surface p-3 text-base focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        placeholder="Write a note"
        required
      />
      {state && !state.ok ? (
        <p role="alert" className="text-sm text-status-danger">{state.error}</p>
      ) : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Saving..." : "Add note"}
      </Button>
    </form>
  );
}
```

- [ ] **Step 2: Create `src/app/notes/page.tsx`** (RSC, scoped query)
```tsx
import { requireUserId } from "@/lib/auth";
import { runScoped } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { signOut } from "@/app/login/actions";
import { CreateForm } from "./create-form";
import { deleteNote } from "./actions";

export default async function NotesPage() {
  const userId = await requireUserId();
  const notes = await runScoped(userId, (tx) =>
    tx.note.findMany({ orderBy: { createdAt: "desc" } }),
  );

  return (
    <main className="mx-auto mt-12 max-w-xl px-4">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-serif text-2xl">Your notes</h1>
        <form action={signOut}>
          <Button variant="ghost" type="submit">Sign out</Button>
        </form>
      </div>
      <Card className="mb-6"><CreateForm /></Card>
      <ul className="flex flex-col gap-3">
        {notes.map((note) => (
          <li key={note.id}>
            <Card className="flex items-start justify-between gap-4">
              <p className="text-base">{note.content}</p>
              <form action={deleteNote}>
                <input type="hidden" name="id" value={note.id} />
                <Button variant="danger" type="submit" aria-label="Delete note">Delete</Button>
              </form>
            </Card>
          </li>
        ))}
        {notes.length === 0 ? (
          <li className="text-secondary">No notes yet. Add your first one above.</li>
        ) : null}
      </ul>
    </main>
  );
}
```

- [ ] **Step 3: Create `src/app/error.tsx`**
```tsx
"use client";
export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="mx-auto mt-24 max-w-sm text-center">
      <h1 className="mb-2 font-serif text-xl">Something went wrong</h1>
      <p className="mb-4 text-secondary">That page hit a problem. Try again.</p>
      <button
        onClick={reset}
        className="min-h-11 rounded-md bg-primary px-4 text-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        Try again
      </button>
    </main>
  );
}
```

- [ ] **Step 4: Create `src/app/not-found.tsx`**
```tsx
import Link from "next/link";
export default function NotFound() {
  return (
    <main className="mx-auto mt-24 max-w-sm text-center">
      <h1 className="mb-2 font-serif text-xl">Page not found</h1>
      <Link href="/notes" className="text-accent underline">Go to your notes</Link>
    </main>
  );
}
```

- [ ] **Step 5: Verify** — `npm run typecheck && npm run build`. Expected: pass.

- [ ] **Step 6: Commit**
```bash
git add variants/full-stack/src/app/notes variants/full-stack/src/app/error.tsx variants/full-stack/src/app/not-found.tsx
git commit -m "feat(full-stack): notes pages, create form, delete, error boundaries"
```

---

### Task 8: Seeded README and DECISIONS

**Files:**
- Create: `variants/full-stack/README.md`
- Create: `variants/full-stack/DECISIONS.md`

- [ ] **Step 1: Create `variants/full-stack/README.md`** — what the app is; the stack; how to run locally (install, set `.env` from `.env.example`, `prisma migrate deploy`, `npm run dev`); how to deploy to Vercel; what each env var is for; the "connect Supabase + Inngest first" note. Plain language, voice floor, no em dashes.

- [ ] **Step 2: Create `variants/full-stack/DECISIONS.md`** — dated, plain-language entries for: per-user isolation default (org multi-tenancy is the documented extension); the `?pgbouncer=true` pooler decision and why not to remove it; runtime connects as the non-owner `app_runtime` role; Supabase Auth provides the per-user tenant key; Tailwind v4 CSS-first; `superjson` is a documented convention not yet wired (deferred); the GoodVibes scaffold version stamp placeholder.

- [ ] **Step 3: Verify** — both files exist and read cleanly; no em dashes.

- [ ] **Step 4: Commit**
```bash
git add variants/full-stack/README.md variants/full-stack/DECISIONS.md
git commit -m "docs(full-stack): seed README and DECISIONS for handoff"
```

---

## Self-Review

**1. Spec coverage (against the W1 spec §5 feature items deferred from Plan 1):** Supabase Auth — Tasks 3, 4. Notes Server Actions + pages — Tasks 6, 7. Inngest reference — Task 5. UI primitives + calm-tech tokens — Tasks 1, 2. Error boundaries — Task 7. Seeded README/DECISIONS — Task 8. ✓

**2. Placeholder scan:** The Inngest `step.run` body is a deliberate, documented example (the variant is a pattern reference; the AI replaces it). README/DECISIONS Task 8 describes exact required content rather than pasting prose — acceptable as the deliverable is documentation whose wording follows the voice floor. The verify-at-build notes (Supabase exact code, radix `Slot` export, Inngest config signature) are explicit confirm-points with current-best code, not TODOs.

**3. Type consistency:** `Result<T>`/`ok`/`err` reused from Plan 1. `runScoped(userId, (tx) => …)` matches Plan 1's signature. `requireUserId`/`getCurrentUserId` defined in Task 4, consumed in Tasks 6, 7. `createNote(_prev, formData)` shape matches `useActionState` usage in Task 7. `inngest` client defined Task 5, consumed Task 6.

**4. Risks flagged for the implementers:** the Supabase server/middleware code is the highest-risk transcription (Task 3 verify note); `NEXT_PUBLIC_SUPABASE_*` use `!` non-null on public required env (acceptable, or guard if strict complains — note in review); the DB+auth-dependent paths (Tasks 6, 7 runtime) are typecheck-only here and run for real once Supabase + DB are connected.
