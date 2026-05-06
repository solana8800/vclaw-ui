"use server";

import { prisma } from "@/lib/db";
import { revalidateAdminPaths } from "@/lib/admin/revalidate";
import {
  CHANNEL_META_FB,
  CHANNEL_SHOPEE_OPEN,
} from "@/lib/channel/providers";
import { sanitizeConnectionProfileForPublic } from "@/lib/integration/connection-public";

export async function getIntegrationAccounts() {
  return prisma.integrationAccount.findMany({
    orderBy: { provider: "asc" },
  });
}

/** Dữ liệu kết nối OAuth (không gửi accessToken xuống client). */
export type IntegrationConnectionPublic = {
  provider: string;
  expiresAtIso: string | null;
  externalAccountId: string | null;
  profileJson: string | null;
  hasAccessToken: boolean;
  hasRefreshToken: boolean;
};

export async function getIntegrationConnectionsPublic(): Promise<IntegrationConnectionPublic[]> {
  const rows = await prisma.channelConnection.findMany({
    orderBy: { provider: "asc" },
    select: {
      provider: true,
      expiresAt: true,
      externalAccountId: true,
      profileJson: true,
      accessToken: true,
      refreshToken: true,
    },
  });
  return rows.map((r) => ({
    provider: r.provider,
    expiresAtIso: r.expiresAt?.toISOString() ?? null,
    externalAccountId: r.externalAccountId,
    profileJson: sanitizeConnectionProfileForPublic(r.provider, r.profileJson),
    hasAccessToken: Boolean(r.accessToken?.length),
    hasRefreshToken: Boolean(r.refreshToken?.length),
  }));
}

/** Đánh dấu đã kết nối (không lưu secret — cấu hình thật qua env / OpenClaw). */
export async function markIntegrationConnected(
  provider: string,
  displayName?: string,
) {
  if (provider === "ZALO" || provider === "META" || provider === "SHOPEE") {
    return;
  }
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
  if (provider === "META") {
    await prisma.channelConnection.deleteMany({ where: { provider: CHANNEL_META_FB } });
  }
  if (provider === "SHOPEE") {
    await prisma.channelConnection.deleteMany({ where: { provider: CHANNEL_SHOPEE_OPEN } });
  }
  revalidateAdminPaths();
}
