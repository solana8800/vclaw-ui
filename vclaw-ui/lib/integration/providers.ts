export const INTEGRATION_PROVIDERS = [
  "ZALO",
  "META",
  "SHOPEE",
  "TELEGRAM",
] as const;

export type IntegrationProvider = (typeof INTEGRATION_PROVIDERS)[number];
