import { readFile, stat } from "fs/promises";
import { NextResponse } from "next/server";
import { resolveZalouserCliQrFilePathForServer } from "@/lib/openclaw-zalouser-cli-qr-path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Phục vụ ảnh QR do `openclaw channels login --channel zalouser` ghi ra (PNG).
 * Mặc định đọc `/tmp/openclaw/openclaw-zalouser-qr-default.png` (Unix); ghi đè bằng `OPENCLAW_ZALOUSER_QR_FILE`.
 */
export async function GET() {
  const resolved = resolveZalouserCliQrFilePathForServer();
  if (!resolved) {
    return NextResponse.json(
      {
        error:
          "No QR path: on Windows set OPENCLAW_ZALOUSER_QR_FILE to an absolute path to openclaw-zalouser-qr-*.png",
      },
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
        "Last-Modified": st.mtime.toUTCString(),
      },
    });
  } catch {
    return NextResponse.json({ error: "file not readable" }, { status: 404 });
  }
}
