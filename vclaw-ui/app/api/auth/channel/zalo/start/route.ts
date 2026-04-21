import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const appId = process.env.ZALO_OA_APP_ID;
  if (!appId) {
    return NextResponse.json(
      { error: "Missing ZALO_OA_APP_ID. See channel pilot env in docs." },
      { status: 501 },
    );
  }
  const origin = new URL(req.url).origin;
  const redirectUri =
    process.env.ZALO_OA_REDIRECT_URI ?? `${origin}/api/auth/channel/zalo/callback`;
  const url = new URL("https://oauth.zaloapp.com/v4/oa/permission");
  url.searchParams.set("app_id", appId);
  url.searchParams.set("redirect_uri", redirectUri);
  return NextResponse.redirect(url.toString());
}
