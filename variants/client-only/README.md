# GoodVibes client-only

A browser-only starter for a page, tool, dashboard, or presentation that runs entirely client-side. Nothing to provision; open it and it works.

## Stack

- React 19
- Vite with TypeScript (strict)
- Tailwind v4 (via `@tailwindcss/vite`)
- DuckDB-WASM for in-browser data queries
- Zod for runtime validation

## Setup

```sh
npm install
npm run dev      # local dev server with HMR
npm run build    # production build to dist/
```

## Optional shared-password gate

Set `VITE_GATE_PASSWORD` in a `.env` file (copy `.env.example` as a starting point). When set, visitors must enter that password before seeing the page. This is a privacy measure, not a security control: the password ships in the bundle and is visible to anyone who inspects it.

## In-browser data with DuckDB-WASM

The DuckDB-WASM integration lets you query a bundled dataset directly in the browser with no server required. Be aware that it ships a large WebAssembly bundle (several MB gzipped). This tradeoff is well-suited to analytical or data-viz apps but is overkill for a minimal brochure page.

## Deploying to Vercel

Vercel auto-detects the Vite project and builds to `dist/`. The included `vercel.json` rewrites all routes to `index.html` so client-side routing works correctly.

## Tests

```sh
npm test
```

Tests use Vitest and React Testing Library with a jsdom environment.
