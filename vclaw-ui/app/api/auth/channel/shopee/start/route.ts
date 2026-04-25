import { randomBytes } from "crypto";
import { NextResponse } from "next/server";

import { buildShopeeAuthPartnerRedirectUrl } from "@/lib/integration/shopee-open-auth";

export const runtime = "nodejs";

const STARTED_COOKIE = "vclaw_shopee_oauth_started";
const LOCALE_COOKIE = "vclaw_shopee_oauth_locale";

export async function GET(req: Request) {
  const partnerId = process.env.SHOPEE_PARTNER_ID?.trim();
  const partnerKey = process.env.SHOPEE_PARTNER_KEY?.trim();
  if (!partnerId || !partnerKey) {
    return NextResponse.json(
      { error: "Missing SHOPEE_PARTNER_ID or SHOPEE_PARTNER_KEY." },
      { status: 501 },
    );
  }

  const { searchParams, origin } = new URL(req.url);
  const locale = searchParams.get("locale") === "en" ? "en" : "vi";
  const redirectBase =
    process.env.SHOPEE_REDIRECT_URI?.trim() ?? `${origin}/api/auth/channel/shopee/callback`;

  const token = randomBytes(16).toString("hex");
  const authUrl = buildShopeeAuthPartnerRedirectUrl({
    partnerId,
    partnerKey,
    redirectUri: redirectBase,
  });

  const res = NextResponse.redirect(authUrl);
  const secure = process.env.NODE_ENV === "production";
  res.cookies.set(STARTED_COOKIE, token, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: 900,
  });
  res.cookies.set(LOCALE_COOKIE, locale, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: 900,
  });
  return res;
}
