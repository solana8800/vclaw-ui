import { NextResponse } from "next/server";

export const runtime = "nodejs";

const LOCALE_COOKIE = "vclaw_zalo_oauth_locale";

export async function GET(req: Request) {
  const appId = process.env.ZALO_OA_APP_ID;
  if (!appId) {
    return NextResponse.json(
      { error: "Missing ZALO_OA_APP_ID. See channel pilot env in docs." },
      { status: 501 },
    );
  }
  const { searchParams, origin } = new URL(req.url);
  const locale = searchParams.get("locale") === "en" ? "en" : "vi";
  const redirectUri =
    process.env.ZALO_OA_REDIRECT_URI ?? `${origin}/api/auth/channel/zalo/callback`;
  const url = new URL("https://oauth.zaloapp.com/v4/oa/permission");
  url.searchParams.set("app_id", appId);
  url.searchParams.set("redirect_uri", redirectUri);
  const res = NextResponse.redirect(url.toString());
  const secure = process.env.NODE_ENV === "production";
  res.cookies.set(LOCALE_COOKIE, locale, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });
  return res;
}
