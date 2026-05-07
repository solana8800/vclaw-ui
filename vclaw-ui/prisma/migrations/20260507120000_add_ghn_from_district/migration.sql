-- AlterTable: thêm cột ghnFromDistrictId vào ShopSettings
-- ID quận/huyện xuất phát dùng cho API tính phí GHN
ALTER TABLE "ShopSettings" ADD COLUMN "ghnFromDistrictId" INTEGER;
