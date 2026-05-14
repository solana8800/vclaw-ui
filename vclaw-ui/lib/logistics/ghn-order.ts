import { prisma } from "@/lib/db";
import { getOrderWithOptionalProducts } from "@/lib/commerce/orders";
import { getGhnApiOrigin, GHN_URLS } from "@/lib/constants";
import { normalizeAddress } from "./shipping";
import { resolveGhnLocationForFee } from "./ghn-resolve";

type GhnPayload = Record<string, unknown>;
type GhnApiResponse = {
  code?: number;
  message?: string;
  data?: Record<string, unknown>;
};

/**
 * Lấy headers mặc định cho API GHN.
 */
async function getGhnHeaders() {
  const settings = await prisma.shopSettings.findFirst();
  const token = settings?.ghnToken?.trim();
  const shopId = settings?.ghnShopId?.trim();

  if (!token) return null;

  return {
    "Content-Type": "application/json",
    Token: token,
    ShopId: shopId || "",
  };
}

/**
 * Hủy đơn hàng GHN.
 */
export async function cancelGhnOrder(orderCode: string) {
  const headers = await getGhnHeaders();
  if (!headers) {
    return { success: false, message: "Chưa cấu hình GHN Token." };
  }

  const url = `${getGhnApiOrigin()}/shiip/public-api/v2/switch-status/cancel`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({ order_codes: [orderCode] }),
    });
    const data = await res.json() as GhnApiResponse;
    if (data.code === 200) {
      return { success: true, message: "Đã yêu cầu hủy đơn hàng GHN." };
    }
    return { success: false, message: data.message || "Lỗi khi hủy đơn hàng." };
  } catch {
    return { success: false, message: "Không thể kết nối API GHN." };
  }
}

/**
 * Cập nhật thông tin đơn hàng GHN.
 */
export async function updateGhnOrder(payload: GhnPayload) {
  const headers = await getGhnHeaders();
  if (!headers) {
    return { success: false, message: "Chưa cấu hình GHN Token." };
  }

  const url = `${getGhnApiOrigin()}/shiip/public-api/v2/shipping-order/update`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });
    const data = await res.json() as GhnApiResponse;
    if (data.code === 200) {
      return { success: true, data: data.data };
    }
    return { success: false, message: data.message || "Lỗi khi cập nhật đơn hàng." };
  } catch {
    return { success: false, message: "Không thể kết nối API GHN." };
  }
}

/**
 * Lấy thông tin chi tiết đơn hàng từ GHN.
 */
export async function getGhnOrderDetail(orderCode: string) {
  const headers = await getGhnHeaders();
  if (!headers) {
    return { success: false, message: "Chưa cấu hình GHN Token." };
  }

  const url = `${getGhnApiOrigin()}/shiip/public-api/v2/shipping-order/detail`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({ order_code: orderCode }),
    });
    const data = await res.json() as GhnApiResponse;
    if (data.code === 200) {
      return { success: true, data: data.data };
    }
    return { success: false, message: data.message || "Lỗi khi lấy chi tiết đơn hàng." };
  } catch {
    return { success: false, message: "Không thể kết nối API GHN." };
  }
}

/**
 * Tạo đơn hàng GHN trực tiếp qua API.
 */
export async function createGhnOrderDirect(payload: GhnPayload): Promise<GhnCreateResult> {
  const headers = await getGhnHeaders();
  if (!headers) {
    return { success: false, message: "Chưa cấu hình GHN Token." };
  }

  const url = `${getGhnApiOrigin()}/shiip/public-api/v2/shipping-order/create`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });
    const data = await res.json() as GhnApiResponse;
    if (data.code === 200) {
      const responseData = data.data;
      return { 
        success: true, 
        orderCode: typeof responseData?.order_code === "string"
          ? responseData.order_code
          : undefined,
        totalFee: typeof responseData?.total_fee === "number"
          ? responseData.total_fee
          : undefined,
        expectedDeliveryTime: typeof responseData?.expected_delivery_time === "string"
          ? responseData.expected_delivery_time
          : undefined,
        data: responseData,
      };
    }
    return { success: false, message: data.message || "Lỗi khi tạo đơn hàng GHN." };
  } catch (error) {
    console.error("GHN API Error:", error);
    return { success: false, message: "Không thể kết nối API GHN." };
  }
}

export type GhnCreateResult = {
  success: boolean;
  message?: string;
  orderCode?: string;
  totalFee?: number;
  expectedDeliveryTime?: string;
  data?: unknown;
  needsConfig?: boolean;
  portalUrl?: string;
};

/**
 * Logic tạo vận đơn từ Đơn hàng VClaw.
 * 1. Lấy thông tin đơn hàng + khách hàng.
 * 2. Chuẩn hóa địa chỉ qua AI.
 * 3. Map sang mã Tỉnh/Quận/Phường của GHN.
 * 4. Gọi API tạo đơn.
 */
export async function createGhnOrder(orderId?: string): Promise<GhnCreateResult> {
  if (!orderId) {
    const settings = await prisma.shopSettings.findFirst();
    if (!settings?.ghnToken?.trim()) {
       return { success: false, message: "Chưa cấu hình GHN Token.", needsConfig: true };
    }
    return { 
      success: true, 
      portalUrl: GHN_URLS.PORTAL_CREATE,
      message: "Vui lòng cung cấp mã đơn hàng để tạo vận đơn tự động. Hoặc bạn có thể tạo thủ công tại Portal GHN."
    };
  }

  const order = await getOrderWithOptionalProducts(orderId);

  if (!order) {
    return { success: false, message: "Không tìm thấy đơn hàng trong hệ thống." };
  }

  // 1. Xác định địa chỉ
  const rawAddress = order.shippingAddress || "";
  if (!rawAddress) {
    return { success: false, message: "Đơn hàng chưa có địa chỉ giao hàng." };
  }

  // 2. Chuẩn hóa địa chỉ (Yêu cầu Gateway OpenClaw phải hoạt động)
  const normalized = await normalizeAddress(rawAddress);
  if (!normalized) {
    return { success: false, message: "Không thể nhận diện cấu trúc địa chỉ. Vui lòng đảm bảo Gateway OpenClaw đang hoạt động hoặc cập nhật lại địa chỉ khách hàng." };
  }

  // 3. Map sang mã GHN
  const ghnLoc = await resolveGhnLocationForFee({
    province: normalized.province,
    district: normalized.district,
    ward: normalized.ward
  });

  if (!ghnLoc) {
    return { success: false, message: "Địa chỉ này hiện chưa được hỗ trợ hoặc không tìm thấy trên hệ thống GHN." };
  }

  // 4. Chuẩn bị payload
  const totalWeight = order.items.reduce((sum, item) => {
    return sum + (200 * item.quantity);
  }, 0);

  const payload = {
    payment_type_id: 2, // 1: Shop trả, 2: Khách trả
    note: order.shippingNote || "Giao hàng từ VClaw",
    required_note: "CHOXEMHANGKHONGTHU",
    to_name: order.customer?.name || "Khách hàng",
    to_phone: order.customer?.phone || "0900000000",
    to_address: normalized.normalized,
    to_ward_code: ghnLoc.toWardCode,
    to_district_id: ghnLoc.toDistrictId,
    weight: Math.max(100, totalWeight),
    length: 10,
    width: 10,
    height: 10,
    service_type_id: 2, // Hàng nhẹ / Chuẩn
    items: order.items.map(it => ({
      name: it.product?.name || "Sản phẩm",
      code: it.product?.productCode || "",
      quantity: it.quantity,
      price: Math.round(it.price)
    }))
  };

  const result = await createGhnOrderDirect(payload);
  
  if (result.success && result.orderCode) {
    // Cập nhật mã vận đơn vào đơn hàng
    await prisma.order.update({
      where: { id: orderId },
      data: { 
        trackingNumber: result.orderCode,
        fulfillmentStatus: "SHIPPING"
      }
    });
  }

  return result;
}
