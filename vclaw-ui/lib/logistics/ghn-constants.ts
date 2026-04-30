export const GHN_URLS = {
  PORTAL: 'https://khachhang.ghn.vn',
  PORTAL_CREATE: 'https://khachhang.ghn.vn/order/create/1',
  SSO_MANAGE_IP: 'https://sso.ghn.vn/manage-ip',
  DOCS_WEBHOOK: 'https://api.ghn.vn/home/docs/detail?id=83',
  API_PROD: "https://online-gateway.ghn.vn/shiip/public-api/v2/",
  API_DEV: "https://dev-online-gateway.ghn.vn/shiip/public-api/v2/",
  ORIGIN_PROD: "https://online-gateway.ghn.vn",
  ORIGIN_DEV: "https://dev-online-gateway.ghn.vn",
};

/** Origin online-gateway (prod vs dev) cho master-data và fee. */
function getGhnApiOrigin(): string {
  return process.env.NODE_ENV === "production"
    ? GHN_URLS.ORIGIN_PROD
    : GHN_URLS.ORIGIN_DEV;
}

export function getGhnFeeApiUrl(): string {
  return `${getGhnApiOrigin()}/shiip/public-api/v2/shipping-order/fee`;
}

export function getGhnMasterDataUrl(
  resource: "province" | "district" | "ward",
  query?: Record<string, string | number>,
): string {
  const base = `${getGhnApiOrigin()}/shiip/public-api/master-data/${resource}`;
  if (!query || Object.keys(query).length === 0) return base;
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    q.set(k, String(v));
  }
  return `${base}?${q.toString()}`;
}
