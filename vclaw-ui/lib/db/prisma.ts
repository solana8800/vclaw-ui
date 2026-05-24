import path from "node:path";
import { pathToFileURL } from "node:url";
import os from "node:os";
import fs from "node:fs";
import { DatabaseSync } from "node:sqlite";

import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Prisma's SQLite engine trên Windows từ chối format `file:///F:/…` (triple-slash)
// do pathToFileURL sinh ra, chỉ chấp nhận `file:F:/…`. POSIX dùng pathToFileURL bình thường.
function prismaSqliteUrl(absPath: string): string {
  if (process.platform === "win32") {
    return `file:${absPath.replace(/\\/g, "/")}`;
  }
  return pathToFileURL(absPath).href;
}

function prismaSqliteUrlToPath(url: string): string | null {
  if (!url.startsWith("file:")) return null;
  const withoutQuery = url.split("?")[0];
  if (process.platform === "win32" && /^file:[A-Za-z]:/.test(withoutQuery)) {
    return withoutQuery.slice("file:".length).replace(/\//g, "\\");
  }
  try {
    return decodeURIComponent(new URL(withoutQuery).pathname);
  } catch {
    return null;
  }
}

/**
 * Schema: `prisma/business.sqlite` + `prisma/migrations/`. Cập nhật cột/bảng:
 * `pnpm exec prisma migrate deploy` (không patch runtime từng cột).
 */
function defaultDevSqlitePath(): string {
  return path.join(/* turbopackIgnore: true */ process.cwd(), "prisma", "business.sqlite");
}

/**
 * Vercel Functions có app bundle read-only, chỉ `/tmp` ghi được. Với bản web demo,
 * copy DB seed vào `/tmp` để các thao tác admin không vỡ vì SQLite read-only.
 * Dữ liệu này là tạm thời theo function instance, không dùng làm production DB.
 */
function getVercelDemoSqliteUrl(): string {
  const sourcePath = defaultDevSqlitePath();
  const targetPath = path.join(os.tmpdir(), "vclaw-business-demo.sqlite");

  try {
    const shouldCopy =
      !fs.existsSync(targetPath) ||
      fs.statSync(targetPath).size === 0 ||
      fs.statSync(sourcePath).mtimeMs > fs.statSync(targetPath).mtimeMs;

    if (shouldCopy) {
      fs.copyFileSync(sourcePath, targetPath);
    }
  } catch (error) {
    console.error("[Prisma] Không thể chuẩn bị SQLite demo trong /tmp:", error);
  }

  return prismaSqliteUrl(targetPath);
}

function getDevSqliteUrl(): string | undefined {
  if (process.env.NODE_ENV === "production" || process.env.VERCEL) {
    return undefined;
  }
  return prismaSqliteUrl(defaultDevSqlitePath());
}

/** Production local (.pkg): DB ghi tại ~/.openclaw/business.sqlite */
function getProductionLocalSqliteUrl(): string | undefined {
  if (process.env.NODE_ENV !== "production" || process.env.VERCEL) {
    return undefined;
  }

  const configDir = path.join(os.homedir(), ".openclaw");
  if (!fs.existsSync(configDir)) {
    try {
      fs.mkdirSync(configDir, { recursive: true });
    } catch (e) {
      console.error("Failed to create config directory:", e);
      return undefined;
    }
  }

  return prismaSqliteUrl(path.join(configDir, "business.sqlite"));
}

function sqlitePathFromDatasourceUrl(url?: string): string | null {
  if (!url) return null;
  return prismaSqliteUrlToPath(url);
}

function migrationSqlFiles(): string[] {
  const migrationsDir = path.join(/* turbopackIgnore: true */ process.cwd(), "prisma", "migrations");
  if (!fs.existsSync(migrationsDir)) return [];
  return fs
    .readdirSync(migrationsDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort((a, b) => a.localeCompare(b))
    .map((dir) => path.join(migrationsDir, dir, "migration.sql"))
    .filter((p) => fs.existsSync(p));
}

/** Chỉ khi file DB chưa tồn tại hoặc rỗng — lần đầu cài / ~/.openclaw mới. */
function applyMigrationsToNewDb(dbPath: string): void {
  const sqlFiles = migrationSqlFiles();
  if (sqlFiles.length === 0) {
    console.error("[Prisma] Không có migration SQL. Chạy: pnpm exec prisma migrate deploy");
    return;
  }

  const dbDir = path.dirname(dbPath);
  if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

  const db = new DatabaseSync(dbPath);
  try {
    db.exec("PRAGMA foreign_keys=OFF;");
    for (const file of sqlFiles) {
      const sql = fs.readFileSync(file, "utf8");
      if (sql.trim()) db.exec(sql);
    }
    db.exec("PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL; PRAGMA synchronous=NORMAL;");
    console.log(`[Prisma] Đã tạo DB từ migrations: ${dbPath}`);
  } finally {
    db.close();
  }
}

function isEmptyDbFile(dbPath: string): boolean {
  if (!fs.existsSync(dbPath)) return true;
  try {
    return fs.statSync(dbPath).size === 0;
  } catch {
    return false;
  }
}

/**
 * Không chạy lại migration trên DB đã có dữ liệu (tránh DROP/mất row).
 * DB cũ thiếu cột: `pnpm exec prisma migrate deploy`.
 */
function bootstrapEmptySqliteIfNeeded(url?: string): void {
  if (process.env.VERCEL || process.env.NEXT_PHASE === "phase-production-build") return;

  const dbPath = sqlitePathFromDatasourceUrl(url) ?? defaultDevSqlitePath();
  if (!isEmptyDbFile(dbPath)) return;

  const lockPath = `${dbPath}.bootstrap.lock`;
  let lockFd: number | undefined;
  try {
    lockFd = fs.openSync(lockPath, "wx");
    fs.writeSync(lockFd, String(process.pid));
  } catch {
    return;
  }

  try {
    if (isEmptyDbFile(dbPath)) applyMigrationsToNewDb(dbPath);
  } finally {
    if (lockFd !== undefined) fs.closeSync(lockFd);
    try {
      fs.unlinkSync(lockPath);
    } catch {
      /* */
    }
  }
}

function addSqliteParams(url: string): string {
  if (!url.startsWith("file:")) return url;
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}connection_limit=1&pool_timeout=10`;
}

const rawUrl =
  process.env.PRISMA_DATABASE_URL?.trim() ||
  (process.env.VERCEL
    ? getVercelDemoSqliteUrl()
    : (getProductionLocalSqliteUrl() ?? getDevSqliteUrl()));

const prismaDatasourceUrl = rawUrl ? addSqliteParams(rawUrl) : undefined;

bootstrapEmptySqliteIfNeeded(prismaDatasourceUrl);

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ["error"],
    ...(prismaDatasourceUrl ? { datasources: { db: { url: prismaDatasourceUrl } } } : {}),
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
