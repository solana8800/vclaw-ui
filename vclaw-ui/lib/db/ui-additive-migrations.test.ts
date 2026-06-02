// @vitest-environment node

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

import { describe, expect, it } from "vitest";

import {
  applyUiAdditiveMigrations,
  assertAdditiveMigrationSql,
} from "@/lib/db/ui-additive-migrations";

function tempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "vclaw-ui-migrations-"));
}

describe("ui additive migrations", () => {
  it("chỉ cho phép câu lệnh cộng thêm schema", () => {
    expect(() =>
      assertAdditiveMigrationSql(`
        CREATE TABLE "FeatureFlag" ("id" TEXT PRIMARY KEY);
        ALTER TABLE "FeatureFlag" ADD COLUMN "enabled" INTEGER NOT NULL DEFAULT 0;
        CREATE INDEX "FeatureFlag_enabled_idx" ON "FeatureFlag"("enabled");
      `),
    ).not.toThrow();

    expect(() => assertAdditiveMigrationSql('DROP TABLE "Customer";')).toThrow(
      /không an toàn/,
    );
  });

  it("apply mỗi file đúng một lần và ghi ledger", () => {
    const dir = tempDir();
    const dbPath = path.join(dir, "business.sqlite");
    const migrationsDir = path.join(dir, "migrations");
    fs.mkdirSync(migrationsDir);
    fs.writeFileSync(
      path.join(migrationsDir, "202606020001_add_feature_flag.sql"),
      'CREATE TABLE "FeatureFlag" ("id" TEXT NOT NULL PRIMARY KEY);\n',
    );

    applyUiAdditiveMigrations(dbPath, migrationsDir);
    applyUiAdditiveMigrations(dbPath, migrationsDir);

    const db = new DatabaseSync(dbPath);
    try {
      const ledger = db
        .prepare('SELECT "id" FROM "_vclaw_ui_migrations" ORDER BY "id"')
        .all() as Array<{ id: string }>;
      const table = db
        .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'FeatureFlag'")
        .get();
      expect(ledger).toEqual([{ id: "202606020001_add_feature_flag.sql" }]);
      expect(table).toEqual({ name: "FeatureFlag" });
    } finally {
      db.close();
    }
  });
});
