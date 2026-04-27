"use server";

import { prisma } from "@/lib/db";
import { revalidateAdminPaths } from "@/lib/admin/revalidate";

export async function getPaymentsWithOrders() {
  return prisma.payment.findMany({
    include: {
      order: { include: { customer: true } },
    },
    orderBy: { updatedAt: "desc" },
  });
}

export async function updatePaymentFields(
  id: string,
  data: { status?: string; evidenceImage?: string | null },
) {
  await prisma.payment.update({
    where: { id },
    data: {
      ...(data.status !== undefined ? { status: data.status } : {}),
      ...(data.evidenceImage !== undefined ? { evidenceImage: data.evidenceImage } : {}),
    },
  });
  revalidateAdminPaths();
}

export async function verifyPaymentBill(taskId: string, amount: string | null) {
  // Simulate AI Vision API call
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  return {
    success: true,
    match: true,
    detectedAmount: amount || "0 đ",
    detectedContent: "Thanh toán đơn hàng",
    confidence: 0.98,
  };
}
