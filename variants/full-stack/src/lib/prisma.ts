import "server-only";
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// The ONE PrismaClient in the entire variant. Do not instantiate another.
// Runtime uses the pooled DATABASE_URL (port 6543, ?pgbouncer=true).
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}
const adapter = new PrismaPg({ connectionString });

export const prisma = new PrismaClient({ adapter });
