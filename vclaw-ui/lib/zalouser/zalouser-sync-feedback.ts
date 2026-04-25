export function formatZalouserSyncFeedback(input: {
  historyCount: number;
  inserted: number;
  skipped: number;
}): string {
  if (input.historyCount <= 0) {
    return "Đồng bộ xong nhưng Gateway chưa trả lịch sử cho hội thoại này.";
  }

  return `Đồng bộ xong: Gateway trả ${input.historyCount} tin, thêm ${input.inserted} tin mới, bỏ qua ${input.skipped} tin đã có.`;
}
