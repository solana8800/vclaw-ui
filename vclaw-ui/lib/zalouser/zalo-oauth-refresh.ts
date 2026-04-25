import { prisma } from "@/lib/db";
import { CHANNEL_ZALO_OA } from "@/lib/channel/providers";

type ZaloRefreshJson = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  error_name?: string;
  error_reason?: string;
};

export async function refreshZaloOaTokens(): Promise<{ ok: true } | { ok: false; error: string }> {
  const appId = process.env.ZALO_OA_APP_ID?.trim();
  const appSecret = process.env.ZALO_OA_APP_SECRET?.trim();
  if (!appId || !appSecret) {
    return { ok: false, error: "missing_zalo_env" };
  }

  const row = await prisma.channelConnection.findUnique({
    where: { provider: CHANNEL_ZALO_OA },
  });
  if (!row?.refreshToken) {
    return { ok: false, error: "no_refresh_token" };
  }

  const body = new URLSearchParams({
    secret_key: appSecret,
    app_id: appId,
    grant_type: "refresh_token",
    refresh_token: row.refreshToken,
  });

  const tokenRes = await fetch("https://oauth.zaloapp.com/v4/oa/access_token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  const tokenJson = (await tokenRes.json()) as ZaloRefreshJson;
  if (!tokenRes.ok || !tokenJson.access_token) {
    return {
      ok: false,
      error: tokenJson.error_reason ?? tokenJson.error_name ?? "zalo_refresh_failed",
    };
  }

  const expiresIn = typeof tokenJson.expires_in === "number" ? tokenJson.expires_in : 86_400;
  const expiresAt = new Date(Date.now() + expiresIn * 1000);

  await prisma.channelConnection.update({
    where: { provider: CHANNEL_ZALO_OA },
    data: {
      accessToken: tokenJson.access_token,
      refreshToken: tokenJson.refresh_token ?? row.refreshToken,
      expiresAt,
    },
  });

  return { ok: true };
}
