import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * The ONLY way to read or write tenant data. Opens a transaction, sets the
 * per-user RLS context transaction-locally (SET LOCAL semantics), runs `work`,
 * and commits. RLS denies anything outside the user's rows even if `work` forgets
 * to filter — the wrapper and the database policy fail independently.
 */
export async function runScoped<T>(
  userId: string,
  work: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.current_user_id', ${String(userId)}::text, true)`;
    return work(tx);
  });
}
