export const GHN_URLS = {
  PORTAL_CREATE: 'https://khachhang.ghn.vn/order/create',
  API_PROD: "https://online-gateway.ghn.vn/shiip/public-api/v2/",
  API_DEV: "https://dev-online-gateway.ghn.vn/shiip/public-api/v2/",
};

/** Origin online-gateway (prod vs dev) cho master-data và fee. */
function getGhnApiOrigin(): string {
  return process.env.NODE_ENV === "production"
    ? "https://online-gateway.ghn.vn"
    : "https://dev-online-gateway.ghn.vn";
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
