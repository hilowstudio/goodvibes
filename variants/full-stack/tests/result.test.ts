import { describe, it, expect } from "vitest";
import { ok, err, type Result } from "@/lib/result";

describe("result", () => {
  it("ok wraps data in a success result", () => {
    const r: Result<number> = ok(42);
    expect(r).toEqual({ ok: true, data: 42 });
  });

  it("err wraps a message in a failure result", () => {
    const r = err("nope");
    expect(r).toEqual({ ok: false, error: "nope" });
  });

  it("narrows on the ok discriminant", () => {
    const r: Result<string> = ok("hi");
    if (r.ok) {
      expect(r.data.toUpperCase()).toBe("HI");
    } else {
      throw new Error("should be ok");
    }
  });
});
