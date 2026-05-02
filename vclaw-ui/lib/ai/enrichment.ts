import "server-only";
import { prisma } from "@/lib/db";
import { executeVclawAgentTool } from "@/lib/agent";
import { cleanZaloBody } from "@/lib/zalouser/zalouser-chat-format";
import {
  ENRICHMENT_STICKER_PROMPT,
  ENRICHMENT_SYSTEM_ACTION_LORE,
  ENRICHMENT_NO_QR_WARNING,
  ENRICHMENT_VIETQR_RULES,
  ENRICHMENT_GENERAL_BEHAVIOR,
  ENRICHMENT_ACTION_ORDER_CREATED,
  ENRICHMENT_ACTION_QR_GENERATED,
  ENRICHMENT_ACTION_ORDER_FAILED,
  ENRICHMENT_ACTION_DUPLICATE_ORDER,
  ENRICHMENT_ACTION_PAYMENT_REQUESTED,
  ENRICHMENT_ACTION_PAYMENT_PROCESSING,
} from "@/lib/ai/prompts/enrichment-prompts";

/**
 * Loại bỏ dấu tiếng Việt để so khớp từ khóa chính xác hơn
 */
function removeAccents(str: string): string {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase();
}

const MAX_AUTO_ORDER_QTY = 50;

/** Bắt số lượng an toàn: tránh `iPhone\\s*(\\d+)` lấy nhầm "16" từ tên máy. */
function extractQtyForProduct(userMessage: string, productName: string): number {
  const firstWord = productName.trim().split(/\s+/)[0] || "x";
  const fwNorm = removeAccents(firstWord);
  if (!fwNorm) return 1;
  const fwEsc = firstWord.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const nMsg = removeAccents(userMessage);

  const reBefore = new RegExp(
    `(\\d{1,3})\\s*(?:cai|chiec|suat|ve|ban|goi|hop|cap)?\\s*${fwEsc}`,
    "i"
  );
  const mBefore = userMessage.match(reBefore) ?? nMsg.match(new RegExp(`(\\d{1,3})\\s*(?:cai|chiec|suat|ve|ban|goi|hop|cap)?\\s*${fwNorm}`, "i"));
  if (mBefore) {
    const q = parseInt(mBefore[1], 10);
    if (Number.isFinite(q) && q > 0) return Math.min(MAX_AUTO_ORDER_QTY, q);
  }

  const reAfter = new RegExp(`${fwEsc}\\s*(\\d{1,3})`, "i");
  const mAfter = userMessage.match(reAfter) ?? nMsg.match(new RegExp(`${fwNorm}\\s*(\\d{1,3})`, "i"));
  if (mAfter) {
    const q = parseInt(mAfter[1], 10);
    if (!Number.isFinite(q) || q <= 0) return 1;
    if (fwNorm === "iphone" && q >= 4 && q <= 17) return 1;
    return Math.min(MAX_AUTO_ORDER_QTY, q);
  }

  return 1;
}

/**
 * Logic thực thi chính: Truy xuất dữ liệu + Intent Detection + Tool Execution.
 * Chỉ chạy trên Server.
 */
export async function getEnrichedContext(
  pathname: string,
  userMessage: string,
  externalId?: string,
  source: "admin" | "zalo" = "admin"
): Promise<string> {
  const cleanedMsg = cleanZaloBody(userMessage);
  const normalizedMsg = removeAccents(cleanedMsg);
  const contextBlocks: string[] = [];
  const actionResults: string[] = [];

  try {
    console.info(
      "[vclaw:getEnrichedContext]",
      JSON.stringify({
        source,
        pathname,
        ext: externalId ? `${externalId.slice(0, 24)}…` : null,
        msgLen: userMessage.length,
      })
    );
    // 1. Thông tin Cửa hàng
    const settings = await prisma.shopSettings.findFirst();
    if (settings) {
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

      contextBlocks.push(`[THÔNG_TIN_CỬA_HÀNG]
- Tên: ${settings.shopName || "VClaw Shop"}
- Hotline: ${settings.phone || "N/A"}
- Email: ${settings.email || "N/A"}
- Địa chỉ: ${settings.address || "N/A"}
${websiteBullet}
- Thanh toán: ${settings.bankName || "N/A"} | STK: ${settings.accountNumber || "N/A"} | Chủ TK: ${settings.accountHolder || "N/A"}

[CẤU_HÌNH_HỆ_THỐNG]
- Tự động duyệt thanh toán: ${approval.paymentAutoApprove ? "BẬT" : "TẮT"}
- Tự động hóa: ${approval.automationEnabled ? "BẬT" : "TẮT"}
- Nhịp nhắc việc: ${notification.reminderInterval || 2} giờ
- Follow-up thanh toán: ${payFollowLine}
- Nhắc lịch hẹn: ${apptRemLine}`);
    }

    // 1.5 Thống kê & Hiệu năng (Dành cho báo cáo thông minh)
    try {
      const { getCommerceReportSnapshot, getAdminOverviewSnapshot } = await import("@/lib/commerce/report-stats");
      const [comm, admin] = await Promise.all([getCommerceReportSnapshot(), getAdminOverviewSnapshot()]);
      contextBlocks.push(`[TÌNH_HÌNH_KINH_DOANH_HIỆN_TẠI]
- Tổng doanh thu: ${comm.revenue.toLocaleString()}đ
- Tổng khách hàng: ${comm.customerCount}
- Thanh toán chờ duyệt: ${admin.pendingPayments} bill (CẦN XỬ LÝ)
- Lịch hẹn hôm nay: ${admin.bookingsToday} khách
- Công việc tồn đọng: ${admin.tasksOpen} việc`);
    } catch (e) {
      // Bỏ qua nếu lỗi report
      console.error("Lỗi lấy report stats:", e);
    }

    // 2. Nhận diện khách hàng
    let currentCustomer: any = null;
    if (externalId) {
      const conversation = await prisma.conversation.findFirst({
        where: { externalThreadId: externalId },
        include: { customer: { include: { orders: { orderBy: { createdAt: "desc" }, take: 3 } } } },
      });
      currentCustomer = conversation?.customer;
      if (currentCustomer) {
        const orderHistory = currentCustomer.orders.length > 0
          ? currentCustomer.orders.map((o: any) => `  - Đơn #${o.orderNumber}: ${o.amount.toLocaleString()}đ (${o.status})`).join("\n")
          : "  Chưa có đơn hàng.";
        contextBlocks.push(`[KHÁCH_ĐANG_CHAT]
- Tên: ${currentCustomer.name}
- SĐT: ${currentCustomer.phone || "chưa có"}
- Lịch sử đơn hàng:
${orderHistory}`);
      }
    }

    // 3. Catalog & Intent Detection (Local Action)
    const products = await prisma.product.findMany({ where: { status: "ACTIVE" } });
    const productList = products.map(p => `- [ID:${p.id}] [${p.category || "Chưa phân loại"}] ${p.name}: ${p.price.toLocaleString()}đ`).join("\n");
    contextBlocks.push(`[DANH_MỤC_SẢN_PHẨM]\n${productList}`);

    // Intent Detection Heuristic
    const phoneMatch = userMessage.match(/0\d{9,10}/);
    const phone = phoneMatch ? phoneMatch[0] : currentCustomer?.phone;
    
    // CASE 1: Đặt hàng mới — gom SP khớp, giảm nhầm nhiều vé/SP cùng từ khóa (ưu tiên khớp tên đầy đủ / tên dài nhất).
    type MatchedProduct = { p: (typeof products)[0]; via: "full" | "keywords" };
    const matchedProducts: MatchedProduct[] = [];
    for (const p of products) {
      const pNameNorm = removeAccents(p.name);
      const pNameClean = pNameNorm.replace(/\(.*\)/g, "").trim();
      const keywords = pNameClean.split(/\s+/).filter(w => w.length >= 2 && !["ve", "cap", "treo", "hills", "suat", "world", "sun"].includes(w));

      const isFull =
        pNameNorm.includes(normalizedMsg) ||
        normalizedMsg.includes(pNameNorm) ||
        (pNameClean.length >= 12 && normalizedMsg.includes(pNameClean));
      const isKw = keywords.length > 0 && keywords.every(kw => normalizedMsg.includes(kw));
      const isMatch = isFull || isKw;

      if (process.env.VCLAW_AI_ENRICH_DEBUG === "1") {
        console.log(`[AI-ENRICH] Product: ${p.name}, full:${isFull} kw:${isKw}`);
      }

      if (isMatch) {
        matchedProducts.push({ p, via: isFull ? "full" : "keywords" });
      }
    }

    let picks = matchedProducts;
    const fullPicks = matchedProducts.filter((m) => m.via === "full");
    if (fullPicks.length >= 1) {
      picks = fullPicks;
    } else if (picks.length > 1) {
      picks = [...picks].sort(
        (a, b) => removeAccents(b.p.name).length - removeAccents(a.p.name).length
      );
      picks = [picks[0]];
    }

    const detectedItems: { name: string; qty: number; price: number }[] = [];
    let totalAmount = 0;
    for (const { p } of picks) {
      const qty = extractQtyForProduct(userMessage, p.name);
      detectedItems.push({ name: p.name, qty, price: p.price });
      totalAmount += p.price * qty;
    }

    if (detectedItems.length > 0 && phone && (normalizedMsg.includes("dia chi") || source === "zalo" || normalizedMsg.includes("ship"))) {
      const addrMatch = userMessage.match(/(?:dia chi|tai|ship den|o)[:\s]+([^,.\n]+)/i);
      const address = addrMatch ? addrMatch[1].trim() : "Giao tận nơi";

      let recentCheckCustomerId = currentCustomer?.id as string | undefined;
      if (!recentCheckCustomerId && phone) {
        const byPhone = await prisma.customer.findFirst({ where: { phone } });
        recentCheckCustomerId = byPhone?.id;
      }

      const recentOrder =
        recentCheckCustomerId != null
          ? await prisma.order.findFirst({
              where: {
                customerId: recentCheckCustomerId,
                amount: totalAmount,
                createdAt: { gte: new Date(Date.now() - 60 * 1000) },
              },
            })
          : null;

      if (!recentOrder) {
        const orderRes = await executeVclawAgentTool("vclaw.order.create", {
          customerName: currentCustomer?.name || "Khách Zalo",
          phone,
          amount: totalAmount,
          items: detectedItems,
          shippingNote: address,
          channel: source === "zalo" ? "Zalo" : "Admin"
        });

        if (orderRes.ok && orderRes.result) {
          const orderInfo = orderRes.result as any;
          actionResults.push(ENRICHMENT_ACTION_ORDER_CREATED(orderInfo.orderNumber, totalAmount));
          
          if (orderInfo.qrUrl) {
            actionResults.push(ENRICHMENT_ACTION_QR_GENERATED(orderInfo.qrUrl));
          } else {
            // Thử sinh thủ công nếu order.create chưa có (đề phòng)
            const qrRes = await executeVclawAgentTool("vclaw.payment.generate_qr", {
              amount: totalAmount,
              phone: phone,
              orderId: orderInfo.orderId
            });
            if (qrRes.ok && qrRes.result) {
              const qrInfo = qrRes.result as any;
              actionResults.push(ENRICHMENT_ACTION_QR_GENERATED(qrInfo.qrUrl));
            }
          }
        } else {
          actionResults.push(ENRICHMENT_ACTION_ORDER_FAILED(String(orderRes.error)));
        }
      } else {
        actionResults.push(ENRICHMENT_ACTION_DUPLICATE_ORDER(recentOrder.orderNumber));
      }

    }

    // CASE 2: Xác nhận thanh toán
    const paymentKeywords = ["da thanh toan", "da ck", "da chuyen khoan", "da gui tien"];
    if (paymentKeywords.some(kw => normalizedMsg.includes(kw)) && currentCustomer) {
      const pendingOrder = await prisma.order.findFirst({
        where: { customerId: currentCustomer.id, status: "PENDING" },
        orderBy: { createdAt: "desc" }
      });

      if (pendingOrder) {
        // Tạm thời xác nhận luôn đơn này (Hoặc đánh dấu là PROCESSING)
        await prisma.order.update({
          where: { id: pendingOrder.id },
          data: { status: "PROCESSING" }
        });
        actionResults.push(ENRICHMENT_ACTION_PAYMENT_REQUESTED(pendingOrder.orderNumber));
        actionResults.push(ENRICHMENT_ACTION_PAYMENT_PROCESSING(pendingOrder.orderNumber, pendingOrder.amount));
      }

    }

    const isSticker = userMessage.trim().startsWith('{') && userMessage.includes('"catId":') && userMessage.includes('"id":');
    if (isSticker) {
      contextBlocks.push(ENRICHMENT_STICKER_PROMPT);
    }

    if (actionResults.length > 0) {
      contextBlocks.push(`[HÀNH_ĐỘNG_HỆ_THỐNG_VỪA_THỰC_HIỆN]
${actionResults.join("\n")}
${ENRICHMENT_SYSTEM_ACTION_LORE}`);
    }

    const hasSystemVietQr = actionResults.some((line) => line.includes("img.vietqr.io"));
    if (source === "zalo" && !hasSystemVietQr) {
      contextBlocks.push(ENRICHMENT_NO_QR_WARNING);
    }

    const securityRules = source === "zalo"
      ? `[BẢO_MẬT] Tuyệt đối KHÔNG tiết lộ thông tin khách khác, doanh thu nội bộ.`
      : `[ADMIN] Bạn đang nói chuyện với Admin.`;

    if (source === "zalo") {
      const shopWeb = settings?.website?.trim() || "";
      contextBlocks.push(ENRICHMENT_VIETQR_RULES(shopWeb));
    }

    contextBlocks.push(`
${ENRICHMENT_GENERAL_BEHAVIOR}
${securityRules}`);


    const finalContext = contextBlocks.join("\n\n");
    console.log("[AI-ENRICH] FINAL CONTEXT LENGTH:", finalContext.length);
    
    return finalContext;
  } catch (error) {
    console.error("Lỗi getEnrichedContext:", error);
    return "";
  }
}
