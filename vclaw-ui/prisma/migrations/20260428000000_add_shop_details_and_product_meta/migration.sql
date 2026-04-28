-- AlterTable
ALTER TABLE "Product" ADD COLUMN "metadata" TEXT;
ALTER TABLE "Product" ADD COLUMN "productCode" TEXT;

-- AlterTable
ALTER TABLE "ShopSettings" ADD COLUMN "address" TEXT;
ALTER TABLE "ShopSettings" ADD COLUMN "automationRulesJson" TEXT;
ALTER TABLE "ShopSettings" ADD COLUMN "email" TEXT;
ALTER TABLE "ShopSettings" ADD COLUMN "phone" TEXT;
ALTER TABLE "ShopSettings" ADD COLUMN "shopLogoUrl" TEXT;
ALTER TABLE "ShopSettings" ADD COLUMN "website" TEXT;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_AutomationJob" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL DEFAULT 'OUTBOUND',
    "title" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'QUEUED',
    "target" TEXT,
    "result" TEXT,
    "channel" TEXT,
    "notes" TEXT,
    "draftContent" TEXT,
    "approvalStatus" TEXT NOT NULL DEFAULT 'NONE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_AutomationJob" ("approvalStatus", "channel", "createdAt", "draftContent", "id", "notes", "status", "title", "updatedAt") SELECT "approvalStatus", "channel", "createdAt", "draftContent", "id", "notes", "status", "title", "updatedAt" FROM "AutomationJob";
DROP TABLE "AutomationJob";
ALTER TABLE "new_AutomationJob" RENAME TO "AutomationJob";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Product_productCode_key" ON "Product"("productCode");

