import { describe, expect, it } from "vitest";

import { refineLinxaMessageDirections } from "@/lib/recruitment/linxa-message-direction";
import {
  extractLinxaChatMessages,
  parseStoredLinxaConversationHistory,
} from "@/lib/recruitment/linxa-message-map";

describe("extractLinxaChatMessages", () => {
  it("đọc mảng messages gốc", () => {
    const list = extractLinxaChatMessages([
      { id: "1", text: "Xin chào", isOutgoing: false, sentAt: "2026-05-01T10:00:00Z" },
      { id: "2", body: "Chào bạn", fromMe: true },
    ]);
    expect(list).toHaveLength(2);
    expect(list[0]?.direction).toBe("inbound");
    expect(list[1]?.direction).toBe("outbound");
  });

  it("đọc wrapper data.messages", () => {
    const list = extractLinxaChatMessages({
      data: { messages: [{ message: "Hi", sender: "candidate" }] },
    });
    expect(list[0]?.text).toBe("Hi");
    expect(list[0]?.direction).toBe("inbound");
  });
});

describe("parseStoredLinxaConversationHistory", () => {
  it("parse JSON đã lưu", () => {
    const list = parseStoredLinxaConversationHistory(
      JSON.stringify([{ text: "Preview", isOutgoing: false }]),
    );
    expect(list[0]?.text).toBe("Preview");
  });
});
