import "server-only";
import { prisma } from "@/lib/db";

export type ApprovalConfig = {
  paymentAutoApprove: boolean;
  automationEnabled: boolean;
};

export const DEFAULT_APPROVAL_CONFIG: ApprovalConfig = {
  paymentAutoApprove: false,
  automationEnabled: true,
};

export function parseApprovalConfig(value: string | null | undefined): ApprovalConfig {
  if (!value) return DEFAULT_APPROVAL_CONFIG;
  try {
    const raw = JSON.parse(value) as Partial<Record<keyof ApprovalConfig, unknown>>;
    return {
      paymentAutoApprove: raw.paymentAutoApprove === true,
      automationEnabled:
        typeof raw.automationEnabled === "boolean"
          ? raw.automationEnabled
          : DEFAULT_APPROVAL_CONFIG.automationEnabled,
    };
  } catch {
    return DEFAULT_APPROVAL_CONFIG;
  }
}

export async function getApprovalConfig(): Promise<ApprovalConfig> {
  const settings = await prisma.shopSettings.findFirst({
    select: { approvalConfigJson: true },
  });
  return parseApprovalConfig(settings?.approvalConfigJson);
}
