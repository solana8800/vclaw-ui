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
function defaultDevSqlitePath(): string {
  return path.join(/* turbopackIgnore: true */ process.cwd(), "prisma", "business.sqlite");
}

function vercelReadonlySqliteUrl(): string {
  return `${pathToFileURL(defaultDevSqlitePath()).href}?mode=ro`;
}

/** Dev/local Next: luôn trỏ tuyệt đối tới `prisma/business.sqlite` (tránh lệch cwd hoặc bản copy trong `.next`). */
function getDevSqliteUrl(): string | undefined {
  if (process.env.NODE_ENV === "production" || process.env.VERCEL) {
    return undefined;
  }
  return pathToFileURL(defaultDevSqlitePath()).href;
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

function sqliteTableExists(dbPath: string, tableName: string): boolean | null {
  try {
    const db = new DatabaseSync(dbPath);
    try {
      const rows = db
        .prepare(
          "SELECT name FROM sqlite_master WHERE type='table' AND name=? LIMIT 1;",
        )
        .all(tableName) as Array<{ name?: string }>;
      return rows.length > 0;
    } finally {
      db.close();
    }
  } catch (e) {
    console.warn(`[Prisma] Không thể kiểm tra bảng ${tableName} tại ${dbPath}:`, e);
    return null;
  }
}

/** DB đã có schema Prisma — không được chạy lại toàn bộ migration SQL (dễ hỏng dữ liệu). */
function isDatabaseInitialized(dbPath: string): boolean {
  const task = sqliteTableExists(dbPath, "Task");
  if (task === true) return true;
  const migrations = sqliteTableExists(dbPath, "_prisma_migrations");
  if (migrations === true) return true;
  const candidate = sqliteTableExists(dbPath, "Candidate");
  if (candidate === true) return true;
  // Không mở được file (busy): coi như đã init để tránh bootstrap phá DB.
  if (task === null && migrations === null && candidate === null) return true;
  return false;
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
 * Chỉ bootstrap file DB mới (chưa tồn tại hoặc size 0).
 * DB đã có bảng: dùng `pnpm exec prisma migrate deploy` — không chạy lại migration SQL thủ công.
 */
function ensureSqliteSchemaReady(url?: string) {
  const isBuildPhase = process.env.NEXT_PHASE === "phase-production-build";
  if (process.env.VERCEL || isBuildPhase) return;

  const dbPath = sqlitePathFromDatasourceUrl(url) ?? defaultDevSqlitePath();

  if (!fs.existsSync(dbPath)) {
    try {
      console.log(`[Prisma] Tạo database mới: ${dbPath}`);
      bootstrapSqliteFromMigrations(dbPath);
      ensureSqliteJournalModeWal(dbPath);
    } catch (e) {
      console.warn("[Prisma] Không thể bootstrap DB (có thể do tiến trình khác đang chạy):", e);
    }
    return;
  }

  try {
    const stats = fs.statSync(dbPath);
    if (stats.size === 0) {
      console.log(`[Prisma] File DB rỗng, bootstrap: ${dbPath}`);
      bootstrapSqliteFromMigrations(dbPath);
    } else if (!isDatabaseInitialized(dbPath)) {
      console.log(`[Prisma] DB chưa có schema, bootstrap lần đầu: ${dbPath}`);
      bootstrapSqliteFromMigrations(dbPath);
    }
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
  (process.env.VERCEL
    ? vercelReadonlySqliteUrl()
    : getProductionLocalSqliteUrl() ?? getDevSqliteUrl());

const prismaDatasourceUrl = rawUrl ? addSqliteParams(rawUrl) : undefined;

ensureSqliteSchemaReady(prismaDatasourceUrl);

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ["error"],
    ...(prismaDatasourceUrl ? { datasources: { db: { url: prismaDatasourceUrl } } } : {}),
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
