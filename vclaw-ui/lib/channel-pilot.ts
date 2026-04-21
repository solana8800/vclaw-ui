/**
 * Kênh pilot tích hợp đầu tiên (Pha A kế hoạch closed-loop).
 * OAuth + webhook Zalo OA; Meta/Shopee giữ nguyên UI cờ cho pha sau.
 */
export const PILOT_CHANNEL_PROVIDER = "ZALO_OA" as const;

/** Đường dẫn webhook công khai (đặt sau domain production). */
export function zaloWebhookPath(): string {
  return "/api/webhooks/channel/zalo";
}

/** Bắt đầu OAuth Zalo OA (app_id từ Zalo Developer Console). */
export function zaloOAuthStartPath(): string {
  return "/api/auth/channel/zalo/start";
}

export const ZALO_OA_SCOPES_MINIMAL = [
  "user_profile",
  "send_message_to_user",
  "manage_page",
] as const;

export type PilotChannelMeta = {
  provider: typeof PILOT_CHANNEL_PROVIDER;
  docsUrl: string;
  envVars: readonly string[];
};

export const PILOT_CHANNEL_META: PilotChannelMeta = {
  provider: PILOT_CHANNEL_PROVIDER,
  docsUrl: "https://developers.zalo.me/docs/official-account/",
  envVars: [
    "ZALO_OA_APP_ID",
    "ZALO_OA_APP_SECRET",
    "ZALO_OA_WEBHOOK_SECRET",
    "ZALO_OA_REDIRECT_URI",
    "VCLAW_AGENT_TOOLS_SECRET",
    "GHN_TOKEN",
    "GHN_SHOP_ID",
  ] as const,
};
