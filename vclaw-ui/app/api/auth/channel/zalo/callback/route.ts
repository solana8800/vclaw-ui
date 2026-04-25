import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { PILOT_CHANNEL_PROVIDER } from "@/lib/channel/pilot";
import { revalidateAdminPaths } from "@/lib/admin/revalidate";
import { fetchZaloOaPublicProfile } from "@/lib/zalouser/zalo-oa-public-profile";

export const runtime = "nodejs";

const LOCALE_COOKIE = "vclaw_zalo_oauth_locale";

function parseCookie(header: string | null, name: string): string | null {
  if (!header) return null;
  const parts = header.split(";").map((p) => p.trim());
  const prefix = `${name}=`;
  for (const p of parts) {
    if (p.startsWith(prefix)) return decodeURIComponent(p.slice(prefix.length));
  }
  return null;
}

type TokenResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  error_name?: string;
  error_reason?: string;
};

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const oaId = searchParams.get("oa_id");

  const appId = process.env.ZALO_OA_APP_ID;
  const appSecret = process.env.ZALO_OA_APP_SECRET;
  if (!code || !appId || !appSecret) {
    return NextResponse.json({ error: "missing_code_or_env" }, { status: 400 });
  }

  const body = new URLSearchParams({
    secret_key: appSecret,
    app_id: appId,
    grant_type: "authorization_code",
    code,
  });

  const tokenRes = await fetch("https://oauth.zaloapp.com/v4/oa/access_token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  const tokenJson = (await tokenRes.json()) as TokenResponse;
  if (!tokenRes.ok || !tokenJson.access_token) {
    return NextResponse.json(
      {
        error: "token_exchange_failed",
        detail: tokenJson.error_reason ?? tokenJson.error_name,
      },
      { status: 502 },
    );
  }

  const expiresIn = typeof tokenJson.expires_in === "number" ? tokenJson.expires_in : 86_400;
  const expiresAt = new Date(Date.now() + expiresIn * 1000);

  const publicProfile = await fetchZaloOaPublicProfile(tokenJson.access_token);
  const resolvedOaId = publicProfile?.oaId ?? oaId ?? null;
  const profileJson = publicProfile ? JSON.stringify(publicProfile) : null;
  const displayName =
    publicProfile?.name ??
    (resolvedOaId ? `Zalo OA · ${resolvedOaId}` : "Zalo OA (OAuth)");

  await (prisma as any).channelConnection.upsert({
    where: { provider: PILOT_CHANNEL_PROVIDER },
    create: {
      provider: PILOT_CHANNEL_PROVIDER,
      appId,
      accessToken: tokenJson.access_token,
      refreshToken: tokenJson.refresh_token ?? null,
      expiresAt,
      externalAccountId: resolvedOaId,
      profileJson,
    },
    update: {
      accessToken: tokenJson.access_token,
      refreshToken: tokenJson.refresh_token ?? undefined,
      expiresAt,
      externalAccountId: resolvedOaId ?? undefined,
      profileJson: profileJson ?? undefined,
    },
  });

  await (prisma as any).integrationAccount.upsert({
    where: { provider: "ZALO" },
    create: {
      provider: "ZALO",
      displayName,
      connectedAt: new Date(),
    },
    update: {
      displayName,
      connectedAt: new Date(),
    },
  });

  revalidateAdminPaths();

  const localeRaw = parseCookie(req.headers.get("cookie"), LOCALE_COOKIE);
  const locale = localeRaw === "en" ? "en" : "vi";
  const next = new URL(`/${locale}/admin/settings`, req.url);
  next.searchParams.set("channel", "zalo_oauth_ok");
  const res = NextResponse.redirect(next.toString());
  res.cookies.delete(LOCALE_COOKIE);
  return res;
}
