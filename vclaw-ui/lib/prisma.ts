import path from "node:path";
import { pathToFileURL } from "node:url";

import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * Vercel serverless mounts the app read-only. SQLite defaults want a writable journal;
 * `?mode=ro` keeps dynamic RSC routes (inbox/bookings/integrations, …) from crashing at request time.
 *
 * The app schema uses `prisma/business.sqlite` (see schema.prisma). Override the client only via
 * `PRISMA_DATABASE_URL` (e.g. Turso/Postgres), to avoid clashing with
 * unrelated tooling env vars.
 */
function vercelReadonlySqliteUrl(): string {
  const abs = path.join(process.cwd(), "prisma", "business.sqlite");
  return `${pathToFileURL(abs).href}?mode=ro`;
}

const prismaDatasourceUrl =
  process.env.PRISMA_DATABASE_URL?.trim() ||
  (process.env.VERCEL ? vercelReadonlySqliteUrl() : undefined);

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
    ...(prismaDatasourceUrl ?
      { datasources: { db: { url: prismaDatasourceUrl } } }
    : {}),
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
