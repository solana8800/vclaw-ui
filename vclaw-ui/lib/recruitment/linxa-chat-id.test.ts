import { describe, expect, it } from "vitest";

import { resolveLinxaChatId } from "@/lib/recruitment/linxa-chat-id";

describe("resolveLinxaChatId", () => {
  it("ưu tiên linxaChatId", () => {
    expect(resolveLinxaChatId("chat-1", "https://linkedin.com/in/x")).toBe("chat-1");
  });

  it("đọc từ linxa://chat/", () => {
    expect(resolveLinxaChatId(null, "linxa://chat/abc%20123")).toBe("abc 123");
  });
});
