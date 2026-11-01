import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { runScoped } from "@/lib/db";
import { prisma } from "@/lib/prisma";
import { clearNotes, closePool, seedNote } from "./setup/db";

const USER_A = "11111111-1111-1111-1111-111111111111";
const USER_B = "22222222-2222-2222-2222-222222222222";

// Everything here goes through the app's own client and runScoped, the same path a
// page takes. The queries carry no userId filter on purpose: the database has to
// hold the line even when app code forgets to.
describe("tenant isolation (keystone)", () => {
  beforeEach(async () => {
    await clearNotes([USER_A, USER_B]);
    await seedNote(USER_B, "user B private note");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  afterAll(async () => {
    await clearNotes([USER_A, USER_B]);
    await closePool();
    await prisma.$disconnect();
  });

  it("non-vacuity: the app's login is non-owner, non-superuser, non-bypassrls", async () => {
    const [role] = await prisma.$queryRaw<
      { rolname: string; rolsuper: boolean; rolbypassrls: boolean; owns_notes: boolean }[]
    >`
      SELECT rolname::text, rolsuper, rolbypassrls,
        pg_has_role(current_user, (SELECT tableowner FROM pg_tables
          WHERE schemaname = 'public' AND tablename = 'notes'), 'USAGE') AS owns_notes
      FROM pg_roles WHERE rolname = current_user`;
    expect(role).toEqual({
      rolname: "app_runtime",
      rolsuper: false,
      rolbypassrls: false,
      owns_notes: false,
    });
  });

  it("refuses to start on a login that bypasses RLS", async () => {
    vi.resetModules();
    vi.stubEnv("DATABASE_URL", "postgresql://postgres.abcdef:pw@host:6543/postgres");
    await expect(import("@/lib/prisma")).rejects.toThrow(/must log in as app_runtime/);
  });

  it("every table has row-level security enabled and forced", async () => {
    const unprotected = await prisma.$queryRaw<{ relname: string }[]>`
      SELECT c.relname::text FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public'
        AND c.relkind IN ('r', 'p')
        AND c.relname <> '_prisma_migrations'
        AND NOT (c.relrowsecurity AND c.relforcerowsecurity)`;
    expect(unprotected).toEqual([]);
  });

  it("denies: user A sees zero of user B's rows", async () => {
    const rows = await runScoped(USER_A, (tx) => tx.note.findMany());
    expect(rows).toHaveLength(0);
  });

  it("positive control: user B sees their own row", async () => {
    const rows = await runScoped(USER_B, (tx) => tx.note.findMany());
    expect(rows).toHaveLength(1);
  });

  it("denies: user A cannot change or delete user B's rows", async () => {
    const updated = await runScoped(USER_A, (tx) =>
      tx.note.updateMany({ data: { content: "changed by user A" } }),
    );
    const deleted = await runScoped(USER_A, (tx) => tx.note.deleteMany());
    expect(updated.count).toBe(0);
    expect(deleted.count).toBe(0);

    const rows = await runScoped(USER_B, (tx) => tx.note.findMany());
    expect(rows.map((note) => note.content)).toEqual(["user B private note"]);
  });

  it("denies: user A cannot write a row as user B", async () => {
    await expect(
      runScoped(USER_A, (tx) => tx.note.create({ data: { userId: USER_B, content: "forged" } })),
    ).rejects.toThrow();
  });

  it("fail-closed: with no context set, zero rows are visible", async () => {
    // The first call proves a finished runScoped leaves nothing behind on the
    // pooled connection for the next query to inherit.
    await runScoped(USER_B, (tx) => tx.note.findMany());
    const rows = await prisma.note.findMany();
    expect(rows).toHaveLength(0);
  });
});
