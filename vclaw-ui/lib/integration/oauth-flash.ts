/** Query `channel` sau redirect OAuth callback → key i18n trong `integrationPanel.oauthFlash`. */
export const INTEGRATION_OAUTH_FLASH_KEYS = [
  "zalo_oauth_ok",
  "meta_oauth_ok",
  "shopee_oauth_ok",
  "meta_oauth_err",
  "meta_oauth_bad_state",
  "meta_oauth_exchange_fail",
  "shopee_oauth_bad",
  "shopee_oauth_fail",
] as const;

export type IntegrationOauthFlashKey = (typeof INTEGRATION_OAUTH_FLASH_KEYS)[number];

const FLASH_SET = new Set<string>(INTEGRATION_OAUTH_FLASH_KEYS);

export function parseIntegrationOauthFlash(
  channel: string | string[] | undefined,
): IntegrationOauthFlashKey | null {
  const raw = Array.isArray(channel) ? channel[0] : channel;
  if (!raw || typeof raw !== "string") return null;
  const key = raw.trim();
  return FLASH_SET.has(key) ? (key as IntegrationOauthFlashKey) : null;
}

export function isIntegrationOauthFlashSuccess(key: IntegrationOauthFlashKey): boolean {
  return key.endsWith("_ok");
}
