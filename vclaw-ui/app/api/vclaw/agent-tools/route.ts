import { NextResponse } from "next/server";

import { executeVclawAgentTool, VCLAW_AGENT_TOOL_NAMES, VCLAW_AGENT_TOOLS_METADATA } from "@/lib/ai/tools";

export const runtime = "nodejs";

/**
 * Bridge HTTP cho OpenClaw / automation gọi nghiệp vụ VClaw.
 * Header: `Authorization: Bearer $VCLAW_AGENT_TOOLS_SECRET`
 * Body JSON: `{ "tool": "vclaw.order.create", "arguments": { ... } }`
 */
export async function POST(req: Request) {
  const secret = process.env.VCLAW_AGENT_TOOLS_SECRET;
  if (!secret) {
    return NextResponse.json(
      { ok: false, error: "VCLAW_AGENT_TOOLS_SECRET not configured" },
      { status: 503 },
    );
  }
  const auth = req.headers.get("authorization") ?? "";
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  let body: { tool?: string; arguments?: Record<string, unknown> };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }
  const tool = typeof body.tool === "string" ? body.tool.trim() : "";
  const args = body.arguments && typeof body.arguments === "object" ? body.arguments : {};
  if (!tool) {
    return NextResponse.json({ ok: false, error: "missing_tool" }, { status: 400 });
  }

  const out = await executeVclawAgentTool(tool, args);
  return NextResponse.json(out, { status: out.ok ? 200 : 400 });
}

export async function GET() {
  return NextResponse.json({
    mcpVersion: "1.0.0",
    name: "VClaw Business Tool Server",
    version: "1.0.0",
    description: "Server cung cấp các công cụ nghiệp vụ (orders, products, customers) và kết nối OpenClaw cho AI Agent.",
    tools: VCLAW_AGENT_TOOLS_METADATA,
    resources: [
      {
        uri: "vclaw://commerce/catalog",
        name: "Product Catalog",
        description: "Danh mục sản phẩm thực tế từ Database"
      },
      {
        uri: "vclaw://shop/settings",
        name: "Shop Settings",
        description: "Cấu hình cửa hàng và thông tin thanh toán"
      },
      {
        uri: "vclaw://system/status",
        name: "System Status",
        description: "Trạng thái tổng quát của hệ thống local"
      }
    ],
    auth: {
      type: "bearer",
      instructions: "Sử dụng VCLAW_AGENT_TOOLS_SECRET trong header Authorization: Bearer <secret>"
    },
    capabilities: {
      autoMediaExtraction: true,
      zaloGatewaySupport: true
    }
  });
}
