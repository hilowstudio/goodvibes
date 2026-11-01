# Decisions

_Dated 2026-06-26._

## Browser-only architecture

This variant runs entirely in the browser with no server component. That means there is nowhere to store a secret safely: any key embedded here is visible to anyone who opens DevTools. If the project needs a server-side secret, it has outgrown the client-only variant.

## Shared-password gate

The `PasswordGate` component is a convenience, not a security control. The password is embedded in the JavaScript bundle and can be extracted trivially. Its purpose is to keep casual visitors out of a work-in-progress or internal tool.

## Tailwind v4 via the Vite plugin

Tailwind v4 is wired in through `@tailwindcss/vite` rather than a PostCSS config. This gives faster incremental builds and uses Tailwind's CSS-first token system instead of a JavaScript config file.

## DuckDB-WASM for in-browser data

DuckDB-WASM provides read-only SQL queries over data loaded entirely in the browser. It adds a large WebAssembly bundle (several MB gzipped). That is an accepted tradeoff for analytical or data-viz apps; for a minimal landing page the bundle weight is not justified and the integration should be removed.

## Zod at every external edge

Zod schemas are applied to every value that crosses an external boundary, including raw DuckDB query results. The `parse` helper wraps `safeParse` and returns a typed `Result` so errors are handled explicitly rather than thrown.

## GoodVibes scaffold

This project was generated with the GoodVibes scaffold. The version is recorded in the `.goodvibes` marker file at the project root, which also holds the `live` flag.

## Deployment goes through the developer

_Dated 2026-11-01._

`CLAUDE.md` tells the assistant not to deploy, and to run the handoff instead. That keeps company code out of personal accounts and means a developer sees the app before real people do. Once the repo is connected to Vercel, every push to `main` is a production deploy, so setting `"live": true` in `.goodvibes` moves `save-to-github` to branches and pull requests.
