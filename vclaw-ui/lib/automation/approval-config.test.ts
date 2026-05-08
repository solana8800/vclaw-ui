import { describe, expect, it, vi } from "vitest";
import { parseApprovalConfig } from "@/lib/automation/approval-config";

vi.mock("@/lib/db", () => ({
  prisma: {
    shopSettings: {
      findFirst: vi.fn(),
    },
  },
}));

describe("parseApprovalConfig", () => {
  it("chỉ giữ các cổng duyệt đang có luồng thực thi", () => {
    const config = parseApprovalConfig(
      JSON.stringify({
        paymentAutoApprove: true,
        automationEnabled: false,
        remoteAccessEnabled: true,
      }),
    );

    expect(config).toEqual({
      paymentAutoApprove: true,
      automationEnabled: false,
    });
    expect("remoteAccessEnabled" in config).toBe(false);
  });

  it("trả mặc định an toàn khi JSON lỗi", () => {
    expect(parseApprovalConfig("{bad json")).toEqual({
      paymentAutoApprove: false,
      automationEnabled: true,
    });
  });
});
