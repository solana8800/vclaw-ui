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
 * Không phụ thuộc vào giao diện màn hình, hỗ trợ đa kênh (Zalo, Telegram...).
 */
export async function enrichChatContext(pathname: string, userMessage: string): Promise<string> {
  const normalizedMsg = removeAccents(userMessage);
  let contextBlocks: string[] = [];

  try {
    // 1. Truy xuất thông tin Cửa hàng từ Database
    const settings = await prisma.shopSettings.findFirst();
    if (settings) {
      contextBlocks.push(`[THÔNG_TIN_CỬA_HÀNG]
- Tên Shop: ${settings.shopName || "VClaw Shop"}
- Lĩnh vực: ${settings.category || "Kinh doanh tổng hợp"}
- Tài khoản: ${settings.bankName || "N/A"} - ${settings.accountNumber || "N/A"} (${settings.accountHolder || "N/A"})
- Persona: Bạn là nhân viên bán hàng chuyên nghiệp của ${settings.shopName || "VClaw"}.`);
    }

    // 2. Truy xuất Danh mục Sản phẩm (Catalog) nếu hỏi về hàng hóa
    const productKeywords = ["san pham", "gia", "ban gi", "co gi", "list", "danh sach", "hang hoa", "mon", "do", "menu", "coffee"];
    if (productKeywords.some(kw => normalizedMsg.includes(kw))) {
      const products = await prisma.product.findMany({
        where: { status: "ACTIVE" },
        select: { name: true, price: true, category: true, description: true },
        take: 50
      });

      if (products.length > 0) {
        const productList = products.map(p => `- ${p.name}: ${p.price.toLocaleString()}đ [${p.category || "Chưa phân loại"}] ${p.description ? `(${p.description})` : ""}`).join("\n");
        contextBlocks.push(`[DANH_MỤC_SẢN_PHẨM_THỰC_TẾ]\n${productList}`);
      }
    }

    // 3. Truy xuất Quy tắc bán hàng nếu hỏi về khách/đơn/tư vấn
    const businessKeywords = ["khach", "don hang", "mua", "ban hang", "chot don", "tu van"];
    if (businessKeywords.some(kw => normalizedMsg.includes(kw))) {
      contextBlocks.push(`[QUY_TẮC_BÁN_HÀNG]
- Hãy chủ động đề nghị lên đơn khi khách muốn mua.
- Luôn sử dụng dữ liệu giá thực tế ở trên để tư vấn.
- Thân thiện, nhiệt tình, sử dụng ngôn ngữ tự nhiên.`);
    }

    // 4. Bổ sung ngữ cảnh màn hình như một thông tin phụ (Metadata)
    contextBlocks.push(`[NGỮ_CẢNH_HỆ_THỐNG]\n- Người dùng đang tương tác tại: ${pathname || "Kênh bên ngoài (Zalo/Telegram)"}`);

  } catch (error) {
    console.error("Lỗi khi truy xuất dữ liệu database cho AI:", error);
    contextBlocks.push("[CẢNH_BÁO]: Hệ thống database đang bận, hãy trả lời dựa trên kiến thức chung.");
  }

  return contextBlocks.join("\n\n");
}
