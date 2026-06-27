import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { runScoped } from "@/lib/db";
import { resetNotes, seedNote, closePools } from "./setup/db";

const USER_A = "11111111-1111-1111-1111-111111111111";
const USER_B = "22222222-2222-2222-2222-222222222222";

describe("runScoped", () => {
  beforeEach(async () => {
    await resetNotes();
    await seedNote(USER_B, "user B note");
  });

  afterAll(async () => {
    await closePools();
  });

  it("scopes reads to the given user (sees own, not others')", async () => {
    await runScoped(USER_A, async (tx) => {
      const a = await tx.note.findMany();
      expect(a).toHaveLength(0);
    });
    await runScoped(USER_B, async (tx) => {
      const b = await tx.note.findMany();
      expect(b).toHaveLength(1);
    });
  });
});
