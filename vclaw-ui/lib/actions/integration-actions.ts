"use server";

import { prisma } from "@/lib/prisma";
import { revalidateAdminPaths } from "@/lib/admin/revalidate";
import {
  CHANNEL_GHTK,
  CHANNEL_META_FB,
  CHANNEL_SHOPEE_OPEN,
  CHANNEL_ZALO_OA,
} from "@/lib/channel/providers";
import { sanitizeConnectionProfileForPublic } from "@/lib/integration/connection-public";
import { tryGhtkShippingFee } from "@/lib/logistics/ghtk-quote";
import { refreshZaloOaTokens } from "@/lib/zalouser/zalo-oauth-refresh";

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
  if (provider === "ZALO" || provider === "META" || provider === "SHOPEE" || provider === "GHTK") {
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
  if (provider === "ZALO") {
    await prisma.channelConnection.deleteMany({ where: { provider: CHANNEL_ZALO_OA } });
  }
  if (provider === "META") {
    await prisma.channelConnection.deleteMany({ where: { provider: CHANNEL_META_FB } });
  }
  if (provider === "SHOPEE") {
    await prisma.channelConnection.deleteMany({ where: { provider: CHANNEL_SHOPEE_OPEN } });
  }
  if (provider === "GHTK") {
    await prisma.channelConnection.deleteMany({ where: { provider: CHANNEL_GHTK } });
  }
  revalidateAdminPaths();
}

type GhtkFormInput = {
  token: string;
  pickProvince: string;
  pickDistrict: string;
  receiverProvince: string;
  receiverDistrict: string;
  receiverAddress: string;
};

/** Lưu token + địa chỉ GHTK vào DB; gọi thử báo phí một lần để xác thực. */
export async function saveGhtkCredentials(input: GhtkFormInput): Promise<{ ok: boolean; error?: string }> {
  const existing = await prisma.channelConnection.findUnique({
    where: { provider: CHANNEL_GHTK },
    select: { accessToken: true },
  });
  const token =
    input.token.trim() || existing?.accessToken?.trim() || "";
  const pickProvince = input.pickProvince.trim();
  const pickDistrict = input.pickDistrict.trim();
  const receiverProvince = input.receiverProvince.trim();
  const receiverDistrict = input.receiverDistrict.trim();
  const receiverAddress = input.receiverAddress.trim();
  if (!token || !pickProvince || !pickDistrict || !receiverProvince || !receiverDistrict || !receiverAddress) {
    return { ok: false, error: "missing_fields" };
  }

  const probe = await tryGhtkShippingFee({
    token,
    pickProvince,
    pickDistrict,
    province: receiverProvince,
    district: receiverDistrict,
    address: receiverAddress,
    weightGrams: 500,
  });
  if (!probe) {
    return { ok: false, error: "ghtk_fee_probe_failed" };
  }

  const profileJson = JSON.stringify({
    pickProvince,
    pickDistrict,
    receiverProvince,
    receiverDistrict,
    receiverAddress,
  });

  await prisma.channelConnection.upsert({
    where: { provider: CHANNEL_GHTK },
    create: {
      provider: CHANNEL_GHTK,
      accessToken: token,
      profileJson,
    },
    update: {
      accessToken: token,
      profileJson,
    },
  });

  await prisma.integrationAccount.upsert({
    where: { provider: "GHTK" },
    create: {
      provider: "GHTK",
      displayName: "GHTK (đã lưu)",
      connectedAt: new Date(),
    },
    update: {
      displayName: "GHTK (đã lưu)",
      connectedAt: new Date(),
    },
  });

  revalidateAdminPaths();
  return { ok: true };
}

export async function refreshZaloOaTokenAction(): Promise<{ ok: boolean; error?: string }> {
  const r = await refreshZaloOaTokens();
  if (!r.ok) {
    return { ok: false, error: r.error };
  }
  revalidateAdminPaths();
  return { ok: true };
}
