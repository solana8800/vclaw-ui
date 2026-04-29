import { describe, expect, it, vi } from "vitest";

import {
  buildZalouserSessionKey,
  normalizeZalouserHistoryMessage,
  resolveZalouserProviderThreadFromSessionKey,
  shouldStartNewZalouserConversation,
  syncZalouserHistoryMessages,
} from "@/lib/zalouser/zalouser-conversation-sync";

describe("buildZalouserSessionKey", () => {
  it("uses canonical direct and group OpenClaw session keys", () => {
    expect(buildZalouserSessionKey("user:123")).toBe("agent:main:zalouser:direct:123");
    expect(buildZalouserSessionKey("123")).toBe("agent:main:zalouser:direct:123");
    expect(buildZalouserSessionKey("group:g-1")).toBe("agent:main:zalouser:group:g-1");
  });
});

describe("resolveZalouserProviderThreadFromSessionKey", () => {
  it("preserves direct and group target kinds from canonical OpenClaw keys", () => {
    expect(
      resolveZalouserProviderThreadFromSessionKey("agent:main:zalouser:direct:123"),
    ).toEqual({ provider: "zalouser", externalThreadId: "user:123" });
    expect(
      resolveZalouserProviderThreadFromSessionKey("agent:main:zalouser:group:g-1"),
    ).toEqual({ provider: "zalouser", externalThreadId: "group:g-1" });
  });
});

describe("shouldStartNewZalouserConversation", () => {
  it("starts a new conversation when the customer returns on a later local day", () => {
    expect(
      shouldStartNewZalouserConversation({
        latestUpdatedAt: new Date("2026-04-28T15:30:00.000Z"),
        now: new Date("2026-04-29T02:00:00.000Z"),
        timeZone: "Asia/Ho_Chi_Minh",
      }),
    ).toBe(true);
  });

  it("keeps the conversation on the same local day", () => {
    expect(
      shouldStartNewZalouserConversation({
        latestUpdatedAt: new Date("2026-04-29T01:00:00.000Z"),
        now: new Date("2026-04-29T10:00:00.000Z"),
        timeZone: "Asia/Ho_Chi_Minh",
      }),
    ).toBe(false);
  });
});

describe("normalizeZalouserHistoryMessage", () => {
  it("maps user messages to inbound conversation messages", () => {
    expect(
      normalizeZalouserHistoryMessage({
        sessionKey: "agent:main:zalouser:group-1",
        externalThreadId: "group-1",
        message: {
          id: "m-1",
          role: "user",
          content: [{ type: "text", text: "Khách hỏi còn hàng không?" }],
          createdAt: "2026-04-25T03:00:00.000Z",
        },
      }),
    ).toMatchObject({
      provider: "zalouser",
      externalThreadId: "group-1",
      openclawSessionKey: "agent:main:zalouser:group-1",
      direction: "IN",
      body: "Khách hỏi còn hàng không?",
      externalMessageId: "m-1",
    });
  });

  it("maps assistant messages to outbound conversation messages", () => {
    expect(
      normalizeZalouserHistoryMessage({
        sessionKey: "agent:main:zalouser:group-1",
        externalThreadId: "group-1",
        message: {
          id: "m-2",
          role: "assistant",
          content: [{ type: "text", text: "Shop còn hàng bạn nhé." }],
        },
      }),
    ).toMatchObject({
      direction: "OUT",
      body: "Shop còn hàng bạn nhé.",
      externalMessageId: "m-2",
    });
  });
});

describe("syncZalouserHistoryMessages", () => {
  it("upserts the conversation and skips duplicate history messages by external id", async () => {
    const existingMessages = new Set<string>();
    const repo = {
      upsertConversation: vi.fn(async () => ({ id: "conv-1" })),
      findMessageByExternalId: vi.fn(async (_conversationId: string, externalMessageId: string) =>
        existingMessages.has(externalMessageId) ? { id: "existing" } : null,
      ),
      createMessage: vi.fn(async (input: { externalMessageId: string | null }) => {
        if (input.externalMessageId) existingMessages.add(input.externalMessageId);
        return { id: "new" };
      }),
      getOrCreateConversationSession: vi.fn(async () => ({ id: "conv-1" })),
    };

    const messages = [
      { id: "m-1", role: "user", content: [{ type: "text", text: "Tin nhận" }] },
      { id: "m-1", role: "user", content: [{ type: "text", text: "Tin nhận" }] },
      { id: "m-2", role: "assistant", content: [{ type: "text", text: "Tin gửi" }] },
    ];

    const result = await syncZalouserHistoryMessages({
      repo,
      sessionKey: "agent:main:zalouser:group-1",
      externalThreadId: "group-1",
      title: "Nhóm bán hàng",
      messages,
      revalidate: false,
    });

    expect(repo.getOrCreateConversationSession).toHaveBeenCalledWith({
      provider: "zalouser",
      externalThreadId: "group-1",
      title: "Nhóm bán hàng",
      openclawSessionKey: "agent:main:zalouser:group-1",
      selfAccountId: undefined,
    });
    expect(repo.createMessage).toHaveBeenCalledTimes(2);
    expect(result).toEqual({ conversationId: "conv-1", inserted: 2, skipped: 1 });
  });
});
