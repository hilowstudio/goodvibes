import { inngest } from "@/inngest/client";

// Example background job: runs off the request path when a note is created.
// Idempotency: at most one run per note id per 24h. Replace the body with real work.
// A job has no signed-in user, so the event carries the userId. To read or write
// data here, go through runScoped(event.data.userId, ...); without it RLS shows zero rows.
// NOTE: Inngest v4 merges the trigger into the first config arg (2-arg form).
export const noteCreated = inngest.createFunction(
  {
    id: "note-created-enrichment",
    idempotency: "event.data.noteId",
    retries: 3,
    triggers: [{ event: "note/created" }],
  },
  async ({ event, step }) => {
    await step.run("enrich", async () => {
      return { noteId: event.data.noteId, enrichedAt: new Date().toISOString() };
    });
  },
);
