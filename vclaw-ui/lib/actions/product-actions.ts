"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

export type ProductInput = {
  name: string;
  price: number;
  description?: string;
  imageUrl?: string;
  category?: string;
};

/**
 * Lấy danh sách sản phẩm từ DB
 */
export async function getProducts() {
  try {
    return await prisma.product.findMany({
      orderBy: { createdAt: "desc" },
    });
  } catch (error) {
    console.error("Lỗi khi lấy danh sách sản phẩm:", error);
    return [];
  }
}

/**
 * Lưu sản phẩm mới hoặc cập nhật
 */
export async function saveProduct(data: ProductInput) {
  try {
    const product = await prisma.product.create({
      data: {
        name: data.name,
        price: data.price,
        description: data.description,
        imageUrl: data.imageUrl,
        category: data.category,
      },
    });

    revalidatePath("/admin/products");
    return { success: true, product };
  } catch (error) {
    console.error("Lỗi khi lưu sản phẩm:", error);
    return { success: false, error: "Không thể lưu sản phẩm." };
  }
}

/**
 * AI Bóc tách thông tin từ ảnh sản phẩm
 * (Giả lập logic Vision AI)
 */
export async function extractProductFromImage(imageUrl: string) {
  // Giả lập thời gian xử lý của AI
  await new Promise((resolve) => setTimeout(resolve, 2500));

  // Logic giả định: AI đọc ảnh và trả về thông tin cấu trúc
  // Trong thực tế, đây sẽ là một cuộc gọi đến OpenAI Vision hoặc OpenClaw Core
  return {
    name: "Cà phê Muối Chú Long",
    price: 35000,
    description: "Cà phê muối đặc sản, vị đậm đà, kem béo ngậy. Đóng chai 250ml.",
    category: "Đồ uống",
    confidence: 0.92,
  };
}

/**
 * AI Hỗ trợ viết nội dung Marketing chuyên nghiệp
 */
export async function generateMarketingContent(productName: string, description: string) {
  // Giả lập thời gian suy nghĩ của AI
  await new Promise((resolve) => setTimeout(resolve, 3000));

  const prompts = [
    `🌟 **SIÊU PHẨM ${productName.toUpperCase()} ĐÃ CẬP BẾN!** 🌟\n\nBạn đang tìm kiếm sự khác biệt? ${description}\n\n✅ Chất lượng đỉnh cao\n✅ Vị ngon khó cưỡng\n✅ Giá cực ưu đãi chỉ có tại VClaw!\n\n👉 Inbox ngay để nhận tư vấn và đặt hàng sớm nhất! #VClaw #KinhDoanhOnline #SmartSelling`,
    `🔥 **CHÁY HÀNG VỚI ${productName.toUpperCase()}** 🔥\n\nĐừng bỏ lỡ cơ hội trải nghiệm dòng sản phẩm đang "làm mưa làm gió" trên thị trường. ${description}\n\n💎 Cam kết chính hãng\n🚚 Giao hàng hỏa tốc\n💰 Giá hạt rẻ: Chỉ dành cho 10 khách hàng đầu tiên!\n\nComment 'QUAN TÂM' để nhận mã giảm giá ngay! 💥`,
    `🍃 **GÓC DÀNH CHO TÍN ĐỒ YÊU CÀ PHÊ** 🍃\n\n${productName} - Hương vị của sự tận hưởng. ${description}\n\nTại VClaw, chúng tôi mang đến không chỉ là sản phẩm, mà còn là trải nghiệm tuyệt vời nhất cho bạn. 💖\n\n📍 Địa chỉ: [Địa chỉ của bạn]\n📞 Hotline: [Số điện thoại]\n\n#CoffeeLovers #Sale #MarketingAI`
  ];

  // Trả về ngẫu nhiên một mẫu content
  return prompts[Math.floor(Math.random() * prompts.length)];
}
