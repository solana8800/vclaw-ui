import { prisma } from "@/lib/db";

/**
 * GHN (Giao Hàng Nhanh) — Tạo đơn hàng hoặc link portal.
 */

import { GHN_URLS } from "./ghn-constants";


const GHN_API_BASE = process.env.NODE_ENV === 'production' 
  ? GHN_URLS.API_PROD 
  : GHN_URLS.API_DEV;

async function getGhnHeaders() {
  const settings = await prisma.shopSettings.findFirst();
  const token = settings?.ghnToken;
  const shopId = settings?.ghnShopId;
  
  if (!token || !shopId) return null;
  
  return {
    'Content-Type': 'application/json',
    'Token': token,
    'ShopId': shopId
  };
}

export async function createGhnOrder() {
  const headers = await getGhnHeaders();
  if (!headers) {
    return { success: false, message: "Chưa cấu hình GHN Token hoặc Shop ID.", needsConfig: true };
  }

  // TODO: Logic phân tích địa chỉ để lấy to_ward_code và to_district_id
  // Hiện tại nếu là đơn sơ sài, chúng ta vẫn trả về Portal Link cho an toàn
  // Nếu có đủ data trong metadata hoặc custom fields, có thể gọi API trực tiếp ở đây
  
  return { 
    success: true, 
    portalUrl: GHN_URLS.PORTAL_CREATE,
    message: "Thông tin đơn hàng đã sẵn sàng. Vui lòng hoàn tất tại Portal GHN (API Direct yêu cầu mã Quận/Huyện)."
  };
}

export async function cancelGhnOrder(orderCode: string) {
  const headers = await getGhnHeaders();
  if (!headers) return { success: false, message: "Chưa cấu hình GHN." };

  try {
    const res = await fetch(`${GHN_API_BASE}switch-status/cancel`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ order_codes: [orderCode] })
    });
    const data = await res.json();
    return { success: data.code === 200, message: data.message, data: data.data };
  } catch (error) {
    return { success: false, message: String(error) };
  }
}

export async function updateGhnOrder(payload: { order_code: string; [key: string]: any }) {
  const headers = await getGhnHeaders();
  if (!headers) return { success: false, message: "Chưa cấu hình GHN." };

  try {
    const res = await fetch(`${GHN_API_BASE}shipping-order/update`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    return { success: data.code === 200, message: data.message, data: data.data };
  } catch (error) {
    return { success: false, message: String(error) };
  }
}
