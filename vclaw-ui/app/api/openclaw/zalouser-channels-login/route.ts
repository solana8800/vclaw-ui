import { spawn } from "node:child_process";
import { NextResponse } from "next/server";

import { getPublicGatewayAuthToken } from "@/lib/gateway-env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authorize(req: Request): boolean {
  const expected = getPublicGatewayAuthToken().trim();
  if (!expected) return false;
  const h = req.headers.get("authorization");
  const bearer = h?.startsWith("Bearer ") ? h.slice(7).trim() : "";
  return bearer === expected;
}

/**
 * Bắt đầu `openclaw channels login --channel zalouser` trên máy chạy Next (cùng host với file ảnh QR).
 * Chỉ gọi được khi client gửi đúng Bearer trùng token gateway public (đã dùng cho WS).
 * Tắt hẳn: OPENCLAW_DISABLE_BROWSER_CHANNEL_LOGIN=1
 */
export async function POST(req: Request) {
  if (!authorize(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (process.env.OPENCLAW_DISABLE_BROWSER_CHANNEL_LOGIN === "1") {
    return NextResponse.json({ error: "disabled" }, { status: 403 });
  }

  const cli = (process.env.OPENCLAW_CLI ?? "openclaw").trim() || "openclaw";
  try {
    const child = spawn(cli, ["channels", "login", "--channel", "zalouser"], {
      detached: true,
      stdio: "ignore",
      env: process.env as NodeJS.ProcessEnv,
    });
    child.unref();
    console.info("[openclaw] zalouser-channels-login spawn", { cli, pid: child.pid });
    return NextResponse.json({
      ok: true as const,
      pid: child.pid ?? null,
      cli,
      args: ["channels", "login", "--channel", "zalouser"],
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
