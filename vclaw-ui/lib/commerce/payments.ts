"use server";

import { prisma } from "@/lib/db";

/**
 * Lấy danh sách các yêu cầu soát xét thanh toán từ bảng Task
 */
export async function getPaymentTasks() {
  return await prisma.task.findMany({
    where: {
      type: "PAYMENT_REVIEW",
      status: "NEW"
    },
    orderBy: {
      createdAt: "desc"
    }
  });
}
