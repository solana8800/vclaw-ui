
"use server";

import { sendZalouserMessage } from "@/lib/zalouser/zalouser-cli-actions";
import { type OrderWithCustomer } from "@/lib/commerce/orders";

/**
 * Gửi thông báo đơn hàng cho Shipper qua Zalo
 */
export async function notifyShipperZalo(order: OrderWithCustomer, targetId: string) {
  if (!targetId) {
    return { success: false, error: "Chưa cấu hình ID người nhận." };
  }

  const message = `
🚚 *YÊU CẦU GIAO HÀNG MỚI*
---
🆔 Đơn hàng: #${order.orderNumber}
👤 Khách hàng: ${order.customer.name}
📞 Điện thoại: ${order.customer.phone || 'Không có'}
📍 Địa chỉ: ${order.shippingAddress || 'Theo thỏa thuận'}
💰 Thu hộ (COD): ${order.amount.toLocaleString('vi-VN')}đ
📝 Ghi chú: ${order.shippingNote || 'Không có'}
---
💡 *Hướng dẫn cho Shipper:*
👉 Vui lòng **Quote (Trả lời)** tin nhắn này với đúng cú pháp: **OK#${order.orderNumber}**
(Hệ thống chỉ tự động ghi nhận khi bạn nhắn đúng cú pháp trên)
  `.trim();

  try {
    // Nếu targetId không có prefix, và nó trông giống ID nhóm (số dài), có thể cần xử lý
    // Tuy nhiên ZaloIdentitySelector đã lấy ID chuẩn từ OpenClaw (thường là group:ID hoặc user:ID)
    const result = await sendZalouserMessage(targetId, message);
    return result;
  } catch (error) {
    console.error("Lỗi khi báo Shipper Zalo:", error);
    return { success: false, error: String(error) };
  }
}
