# Plan 3 — GoodVibes Plugin Wrapper Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`).

**Goal:** Turn the repo into the installable GoodVibes Claude Code plugin: the `.claude-plugin` manifests, the `kit/` docs (assembled from the existing root docs + the two authored rule additions), the `/goodvibes` command + a deterministic scaffold script (greenfield guard → one variant question → copy variant + compose CLAUDE.md + copy docs + version stamp), and the monorepo CI that finally runs both variants' tests (the full-stack keystone executes here) plus a scaffold smoke test.

**Architecture:** The plugin IS the repo root. `commands/goodvibes.md` is a prompt Claude follows; the irreversible file work runs in `scripts/scaffold.mjs` (deterministic). `${CLAUDE_PLUGIN_ROOT}` resolves to the install dir; the command passes it to the script. The two bundled `variants/` are copied into the client's fresh project by the script.

**Tech Stack:** Claude Code plugin (v2.1.100+), Node.js (ESM scaffold script), GitHub Actions.

**Builds on:** Plans 1/1b/2 (the two `variants/`); the four root docs (`principled-coding.md`, `vibecoder-system-prompt.md`, `ui-design-principles.md`, `writing-voice-guide.md`); the spec's Appendices A/B/C for the two additions + framing note.

## Global Constraints

- **The plugin is the repo root.** `.claude-plugin/{plugin.json,marketplace.json}`, `commands/`, `scripts/`, `kit/`, and the existing `variants/` all at root. Do not nest the plugin in a subdir.
- **Deterministic file ops live in `scripts/scaffold.mjs`**, not in the command prose. The command's only soft step is asking the one variant question.
- **`kit/system-prompt.md` is byte-equal to the current `vibecoder-system-prompt.md`.** Content polish of that prompt is sub-project "C", not here. Only `kit/_additions/*` are newly authored here.
- **Greenfield guard (hard-stop signals):** any of `package.json`, a lockfile, `next.config.*`/`vite.config.*`, `app/` or `src/`, or a `.goodvibes` marker → stop. Ignore: `.git`, `.vscode`, `README*`, `LICENSE*`, `.gitignore`, OS cruft. Otherwise non-empty → warn/confirm.
- **CLAUDE.md composition:** body of `kit/system-prompt.md` BELOW its line-18 `---` (exclude the "How to use this" preamble) + `kit/_additions/integration-guardrails.md` + `kit/_additions/storage-calibration.md`, in that order.
- **Min Claude Code v2.1.100+** (documented in README).

> **Verify-at-build (confirmed mechanics, two open specifics):** plugin.json/marketplace.json/`${CLAUDE_PLUGIN_ROOT}`/install+update all verified against code.claude.com/docs. Open: (1) the exact `source` for a root-level plugin listed by a same-repo marketplace (try `"."`/`"./"`, else `{ "source": "github", "repo": "hilowstudio/goodvibes" }`); (2) exactly how `${CLAUDE_PLUGIN_ROOT}` reaches the script (pass it as a CLI arg from the command, which is the robust path). Confirm both when testing the install.

---

### Task 1: Plugin manifests + kit assembly

**Files:**
- Create `.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json`
- Move: `vibecoder-system-prompt.md` → `kit/system-prompt.md`; `principled-coding.md` → `kit/principled-coding.md`; `ui-design-principles.md` → `kit/ui-design-principles.md`; `writing-voice-guide.md` → `kit/writing-voice-guide.md` (use `git mv`, preserve content)
- Create `kit/_additions/integration-guardrails.md`, `kit/_additions/storage-calibration.md`
- Prepend the framing note to `kit/principled-coding.md`

- [ ] **Step 1: `.claude-plugin/plugin.json`**
```json
{
  "name": "goodvibes",
  "version": "0.1.0",
  "description": "Hi-Low Studio's starter kit: scaffold a production-shaped Next.js or React app and build it with disciplined, handoff-ready conventions.",
  "author": { "name": "Hi-Low Studio" }
}
```

- [ ] **Step 2: `.claude-plugin/marketplace.json`**
```json
{
  "name": "goodvibes",
  "owner": { "name": "Hi-Low Studio" },
  "plugins": [
    {
      "name": "goodvibes",
      "source": ".",
      "description": "Scaffold and build production-shaped apps on the Hi-Low Studio stack."
    }
  ]
}
```
> Verify-at-build: if `"source": "."` is rejected for a root plugin, use `{ "source": "github", "repo": "hilowstudio/goodvibes" }`. Confirm with `/plugin marketplace add` against the repo.

- [ ] **Step 3: Move the four docs into `kit/`** (git mv, content unchanged)
```bash
mkdir -p kit/_additions
git mv vibecoder-system-prompt.md kit/system-prompt.md
git mv principled-coding.md kit/principled-coding.md
git mv ui-design-principles.md kit/ui-design-principles.md
git mv writing-voice-guide.md kit/writing-voice-guide.md
```

- [ ] **Step 4: Prepend the framing note to `kit/principled-coding.md`** (Appendix C from the spec), as a blockquote at the very top, above the existing `# What a Perfect Codebase Looks Like Here`:
```markdown
> **Note for the developer who inherits this project.** This essay is the reasoning
> behind the conventions used here. It is written as a worked example against one
> specific app, a children's learning product whose worst-case failure is a cross-
> tenant leak of children's data, so read it for the way of thinking, not the
> specific domain. Two mappings to this project: where the essay says
> "organization / tenant isolation," this project's default is the simpler per-user
> isolation (user A cannot read user B's data); where it shows a composite
> (organizationId, parentId) key, the equivalent here is scoping every row to the
> signed-in user. The principles are identical; only the worked example's tenant
> boundary differs. If this app grows into teams, the essay's org model is the
> documented path to follow.

```
(No em dashes in the note. Keep the rest of the essay byte-unchanged.)

- [ ] **Step 5: `kit/_additions/integration-guardrails.md`** (spec Appendix A; voice floor, no em dashes)
```markdown
## Connecting outside services

When the person asks to connect an outside service (pull in their Airtable, take
payments, send email, call another app's API):

- Explain in plain language what you are connecting and what access it needs, before
  you do it. Pick the connection that fits the job, usually a normal API call. Do not
  reach for a heavier integration than the task needs.
- Default to read-only. Ask for permission to write or delete only when the feature
  genuinely needs it, and confirm it explicitly first by naming what could change in
  the real system: "This lets the app change and delete rows in your real Airtable.
  Do you want that, or just read?" Wait for a yes.
- Keep every key and token on the server, never in the browser or anything that ships
  to it. If a browser-only app needs a key to do this, that is the signal it needs a
  small server piece. Say so, and add the server piece, instead of putting the key
  where visitors can read it.
- Treat everything the outside service sends back as untrusted: validate it with Zod
  before you store it or act on it.
- Give every outside call a timeout and handle the failure. Never let it hang a
  request.
```

- [ ] **Step 6: `kit/_additions/storage-calibration.md`** (spec Appendix B; voice floor)
```markdown
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
```

- [ ] **Step 7: Verify** — the four kit docs exist; `git status` shows the moves; the two additions + framing note are present and em-dash-free (`grep -c "—" kit/_additions/*.md kit/principled-coding.md` → check the note line only, the essay body is unchanged).

- [ ] **Step 8: Commit**
```bash
git add .claude-plugin kit
git commit -m "feat(plugin): plugin + marketplace manifests and assembled kit docs"
```

---

### Task 2: The `/goodvibes` command + scaffold script

**Files:**
- Create `commands/goodvibes.md`
- Create `scripts/scaffold.mjs`

- [ ] **Step 1: `commands/goodvibes.md`**
```markdown
---
description: Start a new GoodVibes project. Picks the right setup (full-stack or browser-only) and scaffolds it into the current empty folder.
---

You are starting a new GoodVibes project in the user's current folder.

## Step 1 — Check the folder is empty (greenfield)
Run the guard:

\`\`\`bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/scaffold.mjs" check --cwd "$(pwd)"
\`\`\`

If it exits non-zero, STOP and tell the user, in plain language: "This folder already
has a project in it. /goodvibes is for starting fresh. Open an empty folder and run
it again." Do not continue.

## Step 2 — Ask the one setup question
Ask the user, in plain language:

"One setup question. Think about what your app needs to keep track of. Will different
people have their own accounts and their own data, or does anything need to be saved
on a server and persist or be shared between people? Or does it run entirely in the
visitor's browser, like a page, tool, dashboard, or presentation? A single shared
password you hand to one viewer to keep it private still counts as browser-only."

Classify their answer deterministically:
- Individual accounts, or data saved/persisted/shared on a server -> "full-stack".
- Runs entirely in the browser, nothing saved server-side -> "client-only".
- A single shared/hardcoded password, no accounts, no server-saved data ->
  "client-only", always.
If unclear, give one example each way, then classify.

Confirm before scaffolding: "Sounds like a [full-stack / browser-only] project. Want
me to set that up?" Only proceed on yes.

## Step 3 — Scaffold the chosen variant
Run (substitute the chosen variant):

\`\`\`bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/scaffold.mjs" create --variant <full-stack|client-only> --plugin-root "${CLAUDE_PLUGIN_ROOT}" --cwd "$(pwd)"
\`\`\`

## Step 4 — Hand off to building
Summarize what was set up in plain language. For client-only: "You are set up as a
browser-only project and it runs now. Tell me what you want to build first, like you
would explain it to a friend." For full-stack: also say plainly that the app will not
start until its database and background-jobs service are connected, and that this is a
guided step. Then follow CLAUDE.md for everything after.
```

- [ ] **Step 2: `scripts/scaffold.mjs`** (deterministic guard + copy + compose + stamp)
```js
#!/usr/bin/env node
import { argv } from "node:process";
import { cpSync, existsSync, readdirSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, resolve } from "node:path";

function arg(name) {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 ? argv[i + 1] : undefined;
}

const cmd = argv[2];
const cwd = resolve(arg("cwd") ?? process.cwd());

// Greenfield guard.
const HARD_STOP = ["package.json", "next.config.ts", "next.config.js", "next.config.mjs",
  "vite.config.ts", "vite.config.js", "app", "src", ".goodvibes",
  "package-lock.json", "pnpm-lock.yaml", "yarn.lock", "bun.lockb"];
const IGNORE = new Set([".git", ".vscode", "README.md", "LICENSE", ".gitignore",
  ".DS_Store", "Thumbs.db"]);

function isGreenfield(dir) {
  for (const sig of HARD_STOP) if (existsSync(join(dir, sig))) return false;
  const leftover = readdirSync(dir).filter((f) => !IGNORE.has(f));
  return leftover.length === 0 ? true : "warn";
}

if (cmd === "check") {
  const g = isGreenfield(cwd);
  if (g === false) { console.error("not-greenfield"); process.exit(1); }
  if (g === "warn") { console.error("non-empty"); process.exit(2); }
  console.log("greenfield"); process.exit(0);
}

if (cmd === "create") {
  const variant = arg("variant");
  const pluginRoot = resolve(arg("plugin-root") ?? ".");
  if (variant !== "full-stack" && variant !== "client-only") {
    console.error(`unknown variant: ${variant}`); process.exit(1);
  }
  // 1. Copy the variant into cwd, skipping deps and build artifacts.
  const SKIP = new Set(["node_modules", "dist", ".next", ".git"]);
  cpSync(join(pluginRoot, "variants", variant), cwd, {
    recursive: true,
    filter: (src) => !src.split(/[\\/]/).some((seg) => SKIP.has(seg)),
  });

  // 2. Compose CLAUDE.md: system-prompt body below the line-18 '---' + the two additions.
  const sp = readFileSync(join(pluginRoot, "kit", "system-prompt.md"), "utf8");
  const marker = sp.indexOf("\n---\n");
  const body = marker >= 0 ? sp.slice(marker + 5) : sp;
  const add1 = readFileSync(join(pluginRoot, "kit", "_additions", "integration-guardrails.md"), "utf8");
  const add2 = readFileSync(join(pluginRoot, "kit", "_additions", "storage-calibration.md"), "utf8");
  writeFileSync(join(cwd, "CLAUDE.md"), `${body.trim()}\n\n${add1.trim()}\n\n${add2.trim()}\n`);

  // 3. Copy the developer-facing docs into docs/.
  const docsDir = join(cwd, "docs");
  mkdirSync(docsDir, { recursive: true });
  for (const d of ["principled-coding.md", "ui-design-principles.md", "writing-voice-guide.md"]) {
    cpSync(join(pluginRoot, "kit", d), join(docsDir, d));
  }

  // 4. Version stamp.
  const manifest = JSON.parse(readFileSync(join(pluginRoot, ".claude-plugin", "plugin.json"), "utf8"));
  const stamp = { plugin: "goodvibes", version: manifest.version ?? "unknown", variant, generatedAt: arg("now") ?? "" };
  writeFileSync(join(cwd, ".goodvibes"), JSON.stringify(stamp, null, 2) + "\n");

  console.log(`scaffolded ${variant} (goodvibes ${stamp.version})`);
  process.exit(0);
}

console.error(`usage: scaffold.mjs check|create [...]`); process.exit(1);
```
> Notes: the script is pure Node (no deps). `cpSync(src, cwd, {recursive})` copies the variant tree into the project root. The `--now` arg lets the caller stamp a timestamp (the command may pass one; otherwise empty). Verify-at-build: confirm `${CLAUDE_PLUGIN_ROOT}` substitutes into the bash invocation so the script receives the real plugin path; if not, adjust the command to capture it another supported way.

- [ ] **Step 3: Verify the script locally (dry run into a temp dir)** — this is the script's own test:
```bash
TMP=$(mktemp -d)
node scripts/scaffold.mjs check --cwd "$TMP"            # expect "greenfield", exit 0
node scripts/scaffold.mjs create --variant client-only --plugin-root "$(pwd)" --cwd "$TMP"
test -f "$TMP/package.json" && test -f "$TMP/CLAUDE.md" && test -f "$TMP/.goodvibes" && test -f "$TMP/docs/principled-coding.md" && echo "SCAFFOLD OK"
node scripts/scaffold.mjs check --cwd "$TMP"            # expect non-zero now (not greenfield)
```
Expected: greenfield then scaffold creates package.json + CLAUDE.md (starts with the system-prompt body, not the "How to use this" preamble) + .goodvibes + docs/. Then the guard rejects the now-populated dir.

- [ ] **Step 4: Commit**
```bash
git add commands scripts
git commit -m "feat(plugin): /goodvibes command and deterministic scaffold script"
```

---

### Task 3: Monorepo CI (test both variants + scaffold smoke test)

**Files:**
- Create `.github/workflows/ci.yml` (repo root — the monorepo's own CI; distinct from the per-variant CIs that travel with the variants)

- [ ] **Step 1: `.github/workflows/ci.yml`**
```yaml
name: goodvibes monorepo CI
on:
  push:
  pull_request:

jobs:
  full-stack:
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
      DIRECT_URL: postgresql://postgres:ownerpw@localhost:5432/postgres
      RUNTIME_DATABASE_URL: postgresql://app_runtime:runtimepw@localhost:5432/postgres
      DATABASE_URL: postgresql://app_runtime:runtimepw@localhost:5432/postgres
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: npm, cache-dependency-path: variants/full-stack/package-lock.json }
      - run: npm ci
      - run: npm run prisma:generate
      - name: Apply migrations as owner
        run: |
          psql "$DIRECT_URL" -v ON_ERROR_STOP=1 -f prisma/migrations/0001_init/migration.sql
          psql "$DIRECT_URL" -v ON_ERROR_STOP=1 -f prisma/migrations/0002_rls/migration.sql
      - name: Create non-owner runtime role
        run: psql "$DIRECT_URL" -v ON_ERROR_STOP=1 -c "SET goodvibes.runtime_password = 'runtimepw';" -f prisma/sql/runtime-role.sql
      - run: npm run typecheck
      - run: npm run lint
      - run: npm test
      - run: npm run build

  client-only:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: variants/client-only
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: npm, cache-dependency-path: variants/client-only/package-lock.json }
      - run: npm ci
      - run: npm run build
      - run: npm run lint
      - run: npm test

  scaffold-smoke:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22 }
      - name: Scaffold script produces a clean project
        run: |
          TMP=$(mktemp -d)
          node scripts/scaffold.mjs check --cwd "$TMP"
          node scripts/scaffold.mjs create --variant client-only --plugin-root "$(pwd)" --cwd "$TMP"
          test -f "$TMP/package.json"
          test -f "$TMP/CLAUDE.md"
          test -f "$TMP/.goodvibes"
          test -f "$TMP/docs/principled-coding.md"
          head -1 "$TMP/CLAUDE.md" | grep -vq "How to use this"
          if node scripts/scaffold.mjs check --cwd "$TMP"; then echo "guard should have failed on populated dir"; exit 1; fi
          echo "scaffold smoke OK"
```
> Note: this monorepo CI uses `working-directory: variants/<v>` (the variants ARE subdirs here, unlike the copied-out client project). The full-stack job runs the KEYSTONE test for real (this is where the deferred isolation proof finally executes). The scaffold-smoke job proves the `/goodvibes` copy/compose/stamp path.

- [ ] **Step 2: Verify** — the scaffold-smoke steps run locally (already verified in Task 2 Step 3). YAML-lint the workflow by eye (3 jobs; full-stack provisions the role; both variant jobs run lint).

- [ ] **Step 3: Commit**
```bash
git add .github/workflows/ci.yml
git commit -m "ci(plugin): monorepo CI runs both variants (keystone included) and a scaffold smoke test"
```

---

## Self-Review

**1. Spec coverage (against spec §3, §4, §8, §9, §10, §11, §12):** plugin.json + marketplace.json — Task 1. kit/ assembly + the two additions + framing note — Task 1. `/goodvibes` command + scaffold script (guard, one question, copy-in, CLAUDE.md composition, docs/, version stamp) — Task 2. Monorepo CI (both variants + keystone + install/scaffold smoke) — Task 3. ✓ Skills C/D (connect-a-service, set-up-services) are W1.5, correctly excluded.

**2. Placeholder scan:** The two verify-at-build items (same-repo marketplace source; `${CLAUDE_PLUGIN_ROOT}` arg substitution) are explicit confirm-at-install points with current-best forms, not TODOs. The scaffold script and CI are complete and runnable.

**3. Consistency:** The scaffold script's greenfield signals match the spec §4 Step 1 list. CLAUDE.md composition matches spec §8 (body below line-18 `---` + the two additions in order). The version-stamp shape matches spec §4 Step 3 (`.goodvibes` JSON). The monorepo CI's full-stack job reuses the same role-provisioning the per-variant CI uses (working-directory differs because variants are subdirs in the monorepo).

**4. Risks:** The only unverified specifics are the two install-time items above; the scaffold script is plain Node and is self-tested by the smoke job. The full-stack keystone finally runs in the monorepo CI's full-stack job, closing the deferred-verification gap.
