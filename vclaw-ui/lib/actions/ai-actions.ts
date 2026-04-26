"use server";

import { prisma } from "@/lib/db";

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
 * Truy xuất dữ liệu trực tiếp từ Database (Prisma) để nạp vào ngữ cảnh AI.
 * Hỗ trợ nhận diện khách hàng qua externalId (Zalo ID) để cá nhân hóa.
 */
export async function enrichChatContext(
  pathname: string, 
  userMessage: string, 
  externalId?: string
): Promise<string> {
  const normalizedMsg = removeAccents(userMessage);
  let contextBlocks: string[] = [];

  try {
    // 1. Truy xuất thông tin Cửa hàng
    const settings = await prisma.shopSettings.findFirst();
    if (settings) {
      contextBlocks.push(`[THÔNG_TIN_CỬA_HÀNG]
- Tên Shop: ${settings.shopName || "VClaw Shop"}
- Tài khoản: ${settings.bankName || "N/A"} - ${settings.accountNumber || "N/A"} (${settings.accountHolder || "N/A"})`);
    }

    // 2. Nhận diện và nạp thông tin Khách hàng (Personalization)
    if (externalId) {
      const customer = await prisma.customer.findFirst({
        where: { phone: externalId }, // Giả định Zalo ID được lưu vào phone hoặc field tương đương
        include: {
          orders: {
            orderBy: { createdAt: "desc" },
            take: 3
          }
        }
      });

      if (customer) {
        const orderHistory = customer.orders.length > 0
          ? customer.orders.map(o => `- Đơn #${o.orderNumber}: ${o.amount.toLocaleString()}đ (${o.status})`).join("\n")
          : "Chưa có đơn hàng nào.";
        
        contextBlocks.push(`[THÔNG_TIN_KHÁCH_HÀNG]
- Tên: ${customer.name}
- Lịch sử mua hàng gần đây:
${orderHistory}
- Ghi chú: Hãy chào hỏi thân mật và gợi ý dựa trên sở thích cũ nếu có.`);
      }
    }

    // 3. Truy xuất Danh mục Sản phẩm (Catalog)
    const productKeywords = ["san pham", "gia", "ban gi", "co gi", "list", "danh sach", "hang hoa", "mon", "do", "menu", "coffee"];
    if (productKeywords.some(kw => normalizedMsg.includes(kw))) {
      const products = await prisma.product.findMany({
        where: { status: "ACTIVE" },
        select: { name: true, price: true, category: true, description: true },
        take: 30
      });

      if (products.length > 0) {
        const productList = products.map(p => `- ${p.name}: ${p.price.toLocaleString()}đ [${p.category || "Chưa phân loại"}]`).join("\n");
        contextBlocks.push(`[DANH_MỤC_SẢN_PHẨM_THỰC_TẾ]\n${productList}`);
      }
    }

    // 4. Quy tắc nghiệp vụ
    contextBlocks.push(`[QUY_TẮC_HÀNH_VI]
- Bạn là chuyên gia chốt đơn của ${settings?.shopName || "VClaw"}.
- KHÔNG giải thích về dữ liệu kỹ thuật.
- Nếu khách muốn mua, hãy hỏi thông tin và đề nghị lên đơn ngay.`);

  } catch (error) {
    console.error("Lỗi Enrich Context:", error);
  }

  return contextBlocks.join("\n\n");
}
