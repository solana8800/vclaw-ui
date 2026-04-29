import { foldLocaleSearchString } from "@/lib/shared";

/**
 * Nhận diện ý định điều hướng rõ ràng từ chat admin.
 * Chỉ khớp khi người dùng thực sự muốn chuyển trang (ví dụ: "mở trang...", "đi tới...").
 */
export type AdminNavReplyKey = "nav" | "navGuide";

type AdminChatIntent =
  | { kind: "nav"; path: string; reply?: AdminNavReplyKey }
  | { kind: "help" }
  | null;

/** Tiền tố bắt buộc cho các lệnh điều hướng */
const navPrefix = /(?:mo|chuyen|di toi|show|open|go to|truy cap|vao)\s+(?:trang\s+|muc\s+)?/;

const navRules: Array<{ re: RegExp; path: string; reply?: AdminNavReplyKey }> = [
  { re: /huong dan|guide|tro giup|help/, path: "/admin/guide", reply: "navGuide" },
  { re: /don hang|order|ban hang/, path: "/admin/orders" },
  { re: /san pham|hang hoa|catalog|product/, path: "/admin/products" },
  { re: /khach hang|customer|lead/, path: "/admin/customers" },
  { re: /thanh toan|payment|bill|bank/, path: "/admin/payments" },
  { re: /giao hang|shipping|van chuyen|ship/, path: "/admin/shipping" },
  { re: /lich hen|booking|hen/, path: "/admin/bookings" },
  { re: /zalo|qr|ket noi/, path: "/admin/zalouser" },
  { re: /bao cao|thong ke|report|dashboard/, path: "/admin/reports" },
  { re: /cai dat|settings|cau hinh|system/, path: "/admin/settings" },
  { re: /tu dong|automation|hang doi|queue/, path: "/admin/automation" },
  { re: /hop thu|inbox|tin nhan/, path: "/admin/inbox" },
];

export function matchAdminChatIntent(raw: string): AdminChatIntent {
  const s = foldLocaleSearchString(raw);
  if (!s) return null;

  // Lệnh trợ giúp đơn giản
  if (/^(?:help|huong dan|bat dau|help me)$/.test(s)) return { kind: "help" };

  // Kiểm tra lệnh điều hướng có tiền tố
  const matchNav = s.match(new RegExp(`^${navPrefix.source}(.*)`));
  if (matchNav) {
    const target = matchNav[1].trim();
    for (const rule of navRules) {
      if (rule.re.test(target)) {
        return { kind: "nav", path: rule.path, reply: rule.reply };
      }
    }
  }

  // Nếu gõ đúng đường dẫn /admin/...
  if (s.startsWith("/admin")) {
    return { kind: "nav", path: s as string };
  }

  return null;
}

