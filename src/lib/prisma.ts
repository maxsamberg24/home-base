import { PrismaClient } from "@/generated/prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Netlify DB injects NETLIFY_DB_URL, not DATABASE_URL — support both so
// local dev (DATABASE_URL in .env) and Netlify both work.
const connectionString = process.env.DATABASE_URL ?? process.env.NETLIFY_DB_URL;

if (!connectionString) {
  throw new Error(
    "No database connection string found (checked DATABASE_URL and NETLIFY_DB_URL). See README."
  );
}

const adapter = new PrismaNeon({ connectionString });

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
