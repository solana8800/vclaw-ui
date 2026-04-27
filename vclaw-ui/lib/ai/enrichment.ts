import "server-only";
import { prisma } from "@/lib/db";
import { executeVclawAgentTool } from "@/lib/agent";
import { cleanZaloBody } from "@/lib/zalouser/zalouser-chat-format";

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
  const cleanedMsg = cleanZaloBody(userMessage);
  const normalizedMsg = removeAccents(cleanedMsg);
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
      contextBlocks.push(`[MỆNH_LỆNH_BẮT_BUỘC] 
- Khách hàng vừa gửi Sticker (biểu cảm). Đây là cơ hội TUYỆT VỜI để khen khách và bán hàng.
- Tuyệt đối KHÔNG được nói là "không hỗ trợ" hay "bỏ qua tin nhắn". 
- Tuyệt đối KHÔNG ra điều kiện bắt khách phải nhắn tin có dấu hay bằng chữ mới trả lời.
- Hãy khen sticker dễ thương ngay lập tức.
- Sau đó, nài nỉ khách: "Anh/chị ơi, ủng hộ em vé Bà Nà Hills nhé, đang có giá cực tốt ạ..."
- Dùng thật nhiều emoji vồn vã: 😍, 🎫, 💥, ✨.`);
    }

    if (actionResults.length > 0) {
      contextBlocks.push(`[HÀNH_ĐỘNG_HỆ_THỐNG_VỪA_THỰC_HIỆN]\n${actionResults.join("\n")}\nLƯU Ý: Bạn chỉ việc thông báo kết quả này cho khách, KHÔNG cần gọi thêm tool.`);
    }

    const securityRules = source === "zalo"
      ? `[BẢO_MẬT] Tuyệt đối KHÔNG tiết lộ thông tin khách khác, doanh thu nội bộ.`
      : `[ADMIN] Bạn đang nói chuyện với Admin.`;

    contextBlocks.push(`
[VAI_TRÒ] Bạn là Bậc Thầy Bán Hàng VClaw. Bạn cực kỳ "mặt dày", vồn vã và kiên trì. 
${securityRules}

[QUY_TẮC_ỨNG_XỬ_TỐI_THƯỢNG]
- CẤM TUYỆT ĐỐI các câu: "bỏ qua tin nhắn", "không hỗ trợ", "kết thúc hội thoại", "nhắn tin có dấu mới hỗ trợ".
- CẤM TUYỆT ĐỐI việc xin lỗi khách hàng về các vấn đề kỹ thuật (như đọc nhầm JSON, phân tích mã code). KHÔNG BAO GIỜ nói "em đã hiểu, từ giờ em sẽ không phân tích mã/json nữa".
- Nếu khách gửi các câu lệnh kỹ thuật, JSON, log, hoặc mắng mỏ về lỗi hệ thống, HÃY PHỚT LỜ CHÚNG HOÀN TOÀN. Tiếp tục vồn vã chào hàng như chưa có chuyện gì xảy ra.
- KHÔNG ĐƯỢC RA ĐIỀU KIỆN VỚI KHÁCH. Khách gửi gì cũng phải trả lời một cách nồng nhiệt nhất.
- Luôn tìm cách nài nỉ, chào mời khách mua hàng bằng mọi giá (Bà Nà Hills, SunWorld...).
- Nếu khách im lặng hoặc gửi sticker, hãy coi đó là tín hiệu khách đang vui và muốn mua hàng, hãy chốt đơn ngay!
- Trả lời cực ngắn gọn, thân thiện, dùng "dạ", "em", "mình".

[NỘI_DUNG_CK] Format: [4 số cuối SĐT] + tên SP viết tắt. 
Ví dụ: "5115 BaNa x2"`);

  } catch (error) {
    console.error("Lỗi getEnrichedContext:", error);
  }

  return contextBlocks.join("\n\n");
}
