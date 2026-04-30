"use server";

import { prisma } from "@/lib/db";
import { revalidateAdminPaths } from "@/lib/admin/revalidate";
import { gateway } from "@/lib/gateway/server";

export type ProductInput = {
  id?: string;
  productCode?: string;
  name: string;
  price: number;
  description?: string;
  imageUrl?: string;
  images?: string[]; // Thêm danh sách ảnh
  category?: string;
  metadata?: string;
  status?: "ACTIVE" | "ARCHIVED";
};

async function askAiAgent(prompt: string) {
  try {
    const res = await gateway.post<{ choices: { message: { content: string } }[] }>(
      "/v1/chat/completions",
      { 
        model: "openclaw",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
      }
    );

    const content = res.choices?.[0]?.message?.content?.trim();
    if (!content) {
      throw new Error("AI Agent phản hồi không hợp lệ hoặc trống.");
    }

    return content;
  } catch (error) {
    console.error("Lỗi khi gọi AI Agent:", error);
    throw error;
  }
}

function parseAiJson<T>(text: string): T | null {
  try {
    const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/\{[\s\S]*\}/);
    const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : text;
    return JSON.parse(jsonStr.trim()) as T;
  } catch (e) {
    console.warn("Không thể parse JSON từ AI, trả về text thô hoặc null.", e);
    return null;
  }
}

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
    // 1. Chuẩn hóa và Validate Product Code
    const cleanCode = (data.productCode || "").replace(/\s+/g, "").toUpperCase();
    if (!cleanCode) {
      return { success: false, error: "Mã sản phẩm (Product Code) là bắt buộc và không được chứa khoảng trắng." };
    }

    // 2. Kiểm tra trùng lặp mã sản phẩm
    const conflict = await prisma.product.findFirst({
      where: {
        productCode: cleanCode,
        NOT: data.id ? { id: data.id } : undefined,
      }
    });
    if (conflict) {
      return { success: false, error: `Mã sản phẩm "${cleanCode}" đã tồn tại. Vui lòng chọn mã khác.` };
    }

    const imagesJson = data.images ? JSON.stringify(data.images) : null;

    if (data.id) {
      const product = await prisma.product.update({
        where: { id: data.id },
        data: {
          productCode: cleanCode,
          name: data.name,
          price: data.price,
          description: data.description,
          imageUrl: data.imageUrl || (data.images?.[0] ?? null),
          images: imagesJson,
          category: data.category || null,
          metadata: data.metadata || null,
          status: data.status ?? "ACTIVE",
        } as any,
      });
      revalidateAdminPaths();
      return { success: true, product, message: "Cập nhật sản phẩm thành công!" };
    }

    const product = await prisma.product.create({
      data: {
        productCode: cleanCode,
        name: data.name,
        price: data.price,
        description: data.description,
        imageUrl: data.imageUrl || (data.images?.[0] ?? null),
        images: imagesJson,
        category: data.category,
        metadata: data.metadata,
        status: "ACTIVE",
      } as any,
    });

    revalidateAdminPaths();
    return { success: true, product, message: "Thêm sản phẩm mới thành công!" };
  } catch (error) {
    console.error("Lỗi khi lưu sản phẩm:", error);
    return { success: false, error: "Không thể lưu sản phẩm. Vui lòng thử lại." };
  }
}

export async function checkProductImageExists(imageUrl: string, excludeId?: string) {
  try {
    const existing = await prisma.product.findFirst({
      where: {
        imageUrl,
        NOT: excludeId ? { id: excludeId } : undefined,
      },
    });
    return { exists: !!existing, product: existing };
  } catch (error) {
    return { exists: false, error };
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

export async function extractProductFromImage(imageUrls: string | string[]) {
  try {
    const urls = Array.isArray(imageUrls) ? imageUrls.join(", ") : imageUrls;
    const prompt = `Hãy đóng vai một chuyên gia kiểm kê sản phẩm. Hãy phân tích (các) hình ảnh tại URL sau và trích xuất thông tin sản phẩm: ${urls}. 
Nếu có nhiều ảnh, hãy tổng hợp thông tin từ tất cả ảnh để có kết quả chính xác nhất.
Trả về DUY NHẤT một đối tượng JSON (không thêm văn bản khác) theo cấu trúc: 
{ "name": "tên sản phẩm", "price": số_tiền, "description": "mô tả ngắn", "category": "danh mục" }. 
Lưu ý: Nếu không thấy giá, hãy để là 0. Tên và mô tả phải bằng tiếng Việt tự nhiên.`;

    const response = await askAiAgent(prompt);
    const extracted = parseAiJson<{ name: string; price: number; description: string; category: string }>(response);

    if (!extracted) {
      return {
        name: "Sản phẩm mới (AI không nhận dạng được)",
        price: 0,
        description: response.slice(0, 200),
        category: "Chưa phân loại",
        confidence: 0.5,
      };
    }

    return {
      ...extracted,
      confidence: 0.95,
    };
  } catch (error) {
    console.error("AI Extraction Error:", error);
    return {
      name: "Sản phẩm mới",
      price: 0,
      description: "Không thể trích xuất thông tin.",
      category: "Lỗi AI",
      confidence: 0,
    };
  }
}

export async function generateMarketingContent(productName: string, description: string) {
  try {
    const prompt = `Hãy viết một đoạn nội dung marketing (khoảng 50-80 từ) cực kỳ hấp dẫn, sáng tạo và thu hút để đăng bài bán hàng cho sản phẩm "${productName}". 
Mô tả sản phẩm: ${description}. 
Yêu cầu: Sử dụng ngôn ngữ trẻ trung, kèm các emoji phù hợp, có lời kêu gọi hành động (CTA) rõ ràng. Chỉ trả về nội dung bài viết, không thêm lời dẫn.`;

    return await askAiAgent(prompt);
  } catch (error) {
    console.error("AI Marketing Error:", error);
    return "Hãy mua sản phẩm tuyệt vời này tại VClaw! 🌟";
  }
}
