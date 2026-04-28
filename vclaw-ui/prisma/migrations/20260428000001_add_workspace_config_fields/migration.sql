-- AlterTable
ALTER TABLE "ShopSettings" ADD COLUMN "approvalConfigJson" TEXT;
ALTER TABLE "ShopSettings" ADD COLUMN "language" TEXT DEFAULT 'vi';
ALTER TABLE "ShopSettings" ADD COLUMN "notificationConfigJson" TEXT;

