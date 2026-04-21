import { NextResponse } from "next/server";

import { verifyZaloWebhookSignature, handleZaloWebhookJson } from "@/lib/zalo-webhook";

export const runtime = "nodejs";

/**
 * Webhook Zalo OA pilot — URL công khai: `/api/webhooks/channel/zalo`
 * Đặt URL này trong Zalo Developer Console; `ZALO_OA_WEBHOOK_SECRET` khuyến nghị cho production.
 */
export async function POST(req: Request) {
  const raw = await req.text();
  const secret = process.env.ZALO_OA_WEBHOOK_SECRET;

  const v = verifyZaloWebhookSignature(secret, raw, req.headers);
  if (!v.ok) {
    return NextResponse.json({ ok: false, error: v.reason ?? "verify_failed" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  try {
    const result = await handleZaloWebhookJson(body, raw);
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    console.error("[zalo webhook]", e);
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "ingest_failed" },
      { status: 500 },
    );
  }
}

/** Một số console gửi GET để verify URL */
export async function GET() {
  return NextResponse.json({ ok: true, path: "/api/webhooks/channel/zalo" });
}
