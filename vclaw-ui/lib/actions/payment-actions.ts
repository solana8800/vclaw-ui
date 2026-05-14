"use server";

import { prisma } from "@/lib/db";
import { revalidateAdminPaths } from "@/lib/admin/revalidate";

export async function getPaymentsWithOrders(page = 1, pageSize = 50) {
  const skip = (page - 1) * pageSize;
  const [payments, total] = await Promise.all([
    prisma.payment.findMany({
      include: {
        order: { include: { customer: true } },
      },
      orderBy: { updatedAt: "desc" },
      skip,
      take: pageSize,
    }),
    prisma.payment.count(),
  ]);

  return {
    data: payments,
    total,
    totalPages: Math.ceil(total / pageSize),
  };
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
