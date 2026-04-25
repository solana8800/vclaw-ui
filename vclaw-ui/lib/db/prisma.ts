import path from "node:path";
import { pathToFileURL } from "node:url";
import os from "node:os";
import fs from "node:fs";
import { DatabaseSync } from "node:sqlite";

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

  // DB tại ~/.openclaw/business.sqlite: không copy từ bundle (tránh lẫn dữ liệu dev).
  // `ensureSqliteSchemaReady` tạo file rỗng + chạy migration SQL lần đầu.

  return pathToFileURL(dbPath).href;
}

function sqlitePathFromDatasourceUrl(url?: string): string | null {
  if (!url) return null;
  if (!url.startsWith("file:")) return null;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "file:") return null;
    return decodeURIComponent(parsed.pathname);
  } catch {
    return null;
  }
}

/** DB chưa bootstrap: không có bảng Task (migration init chưa chạy). */
function hasTaskTable(dbPath: string): boolean {
  try {
    const db = new DatabaseSync(dbPath);
    try {
      const rows = db.prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='Task' LIMIT 1;",
      ).all() as Array<{ name?: string }>;
      return rows.length > 0;
    } finally {
      db.close();
    }
  } catch {
    return false;
  }
}

function migrationSqlFiles(): string[] {
  const migrationsDir = path.join(process.cwd(), "prisma", "migrations");
  if (!fs.existsSync(migrationsDir)) return [];
  const dirs = fs
    .readdirSync(migrationsDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort((a, b) => a.localeCompare(b));
  const files: string[] = [];
  for (const dir of dirs) {
    const sqlPath = path.join(migrationsDir, dir, "migration.sql");
    if (fs.existsSync(sqlPath)) files.push(sqlPath);
  }
  return files;
}

/**
 * Khởi tạo SQLite bằng cách chạy tuần tự mọi `migration.sql` trong `prisma/migrations/`.
 * Nguồn sự thật schema là chuỗi migration (đã có migration catch-up), không hard-code từng cột ở runtime.
 */
function bootstrapSqliteFromMigrations(dbPath: string): void {
  const sqlFiles = migrationSqlFiles();
  if (sqlFiles.length === 0) {
    console.error("[Prisma] Không tìm thấy migration SQL để khởi tạo database.");
    return;
  }
  const dbDir = path.dirname(dbPath);
  if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

  const db = new DatabaseSync(dbPath);
  try {
    db.exec("PRAGMA foreign_keys=OFF;");
    for (const file of sqlFiles) {
      const sql = fs.readFileSync(file, "utf8");
      if (!sql.trim()) continue;
      db.exec(sql);
    }
    db.exec("PRAGMA foreign_keys=ON;");
    console.log(`[Prisma] Đã khởi tạo SQLite từ migration: ${dbPath}`);
  } finally {
    db.close();
  }
}

/**
 * Chỉ tự bootstrap khi file DB thiếu/rỗng hoặc chưa có schema tối thiểu (bảng Task).
 * Cập nhật schema khi đã có DB: dùng `pnpm exec prisma migrate deploy` (hoặc pipeline deploy), không liệt kê cột ở đây.
 */
function ensureSqliteSchemaReady(url?: string) {
  if (process.env.VERCEL) return;
  const dbPath =
    sqlitePathFromDatasourceUrl(url) ?? path.join(process.cwd(), "prisma", "business.sqlite");
  const missingOrEmpty = !fs.existsSync(dbPath) || fs.statSync(dbPath).size === 0;
  if (missingOrEmpty || !hasTaskTable(dbPath)) {
    bootstrapSqliteFromMigrations(dbPath);
  }
}

const prismaDatasourceUrl =
  process.env.PRISMA_DATABASE_URL?.trim() ||
  (process.env.VERCEL ? vercelReadonlySqliteUrl() : getProductionLocalSqliteUrl());

ensureSqliteSchemaReady(prismaDatasourceUrl);

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
    ...(prismaDatasourceUrl ? { datasources: { db: { url: prismaDatasourceUrl } } } : {}),
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
