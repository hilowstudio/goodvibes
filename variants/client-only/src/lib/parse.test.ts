import { describe, it, expect } from "vitest";
import { z } from "zod";
import { parse } from "@/lib/parse";

describe("parse", () => {
  it("returns ok with valid data", () => {
    const r = parse(z.object({ n: z.number() }), { n: 1 });
    expect(r).toEqual({ ok: true, data: { n: 1 } });
  });
  it("returns err with a message on invalid data", () => {
    const r = parse(z.object({ n: z.number() }), { n: "x" });
    expect(r.ok).toBe(false);
  });
});
