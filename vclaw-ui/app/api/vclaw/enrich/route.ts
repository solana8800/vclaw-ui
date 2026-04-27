import { NextRequest, NextResponse } from "next/server";
import { enrichChatContext } from "@/lib/actions/ai-actions";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { message, pathname = "/", channel = "zalo", externalId } = body;

    if (!message) {
      return NextResponse.json({ error: "missing_message" }, { status: 400 });
    }

    // Nạp ngữ cảnh từ Database (bao gồm cả lịch sử khách hàng nếu có externalId)
    const context = await enrichChatContext(pathname, message, externalId, "zalo");

    const enrichedPrompt = `
[VCLAW_BUSINESS_BRAIN]
Kênh: ${channel}
ZaloID: ${externalId || "Ẩn danh"}

${context}

[TIN_NHẮN_KHÁCH_HÀNG]
${message}
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
