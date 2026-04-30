import { NextRequest, NextResponse } from "next/server";
import { getEnrichedContext } from "@/lib/ai/enrichment";
import { cleanZaloBody } from "@/lib/zalouser/zalouser-chat-format";

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

    // Nạp ngữ cảnh từ Database (bao gồm cả lịch sử khách hàng nếu có externalId)
    const context = await getEnrichedContext(pathname, message, externalId, "zalo");

    // Làm sạch tin nhắn trước khi đưa vào Prompt
    const cleanedMessage = cleanZaloBody(message);

    const enrichedPrompt = `
[VCLAW_BUSINESS_BRAIN]
Kênh: ${channel}
ZaloID: ${externalId || "Ẩn danh"}

${context}

[TIN_NHẮN_KHÁCH_HÀNG]
${cleanedMessage}
`.trim();

    return NextResponse.json({
      ok: true,
      prompt: enrichedPrompt,
      metadata: {
        enriched: true,
        customerIdDetected: !!externalId
      }
    });

  } catch (error) {
    console.error("Lỗi Enrichment API:", error);
    return NextResponse.json({ error: "internal_server_error" }, { status: 500 });
  }
}
