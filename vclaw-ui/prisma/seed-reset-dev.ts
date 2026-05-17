/**
 * Xóa sạch dữ liệu dev (shop + tuyển dụng). Chỉ chạy thủ công khi cần DB trắng:
 *   pnpm exec tsx prisma/seed-reset-dev.ts
 * Không gọi từ pnpm dev / prisma db seed.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.warn("[seed-reset-dev] Đang xóa dữ liệu development…");

  const deleteOps = [
    prisma.conversationMessage.deleteMany(),
    prisma.conversation.deleteMany(),
    prisma.orderItem.deleteMany(),
    prisma.payment.deleteMany(),
    prisma.booking.deleteMany(),
    prisma.order.deleteMany(),
    prisma.task.deleteMany(),
    prisma.agentToolLog.deleteMany(),
    prisma.automationJob.deleteMany(),
    prisma.integrationPeer.deleteMany(),
    prisma.integrationGroup.deleteMany(),
    prisma.integrationAccount.deleteMany(),
    prisma.channelConnection.deleteMany(),
    prisma.customer.deleteMany(),
    prisma.candidate.deleteMany(),
    prisma.jobPosition.deleteMany(),
    prisma.jobLinkedInPost.deleteMany(),
    prisma.workspace.deleteMany(),
    prisma.product.deleteMany(),
  ];

  for (const op of deleteOps) {
    try {
      await op;
    } catch {
      /* bảng chưa tồn tại */
    }
  }

  console.warn("[seed-reset-dev] Xong. Chạy: pnpm prisma db seed");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
