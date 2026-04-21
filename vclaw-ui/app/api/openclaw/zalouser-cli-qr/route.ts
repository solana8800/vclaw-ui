import { readFile, stat } from "fs/promises";
import { NextResponse } from "next/server";
import { resolveOpenclawZalouserCliQrFile } from "@/lib/openclaw-zalouser-cli-qr-path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Phục vụ ảnh QR do `openclaw channels login --channel zalouser` ghi ra (PNG).
 * Chỉ đọc đường dẫn từ biến môi trường server — trình duyệt không đọc được /tmp trực tiếp.
 */
export async function GET() {
  const resolved = resolveOpenclawZalouserCliQrFile(process.env.OPENCLAW_ZALOUSER_QR_FILE);
  if (!resolved) {
    return NextResponse.json(
      { error: "Set OPENCLAW_ZALOUSER_QR_FILE to an absolute path like /tmp/openclaw/openclaw-zalouser-qr-default.png" },
      { status: 503 },
    );
  }
  try {
    const st = await stat(resolved);
    if (!st.isFile()) {
      return NextResponse.json({ error: "not a file" }, { status: 404 });
    }
    const buf = await readFile(resolved);
    return new NextResponse(buf, {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch {
    return NextResponse.json({ error: "file not readable" }, { status: 404 });
  }
}
