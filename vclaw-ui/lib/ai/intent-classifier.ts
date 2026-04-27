export type Intent = "PRICE_INQUIRY" | "ORDER" | "COMPLAINT" | "GENERAL";

const INTENT_MAP: Record<Intent, string[]> = {
  PRICE_INQUIRY: ["giá", "bao nhiêu", "nhiêu", "báo giá", "price", "$", "k"],
  ORDER: ["mua", "đặt", "order", "ship", "gửi", "lấy", "chốt"],
  COMPLAINT: ["lỗi", "sai", "hỏng", "tệ", "chưa nhận được", "chậm", "kém"],
  GENERAL: [],
};

const INTENT_LABELS: Record<Intent, string> = {
  PRICE_INQUIRY: "Hỏi giá",
  ORDER: "Đặt hàng",
  COMPLAINT: "Khiếu nại",
  GENERAL: "Thông thường",
};

export function classifyIntent(text: string): Intent {
  const lower = text.toLowerCase();
  for (const [intent, keywords] of Object.entries(INTENT_MAP)) {
    if (intent === "GENERAL") continue;
    if (keywords.some((k) => lower.includes(k))) {
      return intent as Intent;
    }
  }
  return "GENERAL";
}

export function getIntentLabel(intent: Intent): string {
  return INTENT_LABELS[intent];
}
