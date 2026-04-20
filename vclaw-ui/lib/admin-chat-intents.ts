/**
 * Nhận diện ý định đơn giản từ chat admin (không cần OpenClaw).
 * Chuẩn hoá bỏ dấu để khớp > tiếng Việt không dấu.
 */
/** Khóa bản dịch `admin.aiChat.replies.*` khi điều hướng */
export type AdminNavReplyKey = "nav" | "navGuide" | "navIntegrations";

export type AdminChatIntent =
  | { kind: "nav"; path: string; reply?: AdminNavReplyKey }
  | { kind: "help" }
  | null;

function fold(s: string) {
  return s
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .trim();
}

const rules: Array<{ re: RegExp; path: string; reply?: AdminNavReplyKey }> = [
  {
    re: /(dang bai|bai dang|dang tin|tao bai|dang len facebook|dang facebook|dang len zalo|dang zalo|post len mang|publish post|social post|dang noi dung|posting|sales channel|dang len instagram)/,
    path: "/admin/integrations",
    reply: "navIntegrations",
  },
  { re: /(san pham|hang hoa|catalog|product|them hang)/, path: "/admin/products" },
  { re: /(khach hang|customer|lead)/, path: "/admin/customers" },
  { re: /(don hang|dat hang|order|kanban)/, path: "/admin/orders" },
  { re: /(thanh toan|payment|bill|chuyen khoan|vietqr)/, path: "/admin/payments" },
  { re: /(lich hen|booking|hen)/, path: "/admin/bookings" },
  { re: /(giao van|ship|van chuyen)/, path: "/admin/shipping" },
  { re: /(bao cao|thong ke|report)/, path: "/admin/reports" },
  { re: /(khoi tao|cua hang|onboarding|viet qr|qr ngan hang)/, path: "/admin/onboarding" },
  { re: /(tu dong|automation|hang doi)/, path: "/admin/automation" },
  { re: /(tich hop|kenh|zalo|telegram|shopee|facebook)/, path: "/admin/integrations" },
  { re: /(hop thu|inbox|duyet)/, path: "/admin/inbox" },
  { re: /(cai dat|settings)/, path: "/admin/settings" },
  { re: /(tong quan|dashboard|trang chu)/, path: "/admin" },
];

const helpRe =
  /(huong dan|tro giup|help|bat dau|lam gi|lam the nao|chuc nang|co the lam|dung duoc)/;

const guideRe =
  /(chuc nang nao|lam duoc gi|dung duoc gi|bang chuc nang|trang huong dan|mo huong dan|user guide|\/admin\/guide|what works|which features|feature list)/;

export function matchAdminChatIntent(raw: string): AdminChatIntent {
  const s = fold(raw);
  if (!s) return null;
  if (guideRe.test(s)) return { kind: "nav", path: "/admin/guide", reply: "navGuide" };
  if (helpRe.test(s)) return { kind: "help" };
  for (const { re, path, reply } of rules) {
    if (re.test(s)) return { kind: "nav", path, reply };
  }
  return null;
}
