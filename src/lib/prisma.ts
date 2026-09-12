import { PrismaClient } from "@/generated/prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { getConnectionString } from "@netlify/database";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Netlify Database doesn't expose its connection string as a normal env var
// (not even to the build step) — it's only reachable through this SDK, which
// reads a runtime-injected global available inside the deployed app. Local
// dev instead sets DATABASE_URL directly (see .env / README).
function resolveConnectionString(): string {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  try {
    return getConnectionString();
  } catch {
    throw new Error(
      "No database connection string found. Set DATABASE_URL for local dev, or deploy on Netlify with a Netlify DB attached to this site."
    );
  }
}

const adapter = new PrismaNeon({ connectionString: resolveConnectionString() });

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
