
import { gatewayClient } from "@/lib/gateway/client";

/**
 * Gửi thông tin đơn hàng vào nhóm Zalo Shipper
 */
export async function notifyShipperGroup(groupId: string, order: {
  orderNumber: string;
  customerName: string;
  phone: string;
  address: string;
  amount: number;
  note?: string;
}) {
  const message = `
🚚 *YÊU CẦU GIAO HÀNG MỚI*
---
🆔 Đơn hàng: #${order.orderNumber}
👤 Khách hàng: ${order.customerName}
📞 Điện thoại: ${order.phone}
📍 Địa chỉ: ${order.address}
💰 Thu hộ (COD): ${order.amount.toLocaleString('vi-VN')}đ
📝 Ghi chú: ${order.note || 'Không có'}
---
_Vui lòng xác nhận để đi đơn!_
  `.trim();

  try {
    const res = await gatewayClient.post("/api/zalouser/message/send", {
      to: `group:${groupId}`,
      body: message
    });
    return { success: true, data: res };
  } catch (error: any) {
    console.error("Lỗi gửi tin nhắn Shipper:", error);
    return { success: false, error: error.message };
  }
}
