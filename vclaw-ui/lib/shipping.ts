"use server";

import { gatewayClient } from "@/lib/gateway-client";

/**
 * Chuẩn hóa địa chỉ sử dụng AI của OpenClaw
 */
export type AddressInfo = {
  normalized: string;
  province: string;
  district: string;
  ward: string;
  street: string;
};

export type ShippingEstimate = {
  provider: string;
  service: string;
  estimatedDelivery: string;
  fee: number;
};

export async function standardizeAddress(rawAddress: string) {
  try {
    const result = await gatewayClient.post<Record<string, any>>("/api/ai/text-processing", {
      text: rawAddress,
      task: "address_standardization",
      format: "json"
    }) as any;
    
    return {
      success: true,
      data: result.structuredAddress || {
        province: "TP. Hồ Chí Minh",
        district: "Quận 1",
        ward: "Phường Bến Nghé",
        street: rawAddress
      }
    };
  } catch (error) {
    console.error("Address standardization failed:", error);
    return {
      success: false,
      message: "Không thể kết nối AI chuẩn hóa địa chỉ."
    };
  }
}

/** Chuẩn hóa địa chỉ cho UI admin (bọc `standardizeAddress`). */
export async function normalizeAddress(rawAddress: string): Promise<AddressInfo | null> {
  const result = await standardizeAddress(rawAddress);
  if (!result.success || !("data" in result) || !result.data) return null;
  const d = result.data as {
    province?: string;
    district?: string;
    ward?: string;
    street?: string;
  };
  const province = d.province ?? "";
  const district = d.district ?? "";
  const ward = d.ward ?? "";
  const street = d.street ?? rawAddress;
  const normalized = [street, ward, district, province].filter(Boolean).join(", ");
  return { normalized, province, district, ward, street };
}

/**
 * Lấy báo giá vận chuyển sơ bộ (Giả lập tích hợp GHTK/GHN)
 */
export async function getShippingQuotes(params: {
  from: string;
  to: string;
  weight: number;
}) {
  // Giả lập kết nối API đơn vị vận chuyển
  return [
    { provider: "GHTK", price: 32000, eta: "2-3 ngày" },
    { provider: "GHN", price: 35000, eta: "1-2 ngày" },
    { provider: "ViettelPost", price: 28000, eta: "3-4 ngày" },
  ];
}

/** Báo giá theo địa chỉ đã chuẩn hóa (bọc `getShippingQuotes`). */
export async function getShippingEstimates(
  address: AddressInfo,
  options?: { from?: string; weight?: number }
): Promise<ShippingEstimate[]> {
  const to = [address.street, address.ward, address.district, address.province]
    .filter(Boolean)
    .join(", ");
  const quotes = await getShippingQuotes({
    from: options?.from ?? "TP. Hồ Chí Minh",
    to: to || address.normalized,
    weight: options?.weight ?? 0.5,
  });
  return quotes.map((q) => ({
    provider: q.provider,
    service: "Tiêu chuẩn",
    estimatedDelivery: q.eta,
    fee: q.price,
  }));
}
