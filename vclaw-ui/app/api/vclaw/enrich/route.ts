import { NextRequest, NextResponse } from "next/server";
import { getEnrichedContext } from "@/lib/ai/enrichment";
import { buildEnrichedPrompt } from "@/lib/ai/prompts/enrichment-prompts";
import { cleanZaloBody } from "@/lib/zalouser/zalouser-chat-format";
import { getApprovalConfig } from "@/lib/automation/approval-config";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { message, pathname = "/", channel = "zalo", externalId } = body;

    if (!message) {
      return NextResponse.json({ error: "missing_message" }, { status: 400 });
    }

    console.info(
      "[vclaw:POST /api/vclaw/enrich]",
      JSON.stringify({ channel, pathname, hasExt: Boolean(externalId), msgLen: String(message).length })
    );

    const approval = await getApprovalConfig();
    if (!approval.automationEnabled) {
      console.info("[vclaw:POST /api/vclaw/enrich] automation_disabled");
      return NextResponse.json({
        ok: true,
        prompt: "",
        metadata: {
          enriched: false,
          customerIdDetected: !!externalId,
          automationEnabled: false,
          skipAutoReply: true,
          reason: "automation_disabled",
        },
      });
    }

    // Nạp ngữ cảnh từ Database (bao gồm cả lịch sử khách hàng nếu có externalId)
    const context = await getEnrichedContext(pathname, message, externalId, "zalo");

    // Làm sạch tin nhắn trước khi đưa vào Prompt
    const cleanedMessage = cleanZaloBody(message);

    const enrichedPrompt = buildEnrichedPrompt(channel, externalId, context, cleanedMessage);


    return NextResponse.json({
      ok: true,
      prompt: enrichedPrompt,
      metadata: {
        enriched: true,
        automationEnabled: true,
        customerIdDetected: !!externalId
      }
    });

  } catch (error) {
    console.error("Lỗi Enrichment API:", error);
    return NextResponse.json({ error: "internal_server_error" }, { status: 500 });
  }
}
