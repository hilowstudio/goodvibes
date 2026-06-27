# GoodVibes Starter System (W1) — Design Spec

- **Date:** 2026-06-26
- **Status:** Approved for planning (pending user review of this spec). Revised after a multi-agent adversarial review (22 verified findings applied).
- **Sub-project:** W1 of the GoodVibes skill system
- **Author/owner:** Hi-Low Studio (hello@hilowstudio.dev)

## 1. Context and goal

Hi-Low Studio takes over apps that non-technical "vibe coder" clients build with AI
tools (v0, Bolt, Lovable, Claude Code, Cursor) and makes them production-ready. The
clients cannot read code; they describe behavior in plain English. The GoodVibes
skill system exists so that what these clients build lands at a consistent, higher
quality and hands off cleanly to the studio developer.

This spec covers **W1: the starter system** — the piece that gets a client from a
single command to a conventions-correct project on the studio's preferred stack. It
is the first of an agreed sequence: **W1 → W1.5 → W2 → C** (see §12).

**What "done" means for the client, by variant (scoped honestly):**
- **client-only** reaches a *running* app immediately (nothing to provision).
- **full-stack** reaches *conventions-correct and ready for service connection*. It
  does not start until a Supabase project and Inngest app are connected, which is the
  guided "set up your services" skill in W1.5. W1 must make this state legible, never
  a silent dead end (see §4 Step 4).

**Studio stack (the conventions this system encodes):** Zod-validated strict
TypeScript; Next.js 16+ App Router (full-stack) or React 19 (client-only); Node.js
24+ LTS preferred (Next 16's actual floor is Node 20.9, so do not break a working
Node 20/22 host); hosted on Vercel; GitHub Actions or Inngest for background and
scheduled work; Supabase Postgres + Prisma as the default datastore, with lighter
storage rungs available (see §7). Serverless-grain rule: Vercel/Next is the home;
when a job fights that home (long work on the request path, in-memory state, a held-
open WebSocket), move the job to the right primitive, not the home.

## 2. Decisions locked

From the directional review, the brainstorming dialogue, and the adversarial review:

1. **Delivery = a Claude Code plugin** the studio installs into the client's editor.
   No GitHub flow for the client.
2. **Entry point = a `/goodvibes` routine** run in VSCode + the Claude Code
   extension.
3. **Intake is one deterministic decision only:** full-stack vs client-only. All
   further detail is learned through conversation, governed by the skill system.
4. **Variant resolution = copy-in, not prune.** The chosen variant is copied in; the
   other is never introduced.
5. **The copy is script-backed, not model-discretion.** The `/goodvibes` command
   body is a prompt Claude follows, but the irreversible file operations (greenfield
   guard, scaffold, stamp) are performed by a small bundled script so they are
   deterministic regardless of model behavior (§4).
6. **Greenfield only.** Targets a fresh/empty folder. Adopting an existing project is
   deferred (path "B").
7. **`principled-coding.md` is the developer-facing teacher's edition.** It ships
   into the scaffolded repo as `docs/principled-coding.md`, verbatim, with a short
   prepended framing note (Appendix C) that maps its org/tenant worked example onto
   W1's per-user default. It is not rewritten in W1.
8. **Scheduled work uses GitHub Actions / Inngest.** Vercel Cron is dropped from the
   client default.
9. **Per-user data isolation is the full-stack default.** Org/team multi-tenancy is
   the documented extension in the teacher's edition, grown into on demand.
10. **Storage is a calibration decision (§7).** In W1 only two rungs are *wired*:
    browser/DuckDB-WASM (client-only) and Supabase/Postgres (full-stack). The lighter
    *server* rung (Airtable / MotherDuck behind one serverless function) is W1.5, so
    W1 deliberately over-provisions any server-backed app to the Postgres fortress.
    This over-provisioning is acknowledged, not hidden (§4 Step 2, §7).
11. **The two CLAUDE.md rule additions are W1 deliverables** (integration guardrails,
    storage calibration), authored in this spec (Appendices A, B). "C" polishes the
    four *existing* docs only; authoring new rule sections is W1, not C.

## 3. Architecture overview

GoodVibes is one Claude Code plugin containing:

```
goodvibes-plugin/                     # the plugin repo (also hosts the marketplace, §10)
├─ .claude-plugin/
│  ├─ plugin.json                     # manifest: name, semver, description
│  └─ marketplace.json                # marketplace manifest (name, owner, plugins[])
├─ commands/
│  └─ goodvibes.md                    # the /goodvibes command (prompt + script invocation)
├─ scripts/
│  └─ scaffold.(mjs|ts)               # the deterministic copy/guard/stamp logic (§4)
├─ skills/                            # build-time skills (W1.5 lands here)
├─ kit/
│  ├─ system-prompt.md               # byte-equal to vibecoder-system-prompt.md
│  ├─ _additions/
│  │  ├─ integration-guardrails.md   # Appendix A
│  │  └─ storage-calibration.md      # Appendix B
│  ├─ principled-coding.md           # teacher's edition + Appendix C framing note
│  ├─ ui-design-principles.md
│  └─ writing-voice-guide.md
└─ variants/
   ├─ full-stack/                     # Next 16 + Supabase + Prisma + Inngest skeleton (§5)
   └─ client-only/                    # React 19 + Vite SPA skeleton (§6)
```

The client installs the plugin once (§10), opens a fresh folder in VSCode, and types
`/goodvibes`. The command resolves the variant and the bundled script copies it (plus
the composed `CLAUDE.md` and `docs/`) into the folder. From there the client builds
with Claude under the always-on rules.

**Why a plugin with bundled variants over a template repo:** the client never touches
GitHub; the deterministic chooser lives where they land; both variants stay real,
CI-tested source inside one distributable. Branch-per-variant and separate-repos-per-
variant were both rejected (a non-technical client cannot be expected to pick the
right branch/repo before they know which they need).

## 4. The `/goodvibes` routine

`commands/goodvibes.md` is a **prompt Claude follows**; the irreversible work is done
by the bundled `scripts/scaffold` so it is deterministic (decision §2.5). The model
is reserved for two soft tasks: classifying the Step 2 answer and writing the Step 4
plain-language summary. Everything else is script logic.

### Step 1 — Greenfield guard (script)
- **HARD-STOP** if the folder contains any of: `package.json`, any lockfile
  (`package-lock.json`, `pnpm-lock.yaml`, `yarn.lock`, `bun.lockb`), a framework
  config (`next.config.*`, `vite.config.*`), an `app/` or `src/` directory, or a
  `.goodvibes` marker. Message, in plain language: *"This folder already has a
  project in it. `/goodvibes` is for starting fresh — open an empty folder and run it
  again."*
- **IGNORE** (do not count as non-empty): `.git`, `.vscode`, `README*`, `LICENSE*`,
  `.gitignore`, and OS cruft (`.DS_Store`, `Thumbs.db`).
- **WARN-AND-CONFIRM** for any other non-empty folder before proceeding.

### Step 2 — The one deterministic question (model classifies, script acts)
Asked in non-coder language, pivoted on **accounts + server-saved data**, never on the
presence of a login:

> "One setup question. Think about what your app needs to keep track of:
> • Will different people have their own accounts and their own data, or does anything
>   need to be saved on a server and persist or be shared between people? → fuller
>   setup.
> • Or does it run entirely in the visitor's browser — a page, tool, dashboard, or
>   presentation? A single shared password you hand to one viewer to keep it private
>   still counts as browser-only. → lighter setup."

**Classifier rules (deterministic given the answer):**
- Individual accounts, or data saved/persisted/shared on a server → **full-stack**.
- Runs entirely in the browser, nothing saved server-side → **client-only**.
- A single shared/hardcoded password, no individual accounts, no server-saved data →
  **client-only, always.**
- If still ambiguous after one disambiguating example each way, **default to
  client-only** (the lighter, fully-runnable, reversible choice) and say so.

**Confirmation echo before the copy:** *"Sounds like a [full-stack / browser-only]
project — want me to set that up?"* The copy only runs on yes. (This catches a
confident-but-wrong answer; the copy is the irreversible step because it writes files
into the folder, not because of any plugin-update policy.)

### Step 3 — Scaffold the variant (script, atomic)
The script stages the full tree in a temp dir, then moves it into the working folder
as the **last** step, so a mid-run failure leaves the target untouched and a re-run
still passes the guard. It never overwrites silently. It writes:
- the chosen variant's scaffold from `${CLAUDE_PLUGIN_ROOT}/variants/<chosen>` (§5/§6
  manifests),
- `CLAUDE.md` at root, **composed** (§8): the body of `kit/system-prompt.md` *below*
  its line-18 `---` (its "How to use this" cross-tool install preamble is excluded as
  dead text inside a CLAUDE.md), concatenated with `kit/_additions/
  integration-guardrails.md` then `kit/_additions/storage-calibration.md`,
- `docs/` carrying `principled-coding.md` (with the Appendix C framing note),
  `ui-design-principles.md`, `writing-voice-guide.md`,
- `.env.example`, `README.md`, `DECISIONS.md` seeded for the chosen variant (§5/§6),
- the client-project CI workflow (§11),
- the **`.goodvibes` marker** — a root JSON file `{ plugin, version, variant,
  generatedAt }` — mirrored as a human-readable version line in `DECISIONS.md`. It is
  provenance only (it is one of the Step-1 hard-stop signals; it is not an input to
  any auto-update path, consistent with the §10 freeze decision).

On partial failure: no half-scaffold is left; surface one plain-language recovery
line (*"Setup didn't finish and nothing was changed. Try running `/goodvibes` again."*).

### Step 4 — Hand off to building (model)
End with a short plain-language summary of what was set up and one next instruction.
For **client-only**: *"You're set up as a browser-only project and it runs now. Tell
me what you want to build first — describe it like you'd explain it to a friend."*
For **full-stack**, additionally state plainly that the app will not start until its
database and background-jobs service are connected, and that this is a guided step
(by the studio, or a later setup step) — so the client is not left at an unexplained
dead end. (Do not build the set-up-services skill here; it is W1.5.)

## 5. Full-stack variant

A minimal but real Next 16 App Router skeleton embodying each load-bearing convention
exactly once. Stack: TS strict + Zod, Supabase (Auth + Postgres), Prisma via driver
adapter, Inngest. Deploys to Vercel.

### File manifest (fixed paths; doubles as the build acceptance checklist)
```
full-stack/
├─ package.json, tsconfig.json, next.config.ts, eslint config, prettier config
├─ .env.example                      # DATABASE_URL + DIRECT_URL, commented (see below)
├─ prisma/schema.prisma              # driver adapter; models incl. Note
├─ prisma/migrations/                # incl. the RLS + non-owner-role + FORCE RLS migration
├─ src/lib/db.ts        [FIXED]      # the ONE scoped data-access wrapper; new PrismaClient() once
├─ src/lib/auth.ts                   # Supabase server-side session derivation
├─ src/lib/result.ts                 # { ok: true, data } | { ok: false, error } helpers
├─ src/actions/notes.ts              # Server Actions: Zod parse, re-derive userId, authorize, act
├─ src/app/error.tsx, not-found.tsx  # route error + 404 boundaries
├─ src/app/notes/...                 # list (RSC scoped query), create/delete (with confirm)
├─ src/inngest/                      # client + one example function (timeout + idempotency key)
├─ tests/isolation.test.ts [FIXED]   # THE keystone cross-user denial test
├─ .github/workflows/ci.yml          # client-project CI (§11)
├─ README.md, DECISIONS.md, .goodvibes
```
The four FIXED-path non-negotiables the client CI (§11) asserts against: the single-
`PrismaClient` scoped wrapper (`src/lib/db.ts`), the keystone test
(`tests/isolation.test.ts`), the RLS migration, and the runtime non-owner-role setup.

### The fortress spine (the centerpiece)
- **Supabase Auth** wired; session derived server-side.
- **One scoped data-access wrapper.** Opens a transaction, `SET LOCAL`s the current
  user id into the session, runs the work, commits. `new PrismaClient()` appears
  exactly once. There is no way to obtain an unscoped client by accident. Prisma talks
  to the transaction pooler at runtime via the pg driver adapter; migrations use the
  direct connection.
- **The pooler caveat (required, easy to miss).** The runtime `DATABASE_URL` uses the
  transaction pooler (port 6543) with `?pgbouncer=true`, which disables Prisma's named
  prepared statements (Supavisor transaction mode does not support them) — needed even
  with the driver adapter, or the app hits intermittent "prepared statement already
  exists" errors under concurrency. `DIRECT_URL` (port 5432) is migrations-only.
  `.env.example` ships both with comments; `DECISIONS.md` records *why*, so the
  inheriting developer does not "fix" it away.
- **Per-user isolation by default.** RLS policies scope every row to the authenticated
  user via the session-set context (`current_setting`). The runtime connects as a
  dedicated non-owner role without `BYPASSRLS`; every tenant table carries
  `FORCE ROW LEVEL SECURITY`; policies fail closed on null context.
- **The keystone test.** Connects as the runtime role, sets user A's context, queries
  for a row planted under user B, asserts zero rows. The single highest-value file in
  the variant; non-negotiable.

### The patterns (each shown once)
- **One example feature, "notes"** (create / list / delete), obviously throwaway and
  domain-neutral. Exercises a Server Action returning the
  `{ ok: true, data } | { ok: false, error }` discriminated union (Zod-parsed input,
  `userId` re-derived from the session, authorize, act); a scoped query in a Server
  Component; a destructive delete with the confirm pattern.
- **One Inngest job** — slow work off the request path (on note created, a timeout-
  bounded, idempotency-keyed enrichment).
- **Error boundaries** — `error.tsx` and `not-found.tsx` with friendly copy.

### UI primitives
Tailwind + Radix primitives (shadcn-style copied components) for the a11y floor,
matching the teacher's edition's assumption. Same semantic-token Tailwind config as
client-only (§6) so design conventions are identical across variants.

### Storage seam and over-provisioning
The scoped wrapper is a clean interface so the backend can vary behind it (§7). W1
wires **Supabase/Postgres** fully and documents the Airtable and DuckDB/MotherDuck
alternatives; those adapters are W1.5. Until then, any server-backed app uses the
Postgres fortress even when light — the acknowledged over-provisioning of §2.10.

### Hygiene and seeded docs
`tsconfig` strict with the real flags (`exactOptionalPropertyTypes`,
`noUncheckedIndexedAccess`, no surviving `any`); `server-only` guard; Prettier + ESLint
(no arbitrary Tailwind values); `.env.example` lists every variable; secrets server-
side only. Seeded `README.md` (what the app is, the stack, run/deploy/env steps, the
"connect services first" note) and `DECISIONS.md` (chosen variant, per-user isolation
default, the pgbouncer decision, the version stamp).

## 6. Client-only variant

A minimal React 19 + Vite + TS-strict SPA, deploys to Vercel as static.

### File manifest
```
client-only/
├─ package.json, tsconfig.json, vite.config.ts, eslint config (no arbitrary values), prettier
├─ tailwind.config.ts                # semantic-only tokens, 4px scale, 1.25 type scale, serif/sans
├─ src/lib/result.ts                 # { ok: true, data } | { ok: false, error }
├─ src/lib/parse.ts                  # Zod edge-parsing helpers
├─ src/lib/duckdb.ts                 # DuckDB-WASM query helper over a bundled dataset
├─ src/data/example.(csv|parquet)    # bundled sample dataset
├─ src/components/ui/                 # Button, Input, Card (Radix-based; a11y floor)
├─ src/components/PasswordGate.tsx    # opt-in shared-password gate + honest note
├─ src/components/ErrorBoundary.tsx
├─ src/App.tsx                        # example: read dataset, Zod-parse, render table/chart
├─ .github/workflows/ci.yml          # typecheck + build + Zod-edge test
├─ README.md, DECISIONS.md, .goodvibes
```

### Conventions it embodies
- **Zod at every external edge** — API responses, URL params, form input, `localStorage`,
  bundled files are parsed before use.
- **The `{ ok: true, data } | { ok: false, error }` result shape** for async work.
- **A React error boundary** + friendly fallback.
- **Calm-tech defaults made concrete** — a `tailwind.config.ts` with semantic-only
  color tokens (no hue names), a 4px spacing scale, a 1.25 type scale, serif-heading /
  sans-body pairing; a no-arbitrary-values lint posture; and starter Button / Input /
  Card built on **Radix** honoring the a11y floor (visible focus ring, 44px touch
  target, `prefers-reduced-motion`, AA contrast). Voice floor from
  `writing-voice-guide.md` applied to all starter copy.
- **DuckDB-WASM option** — a ready pattern for querying a bundled CSV/Parquet entirely
  in the browser (data-viz / dashboard / presentation). Zero setup.
- **The shared-password gate** — opt-in component reading the password from build
  config / env, with the honest note: *"This keeps casual visitors out. It's not real
  security — anyone technical can get past it. If the content is genuinely sensitive,
  choose the fuller setup so it can be protected on the server."*
- **Example feature** — a throwaway that reads the bundled dataset, Zod-parses it, and
  renders a table/chart. The AI replaces it.
- Seeded `README.md` and `DECISIONS.md`; ships its own minimal CI for handoff parity.

### The hard boundary the variant teaches
A browser-only app has no safe place for a secret. The rules make this explicit: the
moment a client-only project wants something needing a key (pull Airtable data, charge
a card), it has outgrown client-only. The integration skill (W1.5) catches this and
guides the jump to full-stack or a single serverless function rather than leaking the
key.

## 7. Storage as a calibration decision

"Match the rigor to the cost-structure of failure" applies to where data lives. Rule
(authored as a CLAUDE.md addition, Appendix B): **pick the lightest store whose
failure the app can afford; climb to Postgres only when the data is multi-user-private
or needs relational integrity and the fortress.** The scoped wrapper interface is
constant across rungs, so conventions hold regardless of backend.

- **DuckDB (browser, via WASM)** — zero setup, no project, no keys; best for read-
  mostly / analytical / data-viz / presentation apps querying a bundled file. Lives in
  client-only. Honest caveat: a *local* DuckDB file on a Vercel function is ephemeral
  and is **not** a persistent server-side read-write store; its server-side home is
  MotherDuck (hosted) for analytics.
- **Airtable** — backing store via API when the client already curates data there.
  Trade-offs: API key must stay server-side (implies at least a serverless function),
  no RLS so per-record isolation is app-enforced, rate-limited and low-volume. Good for
  low-stakes; wrong for sensitive multi-user-private data.
- **Supabase/Postgres** — the full fortress with the per-user isolation keystone.
  Default when data is multi-user-private or needs relational integrity.

**W1 reality:** only DuckDB-WASM (client-only) and Postgres (full-stack) are wired.
The lighter *server* rung (Airtable / MotherDuck behind a serverless function) is
W1.5; until then a server-backed app uses Postgres even when lighter would do
(§2.10). The Appendix B rule states this directly so the over-provisioning is visible.

## 8. The always-on rules (`CLAUDE.md`)

`/goodvibes` composes `CLAUDE.md` deterministically (no model authoring at scaffold
time):

1. `kit/system-prompt.md` is kept **byte-equal to `vibecoder-system-prompt.md`**.
2. Only the body **below its line-18 `---`** is included; the "How to use this" cross-
   tool install preamble (which talks about `.cursorrules`, `.windsurfrules`, "copy
   everything below the line") is excluded as dead text inside a CLAUDE.md.
3. Then `kit/_additions/integration-guardrails.md` (Appendix A), then
   `kit/_additions/storage-calibration.md` (Appendix B), in that order.

Both additions are **W1 deliverables authored in this spec** (Appendices A, B), not
deferred to C. The integration-guardrails text deliberately *consolidates with*
rather than duplicates the system prompt's existing timeout/error-handling language;
its genuinely new content is least-privilege defaults and the write/delete
confirmation. Content polish of the system prompt itself remains C.

## 9. The skill system (build-time behaviors) and the W1 / W1.5 boundary

- **A. Always-on rules** — §8. In W1.
- **B. `/goodvibes`** — §4. In W1.
- **C. "Connect a service" skill** — conducts third-party integrations in plain
  language under the guardrails; emits a vetted adapter (Zod-validated responses,
  timeout, `{ ok }` result). **W1.5.**
- **D. "Set up your services" skill** — guided provisioning of the first-party stack
  the client cannot click through alone (Supabase project, Inngest app); keys into
  `.env`, never the repo. **W1.5.**

The client never memorizes C or D; Claude invokes them on intent, instructed by the
always-on rules. The guardrail *rules* exist in W1 (§8, Appendix A); the interactive
skills that lean on them are W1.5, sequenced with the Airtable/DuckDB adapters they
make safe.

## 10. Packaging, distribution, versioning

- **Packaging:** a standard Claude Code plugin — `.claude-plugin/plugin.json` with
  semver, plus `commands/`, `scripts/`, `skills/`, `kit/`, and bundled `variants/` as
  plain source (no `node_modules`). The scaffold script copies from
  `${CLAUDE_PLUGIN_ROOT}`. Self-containment invariant: the plugin uses no `../`
  references and no symlinks out of the plugin tree (the install cache drops external
  files).
- **Distribution:** a studio-owned marketplace declared by
  `.claude-plugin/marketplace.json` (`name`, `owner`, `plugins[]`), hosted in the same
  repo as the plugin (decision: one repo, simpler source string). Client install is
  two lines (or done during onboarding): `/plugin marketplace add hilowstudio/goodvibes`
  then `/plugin install goodvibes@goodvibes`. GitHub owner: `hilowstudio` (so the
  marketplace repo is `hilowstudio/goodvibes`).
- **Updates (corrected):** a studio-owned marketplace is third-party, where auto-
  update is **off by default**, so `/plugin update` alone will not push new conventions
  to clients. Recommended: enable auto-update for the studio marketplace (per-client
  via the `/plugin` Marketplaces toggle, or fleet-wide via `autoUpdate: true` on the
  `extraKnownMarketplaces` entry in managed settings). Manual fallback:
  `/plugin marketplace update goodvibes`, then apply. This depends on a **version
  policy:** explicit semver in `plugin.json`, bumped every release (CI guard), or
  clients keep the stale cached copy and the `.goodvibes` stamp becomes meaningless.
- **Staleness, deliberate non-fix:** a variant already copied into a client repo is
  frozen and theirs; plugin updates never retroactively mutate scaffolded projects.
  New conventions reach existing projects through the studio at handoff.
- **Verify at build time (Principle Seven):** exact `plugin.json` / `marketplace.json`
  field schemas, `${CLAUDE_PLUGIN_ROOT}` resolution, and the command→script invocation
  mechanism (e.g. a `!`-injected command vs a Bash step) against current Claude Code
  docs. Pin a minimum tested Claude Code version, since these mechanics are version-
  gated and have moved fast.

## 11. Testing and CI

**Plugin-repo CI (GitHub Actions), on every change — keeps both variants honest:**
- Full-stack: the keystone isolation test (see role provisioning below); `tsc` strict;
  lint; `next build`; a unit test on the example's pure logic.
- Client-only: `tsc` strict; lint; `vite build`; a Zod-edge parse test; a render smoke
  test.
- An **install-from-cache** job that runs an actual `/goodvibes` scaffold from the
  installed plugin (not just an in-repo run) and builds the result, so the packaging
  path itself is tested.

**CI role provisioning (or the keystone certifies nothing).** A bare
`postgres:postgres` service container connects as owner/superuser, for whom RLS is
bypassed, so the keystone would *falsely pass*. The CI sequence must: stand up
Postgres; run migrations as the owner over the direct DSN; create the runtime role
**without** `SUPERUSER`/`BYPASSRLS`, with grants and `FORCE RLS`; then run the test
connecting as that runtime role via a **separate runtime DSN**. Both DSNs are workflow
env. The test asserts non-vacuity first — `current_user` is the non-owner role and
lacks `bypassrls`/`superuser` (from `pg_roles`) — before the zero-rows assertion, so a
misconfigured CI fails loudly instead of green.

**Client-project CI.** Both variants ship a workflow. Full-stack runs the isolation
test (with the same role provisioning) + typecheck + build, so the repo the studio
inherits proves "user A cannot read user B's data" green on every commit. Client-only
runs typecheck + build + the Zod-edge test. The client may ignore CI; its audience is
the inheriting developer.

## 12. Scope fence

**In W1:**
- the plugin skeleton + `marketplace.json` + the install/update story (§10);
- `/goodvibes`: prompt command + bundled scaffold script (greenfield guard → the one
  question → confirm → atomic copy → stamp → handoff summary);
- the full-stack variant (per §5 manifest: Supabase-wired fortress + keystone test +
  pgbouncer config, notes example, Inngest reference, adapter seam, Radix/Tailwind UI,
  hygiene, seeded README/DECISIONS/.env.example, client CI with role provisioning);
- the client-only variant (per §6 manifest: React 19 + Vite, Zod edges, result shape,
  error boundary, concrete calm-tech Tailwind + Radix components, DuckDB-WASM, shared-
  password gate, example, seeded docs, minimal CI);
- `CLAUDE.md` composition (§8) **and authoring the two additions** (Appendices A, B);
- the `principled-coding.md` framing note (Appendix C) shipped into `docs/`;
- plugin-repo CI for both variants + the install-from-cache job.

**Explicitly deferred (named, not on a silent someday-list):**
- **W1.5:** the connect-a-service and set-up-services skills; the Airtable and
  DuckDB/MotherDuck adapters; the lighter server storage rung.
- **W2:** the docs-assembly layer (START-HERE, essay relabel, ui-design floor/ceiling
  restructure, the client verification guide, the pre-handoff packet + "what you're
  receiving" doc) and any handoff skills.
- **C:** small content fixes to the four existing docs (Supavisor naming, etc.). Note:
  the deferred `superjson` "documented convention only" note lives in the full-stack
  `DECISIONS.md` so the deferral is visible to the inheriting developer.
- **B:** adopting an existing (non-greenfield) project.
- org/multi-tenant isolation as a built default (teacher's-edition extension; per-user
  is the W1 default).

## 13. Risks and open build-time questions

- **Plugin mechanics to verify** (not assume) before relying on them: the command→
  script invocation mechanism and `${CLAUDE_PLUGIN_ROOT}` resolution; the
  `plugin.json` / `marketplace.json` field schemas; the minimum Claude Code version.
  The copy being script-backed (§2.5) removes the largest risk; what remains is *how*
  the command invokes the script.
- **Marketplace owner string:** resolved to `hilowstudio` (repo `hilowstudio/goodvibes`).
- **External-service first-run friction** (Supabase/Inngest) is acknowledged and
  pushed to W1.5's guided-setup skill; W1 keeps the skeleton's errors legible and the
  Step 4 handoff honest about the not-yet-running state.
- **Inngest long-job ceiling:** the "move long work off the request path" guidance is
  honest only up to the platform ceiling — very long jobs need `streaming: true` and a
  paid Vercel plan (Hobby effectively caps around 300s). Note this where the rule is
  stated so the guidance does not overpromise.

## Appendix A — CLAUDE.md addition: "Connecting outside services"

> ## Connecting outside services
>
> When the person asks to connect an outside service (pull in their Airtable, take
> payments, send email, call another app's API):
>
> - Explain in plain language what you are connecting and what access it needs, before
>   you do it. Pick the connection that fits the job — usually a normal API call. Do
>   not reach for a heavier integration than the task needs.
> - Default to read-only. Ask for permission to write or delete only when the feature
>   genuinely needs it, and confirm it explicitly first by naming what could change in
>   the real system: *"This lets the app change and delete rows in your real Airtable.
>   Do you want that, or just read?"* Wait for a yes.
> - Keep every key and token on the server, never in the browser or anything that
>   ships to it. If a browser-only app needs a key to do this, that is the signal it
>   needs a small server piece — say so, and add the server piece, instead of putting
>   the key where visitors can read it.
> - Treat everything the outside service sends back as untrusted: validate it with Zod
>   before you store it or act on it.
> - Give every outside call a timeout and handle the failure. Never let it hang a
>   request.

## Appendix B — CLAUDE.md addition: "Where data should live"

> ## Where data should live
>
> Match the storage to what the data is worth if it leaks or is lost, the same way you
> match every other kind of care to the stakes. Pick the lightest option that fits;
> only move up when the data needs it.
>
> - If the app runs in the browser and only needs to read a fixed dataset (a
>   dashboard, a chart, a presentation), keep the data in the browser — a bundled file
>   queried with DuckDB-WASM. No database to set up.
> - If different people have their own private data, or the data needs real
>   relationships and integrity, use Postgres (Supabase) with the per-user isolation
>   already wired into this project.
> - In between sits a light server store (for example, the person's existing Airtable,
>   read and written through a small server piece that hides the key). That option is
>   added in a later step of this system; until then, if an app needs to save data on
>   a server at all, use the Postgres setup even if it feels heavier than the job
>   strictly needs. Do not stand up a database for a brochure site or a read-only
>   chart.

## Appendix C — Framing note prepended to `docs/principled-coding.md`

> **Note for the developer who inherits this project.** This essay is the reasoning
> behind the conventions used here. It is written as a worked example against one
> specific app — a children's learning product whose worst-case failure is a cross-
> tenant leak of children's data — so read it for the way of thinking, not the
> specific domain. Two mappings to *this* project: where the essay says
> "organization / tenant isolation," this project's default is the simpler **per-user
> isolation** (user A cannot read user B's data); where it shows a composite
> `(organizationId, parentId)` key, the equivalent move here is scoping every row to
> the signed-in user. The principles are identical; only the worked example's tenant
> boundary differs. If this app grows into teams or organizations, the essay's org-
> level model is the documented path to follow.
