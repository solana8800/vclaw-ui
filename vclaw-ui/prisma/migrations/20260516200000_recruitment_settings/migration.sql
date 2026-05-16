-- Tách cấu hình tuyển dụng khỏi ShopSettings
CREATE TABLE "RecruitmentSettings" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'default',
    "linxaToken" TEXT,
    "firecrawlToken" TEXT,
    "linkedinCompanyUrl" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

INSERT INTO "RecruitmentSettings" ("id", "linxaToken", "firecrawlToken", "linkedinCompanyUrl", "createdAt", "updatedAt")
SELECT
    'default',
    "linxaToken",
    "firecrawlToken",
    "linkedinCompanyUrl",
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "ShopSettings"
WHERE "id" = 'default';

-- SQLite không hỗ trợ DROP COLUMN trước 3.35 — tạo bảng mới ShopSettings
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ShopSettings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shopName" TEXT,
    "preferredChannel" TEXT,
    "bankName" TEXT,
    "accountHolder" TEXT,
    "accountNumber" TEXT,
    "bankThreadId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "address" TEXT,
    "automationRulesJson" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "shopLogoUrl" TEXT,
    "website" TEXT,
    "approvalConfigJson" TEXT,
    "language" TEXT DEFAULT 'vi',
    "notificationConfigJson" TEXT,
    "shipperGroupId" TEXT,
    "ghnToken" TEXT,
    "ghnShopId" TEXT,
    "ghnFromDistrictId" INTEGER,
    "shopCode" TEXT,
    "firecrawlToken" TEXT
);
INSERT INTO "new_ShopSettings" SELECT
    "id", "shopName", "preferredChannel", "bankName", "accountHolder", "accountNumber",
    "bankThreadId", "createdAt", "updatedAt", "address", "automationRulesJson", "email",
    "phone", "shopLogoUrl", "website", "approvalConfigJson", "language",
    "notificationConfigJson", "shipperGroupId", "ghnToken", "ghnShopId", "ghnFromDistrictId",
    "shopCode", "firecrawlToken"
FROM "ShopSettings";
DROP TABLE "ShopSettings";
ALTER TABLE "new_ShopSettings" RENAME TO "ShopSettings";
PRAGMA foreign_keys=ON;
