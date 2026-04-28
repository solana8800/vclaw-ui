"use server";

import { prisma } from "@/lib/db";
import { revalidateAdminPaths } from "@/lib/admin/revalidate";

export type ShopSettingsInput = {
  shopName?: string;
  bankQrUrl?: string;
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
};

/** Cấu hình 1 quy tắc tự động hóa */
export type AutomationRuleConfig = {
  enabled: boolean;
  /** Số giờ/ngày chờ trước khi kích hoạt (ý nghĩa tuỳ rule) */
  delayValue: number;
  /** Đơn vị thời gian: "hours" | "days" */
  delayUnit: "hours" | "days";
};

export type AutomationRulesConfig = {
  /** Follow-up thanh toán sau X giờ */
  paymentFollowup: AutomationRuleConfig;
  /** Nhắc lịch hẹn trước X giờ */
  appointmentReminder: AutomationRuleConfig;
  /** Tái kích hoạt lead im lặng X ngày */
  leadReactivation: AutomationRuleConfig;
};

const DEFAULT_RULES: AutomationRulesConfig = {
  paymentFollowup: { enabled: true, delayValue: 24, delayUnit: "hours" },
  appointmentReminder: { enabled: true, delayValue: 2, delayUnit: "hours" },
  leadReactivation: { enabled: false, delayValue: 3, delayUnit: "days" },
};

export async function getShopSettings() {
  const row = await prisma.shopSettings.findUnique({ where: { id: "default" } });
  return row;
}

/** Lấy config quy tắc tự động hóa từ DB (trả mặc định nếu chưa có) */
export async function getAutomationRules(): Promise<AutomationRulesConfig> {
  const row = await prisma.shopSettings.findUnique({ where: { id: "default" } });
  if (!(row as any)?.automationRulesJson) return DEFAULT_RULES;
  try {
    return JSON.parse((row as any).automationRulesJson) as AutomationRulesConfig;
  } catch {
    return DEFAULT_RULES;
  }
}

/** Lưu config quy tắc tự động hóa vào DB */
export async function saveAutomationRules(rules: AutomationRulesConfig) {
  await prisma.shopSettings.upsert({
    where: { id: "default" },
    create: { id: "default", automationRulesJson: JSON.stringify(rules) } as any,
    update: { automationRulesJson: JSON.stringify(rules) } as any,
  });
  revalidateAdminPaths();
  return { success: true };
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
      phone: data.phone ?? null,
      address: data.address ?? null,
      email: data.email ?? null,
      website: data.website ?? null,
      shopLogoUrl: data.shopLogoUrl ?? null,
      language: data.language ?? "vi",
      approvalConfigJson: data.approvalConfigJson ?? null,
      notificationConfigJson: data.notificationConfigJson ?? null,
      automationRulesJson: data.automationRulesJson ?? null,
    } as any,
    update: {
      shopName: data.shopName ?? null,
      bankQrUrl: data.bankQrUrl ?? null,
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
    } as any,
  });
  revalidateAdminPaths();
  return { success: true };
}
