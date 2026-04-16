/**
 * Shipping Utility for VClaw
 * Handles address normalization and shipping fee estimation.
 */

export interface AddressInfo {
  raw: string;
  normalized?: string;
  province?: string;
  district?: string;
  ward?: string;
  street?: string;
}

export interface ShippingEstimate {
  provider: string;
  service: string;
  fee: number;
  estimatedDelivery: string;
}

/**
 * Chuẩn hóa địa chỉ (Mock)
 * Trong thực tế sẽ gọi LLM hoặc API chuyên dụng (như vMap, Google Maps).
 */
export async function normalizeAddress(rawAddress: string): Promise<AddressInfo> {
  // Giả lập thời gian xử lý AI
  await new Promise(resolve => setTimeout(resolve, 800));

  const lower = rawAddress.toLowerCase();
  
  // Logic mock bám sát các địa danh lớn
  if (lower.includes("hà nội") || lower.includes("hn")) {
    return {
      raw: rawAddress,
      normalized: "Số 1 Đại Cồ Việt, Bách Khoa, Hai Bà Trưng, Hà Nội",
      province: "Hà Nội",
      district: "Hai Bà Trưng",
      ward: "Bách Khoa",
      street: "Số 1 Đại Cồ Việt"
    };
  }

  if (lower.includes("hồ chí minh") || lower.includes("hcm") || lower.includes("sài gòn")) {
    return {
      raw: rawAddress,
      normalized: "285 Cách Mạng Tháng Tám, Phường 12, Quận 10, TP. Hồ Chí Minh",
      province: "TP. Hồ Chí Minh",
      district: "Quận 10",
      ward: "Phường 12",
      street: "285 Cách Mạng Tháng Tám"
    };
  }

  if (lower.includes("đà nẵng") || lower.includes("dn")) {
    return {
      raw: rawAddress,
      normalized: "102 Hùng Vương, Hải Châu 1, Hải Châu, Đà Nẵng",
      province: "Đà Nẵng",
      district: "Hải Châu",
      ward: "Hải Châu 1",
      street: "102 Hùng Vương"
    };
  }

  return {
    raw: rawAddress,
    normalized: rawAddress, // Trả về gốc nếu không khớp mock
  };
}

/**
 * Ước tính phí giao hàng (Mock)
 * Kết nối với các nhà cung cấp phổ biến tại Việt Nam.
 */
export async function getShippingEstimates(address: AddressInfo): Promise<ShippingEstimate[]> {
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Phí ship giả định dựa trên việc có Tỉnh/Thành hay không
  const baseFee = address.province ? 20000 : 35000;

  return [
    {
      provider: "Giao Hàng Tiết Kiệm (GHTK)",
      service: "Giao hàng nhanh",
      fee: baseFee + 2000,
      estimatedDelivery: "1-2 ngày"
    },
    {
      provider: "Giao Hàng Nhanh (GHN)",
      service: "Chuẩn",
      fee: baseFee + 5000,
      estimatedDelivery: "Hôm nay"
    },
    {
      provider: "Viettel Post",
      service: "Chuyển phát nhanh",
      fee: baseFee - 2000,
      estimatedDelivery: "2-3 ngày"
    }
  ];
}
