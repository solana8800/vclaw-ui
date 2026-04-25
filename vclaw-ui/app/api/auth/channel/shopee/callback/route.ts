import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { revalidateAdminPaths } from "@/lib/revalidate-admin";
import { CHANNEL_SHOPEE_OPEN } from "@/lib/channel-connection-providers";
import { exchangeShopeeShopAccessToken } from "@/lib/shopee-open-auth";

export const runtime = "nodejs";

const STARTED_COOKIE = "vclaw_shopee_oauth_started";
const LOCALE_COOKIE = "vclaw_shopee_oauth_locale";

function parseCookie(header: string | null, name: string): string | null {
  if (!header) return null;
  const parts = header.split(";").map((p) => p.trim());
  const prefix = `${name}=`;
  for (const p of parts) {
    if (p.startsWith(prefix)) return decodeURIComponent(p.slice(prefix.length));
  }
  return null;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const shopId = searchParams.get("shop_id");

  const cookieHeader = req.headers.get("cookie");
  const started = parseCookie(cookieHeader, STARTED_COOKIE);
  const localeRaw = parseCookie(cookieHeader, LOCALE_COOKIE);
  const locale = localeRaw === "en" ? "en" : "vi";

  const partnerId = process.env.SHOPEE_PARTNER_ID?.trim();
  const partnerKey = process.env.SHOPEE_PARTNER_KEY?.trim();

  const clear = (r: NextResponse) => {
    r.cookies.delete(STARTED_COOKIE);
    r.cookies.delete(LOCALE_COOKIE);
  };

  if (!started || !code || !shopId || !partnerId || !partnerKey) {
    const r = NextResponse.redirect(
      new URL(`/${locale}/admin/settings?channel=shopee_oauth_bad`, req.url).toString(),
    );
    clear(r);
    return r;
  }

  try {
    const tok = await exchangeShopeeShopAccessToken({
      partnerId,
      partnerKey,
      code,
      shopId,
    });
    const expiresAt = new Date(Date.now() + tok.expire_in * 1000);
    const profileJson = JSON.stringify({
      shopName: tok.shop_name ?? null,
      shopId,
    });

    await (prisma as any).channelConnection.upsert({
      where: { provider: CHANNEL_SHOPEE_OPEN },
      create: {
        provider: CHANNEL_SHOPEE_OPEN,
        appId: partnerId,
        accessToken: tok.access_token,
        refreshToken: tok.refresh_token || null,
        expiresAt,
        externalAccountId: shopId,
        profileJson,
      },
      update: {
        appId: partnerId,
        accessToken: tok.access_token,
        refreshToken: tok.refresh_token || undefined,
        expiresAt,
        externalAccountId: shopId,
        profileJson,
      },
    });

    const displayName = tok.shop_name ? `Shopee · ${tok.shop_name}` : `Shopee · shop ${shopId}`;
    await (prisma as any).integrationAccount.upsert({
      where: { provider: "SHOPEE" },
      create: {
        provider: "SHOPEE",
        displayName,
        connectedAt: new Date(),
      },
      update: {
        displayName,
        connectedAt: new Date(),
      },
    });

    revalidateAdminPaths();
    const next = new URL(`/${locale}/admin/settings`, req.url);
    next.searchParams.set("channel", "shopee_oauth_ok");
    const r = NextResponse.redirect(next.toString());
    clear(r);
    return r;
  } catch {
    const r = NextResponse.redirect(
      new URL(`/${locale}/admin/settings?channel=shopee_oauth_fail`, req.url).toString(),
    );
    clear(r);
    return r;
  }
}
