import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const settings = await prisma.shopSettings.findFirst({
    where: { id: "default" }
  });

  console.log("\n========================================================");
  console.log("   DỮ LIỆU CHI TIẾT CỬA HÀNG (FULL FIELD DUMP)");
  console.log("========================================================\n");

  if (!settings) {
    console.log("❌ Không tìm thấy dữ liệu!");
    return;
  }

  // 1. Thông tin cơ bản & Định danh
  console.log("--- [1] NHẬN DIỆN THƯƠNG HIỆU ---");
  console.log(`ID:           ${settings.id}`);
  console.log(`Tên Shop:     ${settings.shopName}`);
  console.log(`Logo URL:     ${(settings as any).shopLogoUrl || "(Trống)"}`);
  console.log(`Website:      ${(settings as any).website || "(Trống)"}`);
  console.log("");

  // 2. Thông tin liên hệ
  console.log("--- [2] THÔNG TIN LIÊN HỆ ---");
  console.log(`Hotline:      ${(settings as any).phone}`);
  console.log(`Email:        ${(settings as any).email}`);
  console.log(`Địa chỉ:      ${(settings as any).address}`);
  console.log("");

  // 3. Thanh toán
  console.log("--- [3] THANH TOÁN & NGÂN HÀNG ---");
  console.log(`Ngân hàng:    ${settings.bankName}`);
  console.log(`STK:          ${settings.accountNumber}`);
  console.log(`Chủ TK:       ${settings.accountHolder}`);
  console.log(`Kênh ưu tiên: ${settings.preferredChannel}`);
  console.log("");

  // 4. Cấu hình Workspace
  console.log("--- [4] CÀI ĐẶT WORKSPACE (JSON) ---");
  console.log(`Ngôn ngữ:     ${(settings as any).language}`);
  console.log("Cổng duyệt:", JSON.parse((settings as any).approvalConfigJson || "{}"));
  console.log("Thông báo:  ", JSON.parse((settings as any).notificationConfigJson || "{}"));
  console.log("");

  // 5. Tự động hóa
  console.log("--- [5] QUY TẮC TỰ ĐỘNG HÓA (JSON) ---");
  console.log(JSON.parse((settings as any).automationRulesJson || "{}"));
  console.log("");

  console.log("--- [6] SIÊU DỮ LIỆU ---");
  console.log(`Ngày tạo:     ${settings.createdAt}`);
  console.log(`Cập nhật:     ${settings.updatedAt}`);
  console.log("========================================================\n");
}

main()
  .catch((e) => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
