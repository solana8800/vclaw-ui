"use server";

import { prisma } from "@/lib/prisma";
import { revalidateAdminPaths } from "@/lib/revalidate-admin";
import type { Product } from "@prisma/client";

export type ProductInput = {
  id?: string;
  name: string;
  price: number;
  description?: string;
  imageUrl?: string;
  category?: string;
  status?: "ACTIVE" | "ARCHIVED";
};

export async function getProducts() {
  try {
    return await prisma.product.findMany({
      orderBy: { updatedAt: "desc" },
    });
  } catch (error) {
    console.error("Lỗi khi lấy danh sách sản phẩm:", error);
    return [];
  }
}

export async function saveProduct(data: ProductInput) {
  try {
    if (data.id) {
      const product = await prisma.product.update({
        where: { id: data.id },
        data: {
          name: data.name,
          price: data.price,
          description: data.description,
          imageUrl: data.imageUrl || null,
          category: data.category || null,
          status: data.status ?? "ACTIVE",
        },
      });
      revalidateAdminPaths();
      return { success: true, product };
    }

    const product = await prisma.product.create({
      data: {
        name: data.name,
        price: data.price,
        description: data.description,
        imageUrl: data.imageUrl,
        category: data.category,
        status: "ACTIVE",
      },
    });

    revalidateAdminPaths();
    return { success: true, product };
  } catch (error) {
    console.error("Lỗi khi lưu sản phẩm:", error);
    return { success: false, error: "Không thể lưu sản phẩm." };
  }
}

export async function deleteProduct(id: string) {
  try {
    await prisma.product.delete({ where: { id } });
    revalidateAdminPaths();
    return { success: true };
  } catch (error) {
    console.error("Lỗi khi xóa sản phẩm:", error);
    return { success: false, error: "Không thể xóa sản phẩm." };
  }
}

export async function setProductArchived(id: string, archived: boolean) {
  try {
    const product = await prisma.product.update({
      where: { id },
      data: { status: archived ? "ARCHIVED" : "ACTIVE" },
    });
    revalidateAdminPaths();
    return { success: true, product };
  } catch (error) {
    console.error("Lỗi khi cập nhật trạng thái sản phẩm:", error);
    return { success: false, error: "Không thể cập nhật." };
  }
}

export async function extractProductFromImage(imageUrl: string) {
  await new Promise((resolve) => setTimeout(resolve, 2500));
  return {
    name: "Cà phê Muối Chú Long",
    price: 35000,
    description: "Cà phê muối đặc sản, vị đậm đà, kem béo ngậy. Đóng chai 250ml.",
    category: "Đồ uống",
    confidence: 0.92,
  };
}

export async function generateMarketingContent(productName: string, description: string) {
  await new Promise((resolve) => setTimeout(resolve, 3000));

  const prompts = [
    `🌟 **SIÊU PHẨM ${productName.toUpperCase()} ĐÃ CẬP BẾN!** 🌟\n\nBạn đang tìm kiếm sự khác biệt? ${description}\n\n✅ Chất lượng đỉnh cao\n✅ Vị ngon khó cưỡng\n✅ Giá cực ưu đãi chỉ có tại VClaw!\n\n👉 Inbox ngay để nhận tư vấn và đặt hàng sớm nhất! #VClaw #KinhDoanhOnline #SmartSelling`,
    `🔥 **CHÁY HÀNG VỚI ${productName.toUpperCase()}** 🔥\n\nĐừng bỏ lỡ cơ hội trải nghiệm dòng sản phẩm đang "làm mưa làm gió" trên thị trường. ${description}\n\n💎 Cam kết chính hãng\n🚚 Giao hàng hỏa tốc\n💰 Giá hạt rẻ: Chỉ dành cho 10 khách hàng đầu tiên!\n\nComment 'QUAN TÂM' để nhận mã giảm giá ngay! 💥`,
    `🍃 **GÓC DÀNH CHO TÍN ĐỒ YÊU CÀ PHÊ** 🍃\n\n${productName} - Hương vị của sự tận hưởng. ${description}\n\nTại VClaw, chúng tôi mang đến không chỉ là sản phẩm, mà còn là trải nghiệm tuyệt vời nhất cho bạn. 💖\n\n📍 Địa chỉ: [Địa chỉ của bạn]\n📞 Hotline: [Số điện thoại]\n\n#CoffeeLovers #Sale #MarketingAI`,
  ];

  return prompts[Math.floor(Math.random() * prompts.length)];
}
