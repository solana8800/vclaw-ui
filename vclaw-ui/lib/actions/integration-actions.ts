"use server";

import { prisma } from "@/lib/prisma";
import { revalidateAdminPaths } from "@/lib/revalidate-admin";

export async function getIntegrationAccounts() {
  return prisma.integrationAccount.findMany({
    orderBy: { provider: "asc" },
  });
}

/** Đánh dấu đã kết nối (không lưu secret — cấu hình thật qua env / OpenClaw). */
export async function markIntegrationConnected(
  provider: string,
  displayName?: string,
) {
  await prisma.integrationAccount.upsert({
    where: { provider },
    create: {
      provider,
      displayName: displayName ?? provider,
      connectedAt: new Date(),
    },
    update: {
      displayName: displayName ?? undefined,
      connectedAt: new Date(),
    },
  });
  revalidateAdminPaths();
}

export async function disconnectIntegration(provider: string) {
  await prisma.integrationAccount.deleteMany({ where: { provider } });
  revalidateAdminPaths();
}
