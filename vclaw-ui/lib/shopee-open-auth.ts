import { createHmac } from "node:crypto";

export function shopeePartnerHost(): string {
  return process.env.SHOPEE_USE_TEST === "1"
    ? "https://partner.test-stable.shopeemobile.com"
    : "https://partner.shopeemobile.com";
}

/** Ký HMAC-SHA256 hex (public API v2). */
export function shopeeSign(partnerId: string, path: string, timestamp: number, partnerKey: string): string {
  const base = `${partnerId}${path}${timestamp}`;
  return createHmac("sha256", partnerKey).update(base).digest("hex");
}

export function buildShopeeAuthPartnerRedirectUrl(params: {
  partnerId: string;
  partnerKey: string;
  redirectUri: string;
}): string {
  const path = "/api/v2/shop/auth_partner";
  const ts = Math.floor(Date.now() / 1000);
  const sign = shopeeSign(params.partnerId, path, ts, params.partnerKey);
  const u = new URL(`${shopeePartnerHost()}${path}`);
  u.searchParams.set("partner_id", params.partnerId);
  u.searchParams.set("timestamp", String(ts));
  u.searchParams.set("sign", sign);
  u.searchParams.set("redirect", params.redirectUri);
  return u.toString();
}

type ShopeeTokenJson = {
  access_token?: string;
  refresh_token?: string;
  expire_in?: number;
  error?: string;
  message?: string;
  shop_name?: string;
};

export async function exchangeShopeeShopAccessToken(params: {
  partnerId: string;
  partnerKey: string;
  code: string;
  shopId: string;
}): Promise<{
  access_token: string;
  refresh_token: string;
  expire_in: number;
  shop_name?: string;
}> {
  const path = "/api/v2/auth/token/get";
  const ts = Math.floor(Date.now() / 1000);
  const sign = shopeeSign(params.partnerId, path, ts, params.partnerKey);
  const u = new URL(`${shopeePartnerHost()}${path}`);
  u.searchParams.set("partner_id", params.partnerId);
  u.searchParams.set("timestamp", String(ts));
  u.searchParams.set("sign", sign);

  const res = await fetch(u.toString(), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      code: params.code,
      shop_id: Number(params.shopId),
      partner_id: Number(params.partnerId),
    }),
  });

  const raw = (await res.json()) as Record<string, unknown>;
  const nested = raw.response as Record<string, unknown> | undefined;
  const access_token = (raw.access_token ?? nested?.access_token) as string | undefined;
  const refresh_token = (raw.refresh_token ?? nested?.refresh_token) as string | undefined;
  const expire_in = (raw.expire_in ?? nested?.expire_in) as number | undefined;
  const shop_name = (raw.shop_name ?? nested?.shop_name) as string | undefined;
  const errMsg = (raw.error ?? raw.message ?? nested?.error) as string | undefined;

  const json: ShopeeTokenJson = {
    access_token,
    refresh_token,
    expire_in,
    shop_name,
    error: typeof errMsg === "string" ? errMsg : undefined,
  };

  if (!res.ok || !json.access_token) {
    throw new Error(json.error ?? "shopee_token_exchange_failed");
  }
  const expireIn =
    typeof json.expire_in === "number" && json.expire_in > 0 ? json.expire_in : 86_400;
  return {
    access_token: json.access_token,
    refresh_token: json.refresh_token ?? "",
    expire_in: expireIn,
    shop_name: json.shop_name,
  };
}
