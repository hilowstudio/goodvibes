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
