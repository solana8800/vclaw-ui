import { describe, expect, it } from "vitest";

import { getUiUpdateNotification } from "@/lib/release/ui-update-notifications";

describe("UI update notifications", () => {
  it("maps visible lifecycle milestones to localized toast keys", () => {
    expect(getUiUpdateNotification("detected")).toEqual({
      type: "info",
      messageKey: "detected",
    });
    expect(getUiUpdateNotification("downloaded")).toEqual({
      type: "success",
      messageKey: "downloaded",
    });
    expect(getUiUpdateNotification("applied")).toEqual({
      type: "success",
      messageKey: "applied",
    });
    expect(getUiUpdateNotification("failed")).toEqual({
      type: "error",
      messageKey: "failed",
    });
  });

  it("keeps internal download progress phases silent", () => {
    expect(getUiUpdateNotification("downloading")).toBeNull();
  });
});
