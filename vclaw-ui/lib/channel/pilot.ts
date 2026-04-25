/**
 * Kênh pilot (Pha A): Zalo OA webhook + OAuth; Meta Facebook OAuth; Shopee Open OAuth; GHTK token (DB hoặc env).
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
    "ZALO_WEBHOOK_SKIP_VERIFY",
    "META_APP_ID",
    "META_APP_SECRET",
    "META_REDIRECT_URI",
    "NEXT_PUBLIC_OPENCLAW_GATEWAY_WS_URL",
    "SHOPEE_PARTNER_ID",
    "SHOPEE_PARTNER_KEY",
    "SHOPEE_REDIRECT_URI",
    "SHOPEE_USE_TEST",
    "VCLAW_AGENT_TOOLS_SECRET",
    "GHN_TOKEN",
    "GHN_SHOP_ID",
    "GHN_TO_DISTRICT_ID",
    "GHN_TO_WARD_CODE",
    "GHTK_TOKEN",
    "GHTK_PICK_PROVINCE",
    "GHTK_PICK_DISTRICT",
    "GHTK_RECEIVER_PROVINCE",
    "GHTK_RECEIVER_DISTRICT",
    "GHTK_RECEIVER_ADDRESS",
  ] as const,
};
