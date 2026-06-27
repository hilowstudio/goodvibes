import { z } from "zod";
import { ok, err, type Result } from "./result.js";

// The token is read from server-side env only. Create a READ-ONLY personal access
// token (scope data.records:read) by default. Only use a token with
// data.records:write when a feature genuinely needs to create or change records,
// and confirm that with the person first.
const BASE_URL = "https://api.airtable.com/v0";
const TIMEOUT_MS = 10_000;

function token(): string {
  const t = process.env["AIRTABLE_TOKEN"];
  if (!t) throw new Error("AIRTABLE_TOKEN is not set");
  return t;
}

async function call(path: string, init?: RequestInit): Promise<Result<unknown>> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${BASE_URL}/${path}`, {
      ...init,
      signal: controller.signal,
      headers: { Authorization: `Bearer ${token()}`, "Content-Type": "application/json", ...init?.headers },
    });
    if (!res.ok) return err(`Airtable request failed (${res.status})`);
    return ok((await res.json()) as unknown);
  } catch {
    return err("Airtable request timed out or failed");
  } finally {
    clearTimeout(timer);
  }
}

const ListResponse = z.object({
  records: z.array(z.object({ id: z.string(), fields: z.record(z.string(), z.unknown()) })),
  offset: z.string().optional(),
});

/** Read records from a table. Read-only; the default and safest operation. */
export async function listRecords(
  baseId: string,
  table: string,
): Promise<Result<Array<{ id: string; fields: Record<string, unknown> }>>> {
  const r = await call(`${baseId}/${encodeURIComponent(table)}`);
  if (!r.ok) return r;
  const parsed = ListResponse.safeParse(r.data);
  if (!parsed.success) return err("Airtable returned data in an unexpected shape");
  return ok(parsed.data.records);
}

/**
 * Create a record. WRITE operation: requires a token with data.records:write and an
 * explicit yes from the person, since it changes their real Airtable data.
 */
export async function createRecord(
  baseId: string,
  table: string,
  fields: Record<string, unknown>,
): Promise<Result<{ id: string }>> {
  const r = await call(`${baseId}/${encodeURIComponent(table)}`, {
    method: "POST",
    body: JSON.stringify({ fields }),
  });
  if (!r.ok) return r;
  const parsed = z.object({ id: z.string() }).safeParse(r.data);
  if (!parsed.success) return err("Airtable returned data in an unexpected shape");
  return ok({ id: parsed.data.id });
}
