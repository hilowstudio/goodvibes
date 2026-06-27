import { z } from "zod";
import { ok, err, type Result } from "@/lib/result";

export function parse<T>(schema: z.ZodType<T>, input: unknown): Result<T> {
  const r = schema.safeParse(input);
  return r.success ? ok(r.data) : err(r.error.issues[0]?.message ?? "Invalid data");
}
