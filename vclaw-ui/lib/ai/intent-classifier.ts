export type Intent = 
  | "PRICE_INQUIRY" 
  | "ORDER" 
  | "COMPLAINT" 
  | "CANCEL"
  | "GREETING" 
  | "THANK_YOU" 
  | "HUMAN_HELP"
  | "GENERAL";

interface IntentDefinition {
  priority: number;
  keywords: string[];
  exclude?: string[];
}

const INTENT_MAP: Record<Exclude<Intent, "GENERAL">, IntentDefinition> = {
  // Ưu tiên cao nhất: Các vấn đề khẩn cấp hoặc giao dịch
  HUMAN_HELP: {
    priority: 100,
    keywords: ["nhân viên", "người", "tư vấn viên", "gặp trực tiếp", "số điện thoại", "hotline", "gọi cho tôi", "alo", "chat với người", "rep", "ib", "inbox"],
  },
  COMPLAINT: {
    priority: 90,
    keywords: ["lỗi", "sai", "hỏng", "tệ", "chưa nhận được", "chậm", "kém", "không dùng được", "lừa đảo", "bực", "quá lâu"],
  },
  CANCEL: {
    priority: 85,
    keywords: ["hủy", "không mua", "thôi", "đừng", "không lấy", "không đặt", "hủy đơn", "từ chối"],
  },
  ORDER: {
    priority: 80,
    keywords: ["mua", "đặt", "order", "ship", "gửi", "lấy", "chốt", "lên đơn", "lấy 2 vé", "lấy một", "book"],
    exclude: ["không mua", "hủy đơn", "không đặt"],
  },
  PRICE_INQUIRY: {
    priority: 70,
    keywords: ["giá", "bao nhiêu", "nhiêu", "báo giá", "price", "$", "k", "bn", "nhiu", "cbn", "nhiều tiền", "chi phí", "tốn bao"],
    exclude: ["giá rẻ quá", "giá đắt"],
  },
  // Ưu tiên thấp: Các ý định xã giao
  THANK_YOU: {
    priority: 20,
    keywords: ["cảm ơn", "thank", "tks", "cảm ơn bạn", "ok cám ơn", "đã rõ"],
  },
  GREETING: {
    priority: 10,
    keywords: ["chào", "hi", "hello", "xin chào", "hey", "ad ơi", "shop ơi", "em ơi", "anh ơi", "alo shop"],
  },
};

const INTENT_LABELS: Record<Intent, string> = {
  HUMAN_HELP: "Cần nhân viên",
  COMPLAINT: "Khiếu nại",
  CANCEL: "Hủy/Từ chối",
  ORDER: "Đặt hàng",
  PRICE_INQUIRY: "Hỏi giá",
  THANK_YOU: "Cảm ơn",
  GREETING: "Chào hỏi",
  GENERAL: "Thông thường",
};

/**
 * Loại bỏ dấu tiếng Việt để so khớp chính xác
 */
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .trim();
}

export function classifyIntent(text: string): Intent {
  if (!text) return "GENERAL";
  const normalized = normalizeText(text);

  // Sắp xếp các ý định theo độ ưu tiên giảm dần
  const sortedIntents = (Object.entries(INTENT_MAP) as [Exclude<Intent, "GENERAL">, IntentDefinition][])
    .sort((a, b) => b[1].priority - a[1].priority);

  for (const [intent, def] of sortedIntents) {
    // 1. Kiểm tra từ khóa loại trừ trước
    if (def.exclude?.some(ex => normalized.includes(normalizeText(ex)))) {
      continue;
    }

    // 2. Kiểm tra từ khóa chính
    if (def.keywords.some(kw => normalized.includes(normalizeText(kw)))) {
      return intent;
    }
  }

  return "GENERAL";
}

export function getIntentLabel(intent: Intent): string {
  return INTENT_LABELS[intent] || "Thông thường";
}
