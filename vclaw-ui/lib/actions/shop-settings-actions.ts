"use server";

import type { ShopSettings } from "@prisma/client";
import { prisma } from "@/lib/db";
import { revalidateAdminPaths } from "@/lib/admin/revalidate";

export type ShopSettingsInput = {
  shopName?: string;
  preferredChannel?: string;
  bankName?: string;
  accountHolder?: string;
  accountNumber?: string;
  phone?: string;
  address?: string;
  email?: string;
  website?: string;
  shopLogoUrl?: string;
  language?: string;
  approvalConfigJson?: string;
  notificationConfigJson?: string;
  automationRulesJson?: string;
  shipperGroupId?: string;
  ghnToken?: string;
  ghnShopId?: string;
};

/** Cấu hình 1 quy tắc tự động hóa */
type AutomationRuleConfig = {
  enabled: boolean;
  delayValue: number;
  delayUnit: "minutes" | "hours" | "days";
};

export type AutomationRulesConfig = {
  /** Follow-up thanh toán sau X phút */
  paymentFollowup: AutomationRuleConfig;
  /** Nhắc lịch hẹn trước X phút */
  appointmentReminder: AutomationRuleConfig;
  /** Tái kích hoạt lead im lặng X giờ */
  leadReactivation: AutomationRuleConfig;
};

const DEFAULT_RULES: AutomationRulesConfig = {
  paymentFollowup: { enabled: true, delayValue: 30, delayUnit: "minutes" },
  appointmentReminder: { enabled: true, delayValue: 30, delayUnit: "minutes" },
  leadReactivation: { enabled: false, delayValue: 24, delayUnit: "hours" },
};

export async function getShopSettings(): Promise<ShopSettings | null> {
  const row = await prisma.shopSettings.findUnique({ where: { id: "default" } });
  return row;
}

/** Lấy config quy tắc tự động hóa từ DB (trả mặc định nếu chưa có) */
export async function getAutomationRules(): Promise<AutomationRulesConfig> {
  const row = await prisma.shopSettings.findUnique({ where: { id: "default" } });
  if (!row?.automationRulesJson) return DEFAULT_RULES;
  try {
    return JSON.parse(row.automationRulesJson) as AutomationRulesConfig;
  } catch {
    return DEFAULT_RULES;
  }
}

/** Lưu config quy tắc tự động hóa vào DB */
export async function saveAutomationRules(rules: AutomationRulesConfig) {
  await prisma.shopSettings.upsert({
    where: { id: "default" },
    create: { id: "default", automationRulesJson: JSON.stringify(rules) },
    update: { automationRulesJson: JSON.stringify(rules) },
  });
  revalidateAdminPaths();
  return { success: true };
}

export async function upsertShopSettings(data: ShopSettingsInput) {
  // Chuẩn bị dữ liệu sạch: Chỉ lấy những trường được truyền vào (không undefined)
  const cleanData: any = {};
  Object.keys(data).forEach((key) => {
    const value = (data as any)[key];
    if (value !== undefined) {
      cleanData[key] = value;
    }
  });

  await prisma.shopSettings.upsert({
    where: { id: "default" },
    create: {
      id: "default",
      shopName: data.shopName ?? null,
      preferredChannel: data.preferredChannel ?? null,
      bankName: data.bankName ?? null,
      accountHolder: data.accountHolder ?? null,
      accountNumber: data.accountNumber ?? null,
      phone: data.phone ?? null,
      address: data.address ?? null,
      email: data.email ?? null,
      website: data.website ?? null,
      shopLogoUrl: data.shopLogoUrl ?? null,
      language: data.language ?? "vi",
      approvalConfigJson: data.approvalConfigJson ?? null,
      notificationConfigJson: data.notificationConfigJson ?? null,
      automationRulesJson: data.automationRulesJson ?? null,
      shipperGroupId: data.shipperGroupId ?? null,
      ghnToken: data.ghnToken ?? null,
      ghnShopId: data.ghnShopId ?? null,
    },
    update: cleanData,
  });
  revalidateAdminPaths();
  return { success: true };
}
