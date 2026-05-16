import { syncLinkedInCandidates } from "./actions";

/**
 * Xử lý sự kiện từ LinkedIn Gateway.
 */
export async function handleLinkedInGatewayEvent(event: string, payload: any) {
  if (event !== "session.message") return { success: false, reason: "Not a message event" };

  const sessionKey = payload?.sessionKey || "";
  if (!sessionKey.includes("linkedin") && !sessionKey.includes("smart-linkedin-inbox")) {
    return { success: false, reason: "Not a LinkedIn session" };
  }

  const message = payload?.message;
  if (!message || message.role !== "user") {
    return { success: false, reason: "Not a user message" };
  }

  const text = message.content?.[0]?.text || "";
  console.log(`[LinkedIn-Event] Nhận tin nhắn từ ứng viên (${sessionKey}): ${text}`);

  // Gửi cho Recruiter Agent để xử lý tự động
  try {
    const gatewayUrl = process.env.OPENCLAW_GATEWAY_URL || "http://127.0.0.1:3001";
    const token = process.env.OPENCLAW_GATEWAY_TOKEN || "";

    // Bước 1: Yêu cầu AI Agent (recruiter-agent) xử lý tin nhắn này
    // Chúng ta sử dụng endpoint /agent để gửi message vào session
    const response = await fetch(`${gatewayUrl}/tools/invoke`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        tool: "gateway",
        action: "agent",
        args: {
          sessionKey: sessionKey,
          message: text,
          agentId: "recruiter-agent" // Sử dụng persona Chuyên viên tuyển dụng
        }
      })
    });

    if (!response.ok) {
      console.error("[LinkedIn-Event] Lỗi khi gửi tin nhắn tới AI Agent");
    } else {
      console.log(`[LinkedIn-Event] AI Agent đã tiếp nhận và đang xử lý phản hồi cho ${sessionKey}`);
    }

    return { success: true };
  } catch (error) {
    console.error("[LinkedIn-Event] Lỗi xử lý sự kiện LinkedIn:", error);
    return { success: false, error };
  }
}
