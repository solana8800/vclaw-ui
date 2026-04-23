import path from "node:path";
import { pathToFileURL } from "node:url";
import os from "node:os";
import fs from "node:fs";

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

/**
 * Trong môi trường production local (cài qua .pkg hoặc chạy binary), 
 * chúng ta cần dùng database ở thư mục người dùng (~/.openclaw) để có quyền ghi.
 */
function getProductionLocalSqliteUrl(): string | undefined {
  if (process.env.NODE_ENV !== "production" || process.env.VERCEL) {
    return undefined;
  }

  const configDir = path.join(os.homedir(), ".openclaw");
  const dbPath = path.join(configDir, "business.sqlite");

  if (!fs.existsSync(configDir)) {
    try {
      fs.mkdirSync(configDir, { recursive: true });
    } catch (e) {
      console.error("Failed to create config directory:", e);
      return undefined;
    }
  }

  // Nếu chưa có file DB ở thư mục người dùng, hãy copy từ bundle
  if (!fs.existsSync(dbPath)) {
    const bundledDb = path.join(process.cwd(), "prisma", "business.sqlite");
    if (fs.existsSync(bundledDb)) {
      try {
        fs.copyFileSync(bundledDb, dbPath);
        console.log(`[Prisma] Đã khởi tạo database từ bundle: ${dbPath}`);
      } catch (e) {
        console.error("[Prisma] Lỗi copy database mẫu:", e);
      }
    }
  }

  return pathToFileURL(dbPath).href;
}

const prismaDatasourceUrl =
  process.env.PRISMA_DATABASE_URL?.trim() ||
  (process.env.VERCEL ? vercelReadonlySqliteUrl() : getProductionLocalSqliteUrl());

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
    ...(prismaDatasourceUrl ?
      { datasources: { db: { url: prismaDatasourceUrl } } }
    : {}),
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
