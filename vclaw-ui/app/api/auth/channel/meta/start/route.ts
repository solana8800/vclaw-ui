import { randomBytes } from "crypto";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const STATE_COOKIE = "vclaw_meta_oauth_state";
const LOCALE_COOKIE = "vclaw_meta_oauth_locale";

/**
 * Scope tối thiểu: user + danh sách Page (lưu token + profile trong ChannelConnection).
 * Pha 2 (Messenger): thêm `pages_messaging`, cấu hình webhook Meta → endpoint tương tự Zalo,
 * lưu page access token — tách khỏi luồng OAuth hiện tại.
 */
const META_SCOPES = ["public_profile", "pages_show_list"].join(",");

export async function GET(req: Request) {
  const appId = process.env.META_APP_ID?.trim();
  if (!appId) {
    return NextResponse.json(
      { error: "Missing META_APP_ID. Set META_APP_ID and META_APP_SECRET." },
      { status: 501 },
    );
  }

  const { searchParams, origin } = new URL(req.url);
  const locale = searchParams.get("locale") === "en" ? "en" : "vi";
  const redirectUri =
    process.env.META_REDIRECT_URI?.trim() ?? `${origin}/api/auth/channel/meta/callback`;

  const state = randomBytes(24).toString("hex");
  const auth = new URL("https://www.facebook.com/v21.0/dialog/oauth");
  auth.searchParams.set("client_id", appId);
  auth.searchParams.set("redirect_uri", redirectUri);
  auth.searchParams.set("state", state);
  auth.searchParams.set("scope", META_SCOPES);
  auth.searchParams.set("response_type", "code");

  const res = NextResponse.redirect(auth.toString());
  const secure = process.env.NODE_ENV === "production";
  res.cookies.set(STATE_COOKIE, state, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });
  res.cookies.set(LOCALE_COOKIE, locale, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });
  return res;
}
