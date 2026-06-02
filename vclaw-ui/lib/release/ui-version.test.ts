import { describe, expect, it } from "vitest";

import { formatUiVersionLabel } from "@/lib/release/ui-version";

describe("formatUiVersionLabel", () => {
  it("hiển thị phiên bản giao diện ngắn gọn", () => {
    expect(formatUiVersionLabel("0.1.1")).toBe("v0.1.1");
  });
});
