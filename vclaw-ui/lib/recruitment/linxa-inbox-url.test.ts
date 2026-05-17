import { describe, expect, it } from "vitest";
import { buildLinxaSmartInboxUrl } from "@/lib/recruitment/linxa-inbox-url";

describe("buildLinxaSmartInboxUrl", () => {
  it("trả base khi không có chatId", () => {
    expect(buildLinxaSmartInboxUrl()).toBe("https://app.uselinxa.com/smart-inbox");
    expect(buildLinxaSmartInboxUrl("")).toBe("https://app.uselinxa.com/smart-inbox");
  });

  it("gắn chatId vào query", () => {
    expect(buildLinxaSmartInboxUrl("chat-abc")).toBe(
      "https://app.uselinxa.com/smart-inbox?chatId=chat-abc",
    );
  });
});
