import "server-only";
import { prisma } from "@/lib/db";
import { executeVclawAgentTool } from "@/lib/agent";

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
  const normalizedMsg = removeAccents(userMessage);
  const contextBlocks: string[] = [];
  const actionResults: string[] = [];

  try {
    // 1. Thông tin Cửa hàng
    const settings = await prisma.shopSettings.findFirst();
    if (settings) {
      contextBlocks.push(`[THÔNG_TIN_CỬA_HÀNG]
- Tên: ${settings.shopName || "VClaw Shop"}
- Ngân hàng: ${settings.bankName || "N/A"} | STK: ${settings.accountNumber || "N/A"} | Chủ TK: ${settings.accountHolder || "N/A"}`);
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
    const productList = products.map(p => `- [ID:${p.id}] ${p.name}: ${p.price.toLocaleString()}đ`).join("\n");
    contextBlocks.push(`[DANH_MỤC_SẢN_PHẨM]\n${productList}`);

    // Intent Detection Heuristic
    const phoneMatch = userMessage.match(/0\d{9,10}/);
    const phone = phoneMatch ? phoneMatch[0] : currentCustomer?.phone;
    
    // CASE 1: Đặt hàng mới
    const detectedItems: any[] = [];
    let totalAmount = 0;
    for (const p of products) {
      const pNameNorm = removeAccents(p.name);
      // Loại bỏ phần trong ngoặc đơn (thường là thương hiệu phụ) để lấy từ khóa chính
      const pNameClean = pNameNorm.replace(/\(.*\)/g, "").trim();
      const keywords = pNameClean.split(/\s+/).filter(w => w.length >= 2 && !["ve", "cap", "treo", "hills", "suat", "world", "sun"].includes(w));
      
      const isMatch = pNameNorm.includes(normalizedMsg) || 
                      normalizedMsg.includes(pNameNorm) ||
                      (keywords.length > 0 && keywords.every(kw => normalizedMsg.includes(kw)));

      console.log(`[AI-ENRICH] Product: ${p.name}, Keywords:`, keywords, `Match: ${isMatch}`);

      if (isMatch) {
        const qtyMatch = userMessage.match(new RegExp(`(\\d+)\\s*(?:ve|suat|cai)?\\s*${p.name.split(' ')[0]}|${p.name.split(' ')[0]}\\s*(\\d+)`, "i"));
        const qty = qtyMatch ? parseInt(qtyMatch[1] || qtyMatch[2]) : 1;
        detectedItems.push({ name: p.name, qty, price: p.price });
        totalAmount += (p.price * qty);
      }
    }

    if (detectedItems.length > 0 && phone && (normalizedMsg.includes("dia chi") || source === "zalo" || normalizedMsg.includes("ship"))) {
      const addrMatch = userMessage.match(/(?:dia chi|tai|ship den|o)[:\s]+([^,.\n]+)/i);
      const address = addrMatch ? addrMatch[1].trim() : "Giao tận nơi";

      const recentOrder = await prisma.order.findFirst({
        where: {
          customerId: currentCustomer?.id,
          amount: totalAmount,
          createdAt: { gte: new Date(Date.now() - 60 * 1000) }
        }
      });

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
          actionResults.push(`THÀNH CÔNG: Đã tạo đơn hàng #${orderInfo.orderNumber} tổng ${totalAmount.toLocaleString()}đ.`);
          
          const qrRes = await executeVclawAgentTool("vclaw.payment.generate_qr", {
            amount: totalAmount,
            phone: phone
          });
          if (qrRes.ok && qrRes.result) {
            const qrInfo = qrRes.result as any;
            actionResults.push(`THÀNH CÔNG: Đã phát sinh mã QR thanh toán: ${qrInfo.qrUrl}`);
          }
        } else {
          actionResults.push(`THẤT BẠI khi tạo đơn: ${orderRes.error}`);
        }
      } else {
        actionResults.push(`THÔNG BÁO: Đã có đơn hàng tương tự vừa được tạo (#${recentOrder.orderNumber}).`);
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
        actionResults.push(`THÔNG BÁO: Đã nhận được yêu cầu xác nhận thanh toán cho đơn hàng #${pendingOrder.orderNumber}.`);
        actionResults.push(`CHI TIẾT: Đơn hàng #${pendingOrder.orderNumber} (giá trị ${pendingOrder.amount.toLocaleString()}đ) đã được chuyển sang trạng thái ĐANG XỬ LÝ.`);
      }
    }

    const isSticker = userMessage.trim().startsWith('{') && userMessage.includes('"catId":') && userMessage.includes('"id":');
    if (isSticker) {
      contextBlocks.push(`[LƯU_Ý_ĐẶC_BIỆT] 
- Khách hàng vừa gửi một Sticker Zalo vui nhộn (mã JSON). 
- Tuyệt đối KHÔNG hỏi khách về mã này.
- Hãy khen sticker dễ thương/vui nhộn.
- Chủ động giới thiệu sản phẩm HOT (như Vé Cáp Treo Bà Nà Hills - 900k, hoặc Sun World) và mời khách đặt vé ngay.
- Sử dụng nhiều emoji hài hước (😊, 🎫, 🔥) để tạo không khí vui vẻ.`);
    }

    if (actionResults.length > 0) {
      contextBlocks.push(`[HÀNH_ĐỘNG_HỆ_THỐNG_VỪA_THỰC_HIỆN]\n${actionResults.join("\n")}\nLƯU Ý: Bạn chỉ việc thông báo kết quả này cho khách, KHÔNG cần gọi thêm tool.`);
    }

    const securityRules = source === "zalo"
      ? `[BẢO_MẬT] Tuyệt đối KHÔNG tiết lộ thông tin khách khác, doanh thu nội bộ.`
      : `[ADMIN] Bạn đang nói chuyện với Admin.`;

    contextBlocks.push(`
[VAI_TRÒ] Bạn là Nhân viên bán hàng của ${settings?.shopName || "VClaw"}. 
${securityRules}

[NHIỆM_VỤ] 
- Nếu thấy [HÀNH_ĐỘNG_HỆ_THỐNG_VỪA_THỰC_HIỆN], hãy chúc mừng và gửi thông tin đơn hàng + link QR cho khách.
- Nếu khách gửi Sticker (mã JSON), hãy khen sticker và mời khách mua sản phẩm HOT ngay (Bà Nà Hills, SunWorld...). TUYỆT ĐỐI KHÔNG hỏi mã JSON là gì.
- Đặc biệt: Nếu khách báo "đã thanh toán" và hệ thống đã xác nhận đơn hàng sang PROCESSING, hãy trả lời: "Dạ em đã nhận được thanh toán của mình rồi ạ! Đơn hàng [Mã đơn] đã xác nhận. Em sẽ gửi mã vé/xử lý ngay ạ."
- Nếu khách chưa cung cấp đủ SĐT hoặc tên SP, hãy khéo léo hỏi thêm.
- Trả lời cực ngắn gọn (tối đa 3 dòng). Dùng "dạ", "mình" thân thiện.

[NỘI_DUNG_CK] Format: [4 số cuối SĐT] + tên SP viết tắt. 
Ví dụ: "5115 BaNa x2"`);

  } catch (error) {
    console.error("Lỗi getEnrichedContext:", error);
  }

  return contextBlocks.join("\n\n");
}
