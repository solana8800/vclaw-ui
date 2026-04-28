import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const settings = await prisma.shopSettings.findFirst({
    where: { id: "default" }
  });

  if (!settings) return;

  const approval = JSON.parse((settings as any).approvalConfigJson || "{}");
  const notification = JSON.parse((settings as any).notificationConfigJson || "{}");
  const automation = JSON.parse((settings as any).automationRulesJson || "{}");

  console.log("\n--- [CHI TIẾT CÀI ĐẶT WORKSPACE] ---");
  console.log("1. CỔNG DUYỆT (APPROVAL GATE):");
  console.log(`   - Tự động duyệt thanh toán:  ${approval.paymentAutoApprove ? "✅ BẬT" : "❌ TẮT"}`);
  console.log(`   - Kích hoạt tự động hóa:     ${approval.automationEnabled ? "✅ BẬT" : "❌ TẮT"}`);
  console.log(`   - Cho phép truy cập từ xa:   ${approval.remoteAccessEnabled ? "✅ BẬT" : "❌ TẮT"}`);
  
  console.log("\n2. THÔNG BÁO (NOTIFICATION):");
  console.log(`   - Nhịp nhắc việc (giờ):      ${notification.reminderInterval || 0}`);
  console.log(`   - Cadence follow-up:         ${notification.followUpCadence || "N/A"}`);

  console.log("\n3. TỰ ĐỘNG HÓA (AUTOMATION RULES):");
  console.log(`   - Follow-up thanh toán:      ${automation.paymentFollowup?.enabled ? "✅ BẬT" : "❌ TẮT"} (Sau ${automation.paymentFollowup?.delayValue}h)`);
  console.log(`   - Nhắc lịch hẹn:             ${automation.appointmentReminder?.enabled ? "✅ BẬT" : "❌ TẮT"} (Trước ${automation.appointmentReminder?.delayValue}h)`);
  console.log(`   - Tái kích hoạt lead:        ${automation.leadReactivation?.enabled ? "✅ BẬT" : "❌ TẮT"} (Sau ${automation.leadReactivation?.delayValue} ngày)`);
  
  console.log("\n4. ĐỊNH DANH:");
  console.log(`   - Ngôn ngữ mặc định:         ${(settings as any).language}`);
  console.log("----------------------------------\n");
}

main().finally(() => prisma.$disconnect());
