import { NextResponse } from "next/server";

import { executeVclawAgentTool, VCLAW_AGENT_TOOL_NAMES } from "@/lib/vclaw-agent-tools";

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
    ok: true,
    tools: [...VCLAW_AGENT_TOOL_NAMES],
    auth: "Authorization: Bearer <VCLAW_AGENT_TOOLS_SECRET>",
  });
}
