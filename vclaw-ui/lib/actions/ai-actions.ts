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
  externalId?: string,
  source: 'admin' | 'zalo' = 'admin'
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

    // 2. Nhận diện và nạp thông tin Khách hàng (Chỉ nạp nếu khớp ID khi từ Zalo)
    if (externalId) {
      const customer = await prisma.customer.findFirst({
        where: { phone: externalId }, 
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
        
        contextBlocks.push(`[THÔNG_TIN_KHÁCH_HÀNG_ĐANG_CHAT]
- Tên: ${customer.name}
- Lịch sử mua hàng:
${orderHistory}`);
      }
    }

    // 3. Truy xuất Danh mục Sản phẩm (Catalog) - Tối ưu hiển thị
    const productKeywords = ["san pham", "gia", "ban gi", "co gi", "list", "danh sach", "hang hoa", "mon", "do", "menu", "coffee"];
    if (productKeywords.some(kw => normalizedMsg.includes(kw))) {
      const products = await prisma.product.findMany({
        where: { status: "ACTIVE" },
        select: { name: true, price: true, imageUrl: true },
        take: 4
      });

      if (products.length > 0) {
        const productList = products.map(p => 
          `- ${p.name}: ${p.price.toLocaleString()}đ\n${p.imageUrl || ""}`
        ).join("\n\n");
        contextBlocks.push(`[DANH_SÁCH_SẢN_PHẨM]\n${productList}`);
      }
    }

    // 4. Hệ thống Quy tắc BẮT BUỘC
    const securityRules = source === 'zalo' 
      ? `[BẢO_MẬT] Không tiết lộ khách khác, doanh thu. Chỉ dùng [SẢN_PHẨM] để tư vấn.`
      : `[QUY_TẮC] Bạn là Admin, có quyền xem mọi dữ liệu.`;

    contextBlocks.push(`
[VAI_TRÒ] Bạn là Nhân viên bán hàng thực tế của ${settings?.shopName || "VClaw"}. KHÔNG nói mình là AI.
${securityRules}

[PHONG_CÁCH]
- CỰC KỲ NGẮN GỌN. KHÔNG GIẢI THÍCH.
- KHÔNG LẶP LẠI nội dung/câu chào.
- Chỉ liệt kê sản phẩm MỘT LẦN duy nhất.

[LƯU_ĐƠN_HÀNG] (QUAN TRỌNG)
- Khi khách chốt mua, BẮT BUỘC gọi tool "vclaw.order.create" để lưu dữ liệu.
- Sau đó, tạo mã QR bằng tool "vclaw.payment.generate_qr" và gửi link ảnh QR ở một DÒNG RIÊNG BIỆT ở cuối tin nhắn để Zalo hiển thị ảnh preview to rõ.

[MỤC_TIÊU] Tư vấn bán hàng, chốt đơn và LƯU DỮ LIỆU. Hết.`);

  } catch (error) {
    console.error("Lỗi Enrich Context:", error);
  }

  return contextBlocks.join("\n\n");
}
