"use server";

import { prisma } from "@/lib/prisma";
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
