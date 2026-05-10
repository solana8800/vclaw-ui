import { describe, expect, it } from "vitest";

import { formatZalouserSyncFeedback } from "@/lib/zalouser/zalouser-sync-feedback";

describe("formatZalouserSyncFeedback", () => {
  it("báo rõ số tin nhận được, thêm mới và bỏ qua", () => {
    const copy = {
      empty: "empty",
      summary: "Đồng bộ xong: Gateway trả {historyCount} tin, thêm {inserted} tin mới, bỏ qua {skipped} tin đã có.",
    };
    expect(
      formatZalouserSyncFeedback(
        {
          historyCount: 18,
          inserted: 2,
          skipped: 16,
        },
        copy,
      ),
    ).toBe("Đồng bộ xong: Gateway trả 18 tin, thêm 2 tin mới, bỏ qua 16 tin đã có.");
  });

  it("báo khi Gateway không trả lịch sử", () => {
    const copy = {
      empty: "Đồng bộ xong nhưng Gateway chưa trả lịch sử cho hội thoại này.",
      summary: "",
    };
    expect(
      formatZalouserSyncFeedback(
        {
          historyCount: 0,
          inserted: 0,
          skipped: 0,
        },
        copy,
      ),
    ).toBe("Đồng bộ xong nhưng Gateway chưa trả lịch sử cho hội thoại này.");
  });
});
