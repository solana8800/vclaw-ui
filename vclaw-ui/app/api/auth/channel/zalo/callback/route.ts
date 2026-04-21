import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { PILOT_CHANNEL_PROVIDER } from "@/lib/channel-pilot";
import { revalidateAdminPaths } from "@/lib/revalidate-admin";

export const runtime = "nodejs";

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

  await prisma.channelConnection.upsert({
    where: { provider: PILOT_CHANNEL_PROVIDER },
    create: {
      provider: PILOT_CHANNEL_PROVIDER,
      appId,
      accessToken: tokenJson.access_token,
      refreshToken: tokenJson.refresh_token ?? null,
      expiresAt,
      externalAccountId: oaId ?? null,
    },
    update: {
      accessToken: tokenJson.access_token,
      refreshToken: tokenJson.refresh_token ?? undefined,
      expiresAt,
      externalAccountId: oaId ?? undefined,
    },
  });

  await prisma.integrationAccount.upsert({
    where: { provider: "ZALO" },
    create: {
      provider: "ZALO",
      displayName: "Zalo OA (OAuth)",
      connectedAt: new Date(),
    },
    update: {
      displayName: "Zalo OA (OAuth)",
      connectedAt: new Date(),
    },
  });

  revalidateAdminPaths();

  const locale = "vi";
  const next = new URL(`/${locale}/admin/integrations`, req.url);
  next.searchParams.set("channel", "zalo_oauth_ok");
  return NextResponse.redirect(next.toString());
}
