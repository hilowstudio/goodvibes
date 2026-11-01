import "server-only";
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// The ONE PrismaClient in the entire variant. Do not instantiate another.
// Runtime uses the pooled DATABASE_URL (port 6543, ?pgbouncer=true), logged in as
// app_runtime. Through the Supabase pooler the username is app_runtime.<project-ref>.
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

// Fail closed. Supabase's default postgres login has BYPASSRLS, which silently
// turns off every row-level security policy, so one user would see everyone's
// data. Refuse to start instead. Only the username is read, so the password
// cannot end up in an error or a log.
const login = /^postgres(?:ql)?:\/\/([^:@/.]+)/.exec(connectionString)?.[1];
if (login !== "app_runtime") {
  throw new Error(
    `DATABASE_URL must log in as app_runtime, not ${login ?? "an unreadable user"}. See DECISIONS.md.`,
  );
}

const adapter = new PrismaPg({ connectionString });

export const prisma = new PrismaClient({ adapter });
