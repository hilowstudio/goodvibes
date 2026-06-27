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
