import { NextResponse } from "next/server";

import { readZalouserCliQrFileMeta, resolveZalouserCliQrFilePathForServer } from "@/lib/zalouser/openclaw-zalouser-cli-qr-path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** JSON: thời điểm file ảnh QR CLI được tạo/sửa (để UI biết mã còn mới hay đã cũ). */
export async function GET() {
  if (!resolveZalouserCliQrFilePathForServer()) {
    return NextResponse.json({ ok: false as const, error: "no_path" }, { status: 503 });
  }
  const meta = await readZalouserCliQrFileMeta();
  if (!meta) {
    return NextResponse.json({ ok: false as const, error: "not_found" }, { status: 404 });
  }
  return NextResponse.json({
    ok: true as const,
    mtimeMs: meta.mtimeMs,
    mtimeIso: meta.mtimeIso,
    size: meta.size,
  });
}
