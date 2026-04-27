import { describe, expect, it } from "vitest";

import enAdmin from "@/messages/en/admin.json";
import viAdmin from "@/messages/vi/admin.json";

describe("admin messages", () => {
  it("exposes VClaw status copy at admin.openclawStatus for every locale", () => {
    for (const messages of [enAdmin, viAdmin]) {
      expect(messages).toHaveProperty("openclawStatus.title");
      expect(messages).toHaveProperty("openclawStatus.actionDescriptions.runtime_not_web");
      expect(messages).not.toHaveProperty("aiChat.openclawStatus");
    }
  });
});
