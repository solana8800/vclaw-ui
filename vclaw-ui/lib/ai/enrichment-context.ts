import "server-only";
import { prisma } from "@/lib/db";
import type { Customer, Product, ShopSettings } from "@prisma/client";

export type CustomerWithOrders = Customer & { orders: { orderNumber: string; amount: number; status: string }[] };

export function buildRoleContext(source: "admin" | "zalo"): string {
  if (source === "zalo") {
    return `[VAI_TRÒ_TRẢ_LỜI]
- Bạn đang trả lời khách hàng cuối trên Zalo/chat, không phải admin/chủ shop.
- Chỉ tập trung sản phẩm thật trong database, chốt đơn, QR, ship hàng và bill.
- Không tư vấn vận hành trang admin, không nói doanh thu, bill nội bộ, task nội bộ hay cấu hình hệ thống.`;
  }
  return `[VAI_TRÒ_TRẢ_LỜI]
- Bạn đang nói chuyện với admin/chủ shop trong dashboard VClaw.`;
}

export async function buildShopContext(
  source: "admin" | "zalo"
): Promise<{ block: string; settings: ShopSettings | null }> {
  const settings = await prisma.shopSettings.findFirst();
  if (!settings) return { block: "", settings: null };

  const approval = JSON.parse(settings.approvalConfigJson || "{}");
  const notification = JSON.parse(settings.notificationConfigJson || "{}");
  const automation = JSON.parse(settings.automationRulesJson || "{}");

  const payFollow = automation.paymentFollowup;
  const payFollowLine =
    payFollow?.enabled === true && typeof payFollow.delayValue === "number"
      ? `BẬT (sau ${payFollow.delayValue}h)`
      : payFollow?.enabled === true
        ? "BẬT (chưa cấu hình delay)"
        : "TẮT";

  const apptRem = automation.appointmentReminder;
  const apptRemLine =
    apptRem?.enabled === true && typeof apptRem.delayValue === "number"
      ? `BẬT (trước ${apptRem.delayValue}h)`
      : apptRem?.enabled === true
        ? "BẬT (chưa cấu hình delay)"
        : "TẮT";

  const rawWebsite = (settings.website || "").trim();
  const websiteBullet =
    source === "zalo" && /vclaw\.space/i.test(rawWebsite)
      ? `- Website (landing — CẤM ghép path /payment/... làm link chuyển khoản): ${rawWebsite || "N/A"}`
      : `- Website: ${rawWebsite || "N/A"}`;

  const systemConfigBlock =
    source === "admin"
      ? `\n\n[CẤU_HÌNH_HỆ_THỐNG]
- Tự động duyệt thanh toán: ${approval.paymentAutoApprove ? "BẬT" : "TẮT"}
- Tự động hóa: ${approval.automationEnabled ? "BẬT" : "TẮT"}
- Nhịp nhắc việc: ${notification.reminderInterval || 2} giờ
- Follow-up thanh toán: ${payFollowLine}
- Nhắc lịch hẹn: ${apptRemLine}`
      : "";

  const block = `[THÔNG_TIN_CỬA_HÀNG]
- Tên: ${settings.shopName || "VClaw Shop"}
- Hotline: ${settings.phone || "N/A"}
- Email: ${settings.email || "N/A"}
- Địa chỉ: ${settings.address || "N/A"}
${websiteBullet}
- Thanh toán: ${settings.bankName || "N/A"} | STK: ${settings.accountNumber || "N/A"} | Chủ TK: ${settings.accountHolder || "N/A"}${systemConfigBlock}`;

  return { block, settings };
}

export async function buildBusinessMetrics(): Promise<string> {
  try {
    const { getCommerceReportSnapshot, getAdminOverviewSnapshot } = await import("@/lib/commerce/report-stats");
    const [comm, admin] = await Promise.all([getCommerceReportSnapshot(), getAdminOverviewSnapshot()]);
    return `[TÌNH_HÌNH_KINH_DOANH_HIỆN_TẠI]
- Tổng doanh thu: ${comm.revenue.toLocaleString()}đ
- Tổng khách hàng: ${comm.customerCount}
- Thanh toán chờ duyệt: ${admin.pendingPayments} bill (CẦN XỬ LÝ)
- Lịch hẹn hôm nay: ${admin.bookingsToday} khách
- Công việc tồn đọng: ${admin.tasksOpen} việc`;
  } catch (e) {
    console.error("[vclaw:enrichment-context] Lỗi lấy report stats:", e);
    return "";
  }
}

export async function buildCustomerContext(
  externalId: string
): Promise<{ block: string; customer: CustomerWithOrders | null }> {
  const conversation = await prisma.conversation.findFirst({
    where: { externalThreadId: externalId },
    include: {
      customer: {
        include: { orders: { orderBy: { createdAt: "desc" }, take: 3 } },
      },
    },
  });
  const customer = (conversation?.customer as CustomerWithOrders | undefined) ?? null;
  if (!customer) return { block: "", customer: null };

  const orderHistory =
    customer.orders.length > 0
      ? customer.orders
          .map(o => `  - Đơn #${o.orderNumber}: ${o.amount.toLocaleString()}đ (${o.status})`)
          .join("\n")
      : "  Chưa có đơn hàng.";

  const block = `[KHÁCH_ĐANG_CHAT]
- Tên: ${customer.name}
- SĐT: ${customer.phone || "chưa có"}
- Lịch sử đơn hàng:
${orderHistory}`;

  return { block, customer };
}

/**
 * Lấy nội dung các tin nhắn IN gần nhất từ hội thoại — dùng khi cần detect
 * sản phẩm/buy intent từ lịch sử thay vì tin nhắn hiện tại (vd: phone card).
 */
export async function fetchRecentInMessages(externalId: string, take = 8): Promise<string> {
  const conv = await prisma.conversation.findFirst({
    where: { externalThreadId: externalId },
    select: { id: true },
  });
  if (!conv) return "";
  const msgs = await prisma.conversationMessage.findMany({
    where: { conversationId: conv.id, direction: "IN" },
    orderBy: { createdAt: "desc" },
    take,
    select: { body: true },
  });
  return msgs
    .map(m => m.body)
    .reverse()
    .join(" ");
}

export async function buildProductCatalog(): Promise<{ block: string; products: Product[] }> {
  const products = await prisma.product.findMany({ where: { status: "ACTIVE" } });
  const productList = products
    .map(p => `- [ID:${p.id}] [${p.category || "Chưa phân loại"}] ${p.name}: ${p.price.toLocaleString()}đ`)
    .join("\n");

  const block =
    products.length > 0
      ? `[DANH_MỤC_SẢN_PHẨM]\n${productList}`
      : `[DANH_MỤC_SẢN_PHẨM — RỖNG — OVERRIDE TOÀN BỘ LỊCH SỬ]
Database sản phẩm hiện tại RỖNG HOÀN TOÀN.
TUYỆT ĐỐI KHÔNG nhắc, gợi ý hoặc báo giá bất kỳ sản phẩm nào — kể cả sản phẩm đã xuất hiện trong lịch sử hội thoại, vì chúng không còn tồn tại trong hệ thống.
Khi khách hỏi mua hoặc hỏi sản phẩm: trả lời đúng 1 câu "Shop đang cập nhật danh mục, anh/chị cho em xin SĐT để báo lại sớm nhé." rồi dừng — không thêm bất kỳ tên hàng nào.`;

  return { block, products };
}
