import { describe, expect, it } from "vitest";
import type { GatewayWsSessionMessagePayload } from "@/lib/gateway/client";
import {
  guessSendTargetFromSession,
  parseSessionMessageBubble,
  sessionChatTitle,
} from "@/lib/zalouser/zalouser-chat-format";
import type { SessionListEntry } from "@/lib/zalouser/zalouser-session-filters";

describe("parseSessionMessageBubble", () => {
  it("maps user role to them", () => {
    const payload: GatewayWsSessionMessagePayload = {
      sessionKey: "k1",
      message: { role: "user", content: [{ type: "text", text: "Xin chào" }] },
    };
    expect(parseSessionMessageBubble(payload)).toEqual({
      text: "Xin chào",
      side: "them",
    });
  });

  it("maps assistant to you", () => {
    const payload: GatewayWsSessionMessagePayload = {
      sessionKey: "k1",
      message: { role: "assistant", content: [{ type: "text", text: "Cảm ơn bạn" }] },
    };
    expect(parseSessionMessageBubble(payload)).toEqual({
      text: "Cảm ơn bạn",
      side: "you",
    });
  });

  it("identifies self by selfAccountId", () => {
    const payload: GatewayWsSessionMessagePayload = {
      sessionKey: "k1",
      message: { role: "user", senderId: "me123", text: "Tôi gửi từ app Zalo" },
    };
    expect(parseSessionMessageBubble(payload, "me123")).toEqual({
      text: "Tôi gửi từ app Zalo",
      side: "you",
    });
  });

  it("identifies self by fromMe flag", () => {
    const payload: GatewayWsSessionMessagePayload = {
      sessionKey: "k1",
      message: { role: "user", fromMe: true, text: "Tôi gửi từ app Zalo" },
    };
    expect(parseSessionMessageBubble(payload)).toEqual({
      text: "Tôi gửi từ app Zalo",
      side: "you",
    });
  });

  it("falls back to JSON for unknown shape", () => {
    const payload: GatewayWsSessionMessagePayload = { sessionKey: "x", foo: 1 };
    const r = parseSessionMessageBubble(payload);
    expect(r.side).toBe("note");
    expect(r.text).toContain("sessionKey");
  });
});

describe("sessionChatTitle", () => {
  it("prefers displayName", () => {
    const row: SessionListEntry = { key: "long-key", displayName: "An" };
    expect(sessionChatTitle(row)).toBe("An");
  });
});

describe("guessSendTargetFromSession", () => {
  it("uses lastTo", () => {
    expect(guessSendTargetFromSession({ key: "k", lastTo: " 123 " })).toBe("123");
  });

  it("uses lastThreadId when lastTo missing", () => {
    expect(guessSendTargetFromSession({ key: "k", lastThreadId: 999 })).toBe("999");
  });
});
