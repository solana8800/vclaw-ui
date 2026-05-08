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
  const abs = path.join(/* turbopackIgnore: true */ process.cwd(), "prisma", "business.sqlite");
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
  } catch (e) {
    // Quan trọng: Nếu lỗi do file bị khóa (Busy) hoặc lỗi mở file, 
    // trả về true để TRÁNH việc chạy đè migration gây lỗi "table already exists".
    // Ta chỉ chạy migration khi CHẮC CHẮN là file DB rỗng hoặc bảng không tồn tại.
    console.warn(`[Prisma] Không thể kiểm tra schema tại ${dbPath} (DB có thể đang bận):`, e);
    return true; 
  }
}

function migrationSqlFiles(): string[] {
  const migrationsDir = path.join(/* turbopackIgnore: true */ process.cwd(), "prisma", "migrations");
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
 * Đảm bảo database ở chế độ WAL (Write-Ahead Logging) để hỗ trợ đa tiến trình.
 * Bỏ qua nếu đã ở WAL mode để tránh mở DB đồng thời với Prisma engine (gây SQLITE_IOERR_READ).
 */
function ensureSqliteJournalModeWal(dbPath: string): void {
  try {
    const db = new DatabaseSync(dbPath);
    try {
      const row = db.prepare("PRAGMA journal_mode;").get() as { journal_mode?: string } | undefined;
      if (row?.journal_mode === "wal") return;
      db.exec("PRAGMA journal_mode=WAL;");
      db.exec("PRAGMA synchronous=NORMAL;");
    } finally {
      db.close();
    }
  } catch (e) {
    console.warn(`[Prisma] Không thể cấu hình WAL mode tại ${dbPath}:`, e);
  }
}

/**
 * Chỉ tự bootstrap khi file DB thiếu/rỗng hoặc chưa có schema tối thiểu (bảng Task).
 * Cập nhật schema khi đã có DB: dùng `pnpm exec prisma migrate deploy` (hoặc pipeline deploy), không liệt kê cột ở đây.
 */
function ensureSqliteSchemaReady(url?: string) {
  const isBuildPhase = process.env.NEXT_PHASE === "phase-production-build";
  if (process.env.VERCEL || isBuildPhase) return;

  const dbPath =
    sqlitePathFromDatasourceUrl(url) ??
    path.join(/* turbopackIgnore: true */ process.cwd(), "prisma", "business.sqlite");

  if (!fs.existsSync(dbPath)) {
    try {
      bootstrapSqliteFromMigrations(dbPath);
      ensureSqliteJournalModeWal(dbPath);
    } catch (e) {
      console.warn("[Prisma] Không thể bootstrap DB (có thể do tiến trình khác đang chạy):", e);
    }
    return;
  }

  try {
    const stats = fs.statSync(dbPath);
    if (stats.size === 0 || !hasTaskTable(dbPath)) {
      bootstrapSqliteFromMigrations(dbPath);
    }
    // Luôn đảm bảo WAL mode cho SQLite cục bộ
    ensureSqliteJournalModeWal(dbPath);
  } catch (e) {
    console.warn("[Prisma] Bỏ qua kiểm tra schema tự động do lỗi truy cập file:", e);
  }
}

function addSqliteParams(url: string): string {
  if (!url.startsWith("file:")) return url;
  const separator = url.includes("?") ? "&" : "?";
  // connection_limit=1 giúp SQLite tránh lỗi 'database is locked' khi ghi từ nhiều tiến trình.
  return `${url}${separator}connection_limit=1&pool_timeout=10`;
}

const rawUrl =
  process.env.PRISMA_DATABASE_URL?.trim() ||
  (process.env.VERCEL ? vercelReadonlySqliteUrl() : getProductionLocalSqliteUrl());

const prismaDatasourceUrl = rawUrl ? addSqliteParams(rawUrl) : undefined;

ensureSqliteSchemaReady(prismaDatasourceUrl);

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ["error"],
    ...(prismaDatasourceUrl ? { datasources: { db: { url: prismaDatasourceUrl } } } : {}),
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
