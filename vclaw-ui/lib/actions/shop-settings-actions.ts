"use server";

import { prisma } from "@/lib/prisma";
import { revalidateAdminPaths } from "@/lib/admin/revalidate";

export type ShopSettingsInput = {
  shopName?: string;
  bankQrUrl?: string;
  preferredChannel?: string;
  bankName?: string;
  accountHolder?: string;
  accountNumber?: string;
};

export async function getShopSettings() {
  const row = await prisma.shopSettings.findUnique({ where: { id: "default" } });
  return row;
}

export async function upsertShopSettings(data: ShopSettingsInput) {
  await prisma.shopSettings.upsert({
    where: { id: "default" },
    create: {
      id: "default",
      shopName: data.shopName ?? null,
      bankQrUrl: data.bankQrUrl ?? null,
      preferredChannel: data.preferredChannel ?? null,
      bankName: data.bankName ?? null,
      accountHolder: data.accountHolder ?? null,
      accountNumber: data.accountNumber ?? null,
    },
    update: {
      shopName: data.shopName ?? null,
      bankQrUrl: data.bankQrUrl ?? null,
      preferredChannel: data.preferredChannel ?? null,
      bankName: data.bankName ?? null,
      accountHolder: data.accountHolder ?? null,
      accountNumber: data.accountNumber ?? null,
    },
  });
  revalidateAdminPaths();
  return { success: true };
}
