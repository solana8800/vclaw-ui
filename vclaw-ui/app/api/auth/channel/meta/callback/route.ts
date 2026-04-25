import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { revalidateAdminPaths } from "@/lib/revalidate-admin";
import { CHANNEL_META_FB } from "@/lib/channel-connection-providers";
import {
  exchangeMetaCodeForShortLivedToken,
  exchangeMetaShortForLongLivedToken,
  fetchMetaManagedPages,
  fetchMetaMe,
  metaProfileFullJson,
} from "@/lib/meta-graph";

export const runtime = "nodejs";

const STATE_COOKIE = "vclaw_meta_oauth_state";
const LOCALE_COOKIE = "vclaw_meta_oauth_locale";

export async function GET(req: Request) {
  const { searchParams, origin } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const err = searchParams.get("error_description") ?? searchParams.get("error");

  const clientId = process.env.META_APP_ID?.trim();
  const clientSecret = process.env.META_APP_SECRET?.trim();
  const redirectUri =
    process.env.META_REDIRECT_URI?.trim() ?? `${origin}/api/auth/channel/meta/callback`;

  const cookieState = req.headers.get("cookie");
  const expected = parseCookie(cookieState, STATE_COOKIE);
  const localeRaw = parseCookie(cookieState, LOCALE_COOKIE);
  const locale = localeRaw === "en" ? "en" : "vi";

  const clearCookies = (r: NextResponse) => {
    r.cookies.delete(STATE_COOKIE);
    r.cookies.delete(LOCALE_COOKIE);
  };

  if (err) {
    const r = NextResponse.redirect(
      new URL(`/${locale}/admin/settings?channel=meta_oauth_err`, req.url).toString(),
    );
    clearCookies(r);
    return r;
  }

  if (!code || !state || !expected || state !== expected || !clientId || !clientSecret) {
    const r = NextResponse.redirect(
      new URL(`/${locale}/admin/settings?channel=meta_oauth_bad_state`, req.url).toString(),
    );
    clearCookies(r);
    return r;
  }

  try {
    const short = await exchangeMetaCodeForShortLivedToken({
      clientId,
      clientSecret,
      redirectUri,
      code,
    });
    const long = await exchangeMetaShortForLongLivedToken({
      clientId,
      clientSecret,
      shortLivedUserToken: short.access_token,
    });
    const me = await fetchMetaMe(long.access_token);
    const pages = await fetchMetaManagedPages(long.access_token);
    const expiresInSec =
      typeof long.expires_in === "number" && long.expires_in > 0
        ? long.expires_in
        : 60 * 24 * 3600;
    const expiresAt = new Date(Date.now() + expiresInSec * 1000);

    const profileStored = metaProfileFullJson(me, pages);
    const displayName =
      pages[0]?.name ? `Facebook · ${pages[0].name}` : `Facebook · ${me.name}`;

    await (prisma as any).channelConnection.upsert({
      where: { provider: CHANNEL_META_FB },
      create: {
        provider: CHANNEL_META_FB,
        appId: clientId,
        accessToken: long.access_token,
        refreshToken: null,
        expiresAt,
        externalAccountId: me.id,
        profileJson: profileStored,
      },
      update: {
        appId: clientId,
        accessToken: long.access_token,
        expiresAt,
        externalAccountId: me.id,
        profileJson: profileStored,
      },
    });

    await (prisma as any).integrationAccount.upsert({
      where: { provider: "META" },
      create: {
        provider: "META",
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
    next.searchParams.set("channel", "meta_oauth_ok");
    next.searchParams.set("pages", String(pages.length));
    const r = NextResponse.redirect(next.toString());
    clearCookies(r);
    return r;
  } catch {
    const r = NextResponse.redirect(
      new URL(`/${locale}/admin/settings?channel=meta_oauth_exchange_fail`, req.url).toString(),
    );
    clearCookies(r);
    return r;
  }
}

function parseCookie(header: string | null, name: string): string | null {
  if (!header) return null;
  const parts = header.split(";").map((p) => p.trim());
  const prefix = `${name}=`;
  for (const p of parts) {
    if (p.startsWith(prefix)) return decodeURIComponent(p.slice(prefix.length));
  }
  return null;
}
