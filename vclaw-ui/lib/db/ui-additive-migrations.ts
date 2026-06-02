import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

const LEDGER_TABLE = "_vclaw_ui_migrations";

function sqlStatements(sql: string): string[] {
  return sql
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/--.*$/gm, "")
    .split(";")
    .map((statement) => statement.trim())
    .filter(Boolean);
}

export function assertAdditiveMigrationSql(sql: string): void {
  const allowed = [
    /^CREATE\s+TABLE\s+/i,
    /^CREATE\s+(?:UNIQUE\s+)?INDEX\s+/i,
    /^ALTER\s+TABLE\s+.+\s+ADD\s+(?:COLUMN\s+)?/i,
  ];
  for (const statement of sqlStatements(sql)) {
    if (!allowed.some((pattern) => pattern.test(statement))) {
      throw new Error(`Migration UI không an toàn: ${statement.slice(0, 120)}`);
    }
  }
}
function migrationFiles(migrationsDir: string): string[] {
  if (!fs.existsSync(migrationsDir)) return [];
  return fs
    .readdirSync(migrationsDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".sql"))
    .map((entry) => entry.name)
    .sort((left, right) => left.localeCompare(right));
}

export function applyUiAdditiveMigrations(dbPath: string, migrationsDir: string): void {
  const files = migrationFiles(migrationsDir);
  if (files.length === 0) return;

  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const db = new DatabaseSync(dbPath);
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS "${LEDGER_TABLE}" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "appliedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    const hasApplied = db.prepare(`SELECT 1 FROM "${LEDGER_TABLE}" WHERE "id" = ?`);
    const markApplied = db.prepare(`INSERT INTO "${LEDGER_TABLE}" ("id") VALUES (?)`);

    for (const file of files) {
      if (hasApplied.get(file)) continue;
      const sql = fs.readFileSync(path.join(migrationsDir, file), "utf8");
      assertAdditiveMigrationSql(sql);
      db.exec("BEGIN IMMEDIATE;");
      try {
        db.exec(sql);
        markApplied.run(file);
        db.exec("COMMIT;");
        console.log(`[Prisma] Đã áp dụng migration UI cộng thêm: ${file}`);
      } catch (error) {
        db.exec("ROLLBACK;");
        throw error;
      }
    }
  } finally {
    db.close();
  }
}
