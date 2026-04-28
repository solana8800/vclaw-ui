
/**
 * GHN (Giao Hàng Nhanh) — Tạo đơn hàng hoặc link portal.
 */

export async function createGhnPortalLink(order: {
  orderNumber: string;
  customerName: string;
  phone: string;
  address: string;
  amount: number;
}) {
  // Portal GHN không hỗ trợ pre-fill qua query params một cách chính thống công khai
  // Nhưng chúng ta có thể tạo một "Deep Link" hoặc chỉ đơn giản là dẫn đến trang tạo đơn
  return `https://khachhang.ghn.vn/order/create`;
}

export async function createGhnOrder(order: any) {
  const token = process.env.GHN_TOKEN;
  const shopId = process.env.GHN_SHOP_ID;
  if (!token || !shopId) {
    return { success: false, message: "Thiếu cấu hình GHN_TOKEN hoặc GHN_SHOP_ID" };
  }

  // TODO: Gọi API GHN /shipping-order/create
  // Tạm thời trả về link portal để người dùng tự chốt cho chắc chắn như yêu cầu
  return { 
    success: true, 
    portalUrl: `https://khachhang.ghn.vn/order/create`,
    message: "Vui lòng hoàn tất tạo đơn trên portal GHN"
  };
}
