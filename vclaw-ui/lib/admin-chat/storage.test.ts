import { afterEach, describe, expect, it, vi } from "vitest";

import {
  createEmptyConversation,
  defaultOpenclawSessionKey,
  loadAdminAiChatStore,
} from "@/lib/admin-chat/storage";

describe("admin chat storage", () => {
  afterEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  it("tạo session key riêng cho luồng Zero Token", () => {
    expect(defaultOpenclawSessionKey("84cda19a-601e-4a3c-a43c-79095df89906")).toBe(
      "agent:main:vclaw-zero-84cda19a601e",
    );
  });

  it("migrate session key vclaw-ui cũ để không tái dùng session ollama", () => {
    window.localStorage.setItem(
      "vclaw-admin-ai-chat-v1",
      JSON.stringify({
        version: 1,
        activeId: "84cda19a-601e-4a3c-a43c-79095df89906",
        conversations: [
          {
            id: "84cda19a-601e-4a3c-a43c-79095df89906",
            createdAt: 1,
            updatedAt: 1,
            messages: [],
            openclawSessionKey: "agent:main:vclaw-ui-84cda19a601e",
          },
        ],
      }),
    );

    expect(loadAdminAiChatStore()?.conversations[0]?.openclawSessionKey).toBe(
      "agent:main:vclaw-zero-84cda19a601e",
    );
  });

  it("conversation mới dùng session key zero-token", () => {
    vi.spyOn(crypto, "randomUUID").mockReturnValue("30a23732-7e28-4c2e-9a3e-bc9364a7e9d1");

    expect(createEmptyConversation().openclawSessionKey).toBe(
      "agent:main:vclaw-zero-30a237327e28",
    );
  });
});
