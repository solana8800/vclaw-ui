"use server";

import { gatewayClient } from "@/lib/gateway/client";
import { tryGhnShippingFee } from "@/lib/logistics/ghn-quote";
import { tryGhtkShippingFee } from "@/lib/logistics/ghtk-quote";
import { getGhtkResolvedConfig } from "@/lib/logistics/ghtk-config";

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
  const mock = [
    { provider: "GHTK (ước tính)", price: 32000, eta: "2-3 ngày" },
    { provider: "GHN (ước tính)", price: 35000, eta: "1-2 ngày" },
    { provider: "ViettelPost", price: 28000, eta: "3-4 ngày" },
  ];

  const grams = Math.round((params.weight || 0.5) * 1000);
  const liveRows: Array<{ provider: string; price: number; eta: string }> = [];

  const ghtkCfg = await getGhtkResolvedConfig();
  const pickPv = ghtkCfg.pickProvince;
  const pickDt = ghtkCfg.pickDistrict;
  const recvPv = ghtkCfg.receiverProvince;
  const recvDt = ghtkCfg.receiverDistrict;
  const recvAddr = ghtkCfg.receiverAddress?.trim() || params.to;
  if (ghtkCfg.token && pickPv && pickDt && recvPv && recvDt && recvAddr) {
    const ghtk = await tryGhtkShippingFee({
      token: ghtkCfg.token,
      pickProvince: pickPv,
      pickDistrict: pickDt,
      province: recvPv,
      district: recvDt,
      address: recvAddr,
      weightGrams: grams,
    });
    if (ghtk) liveRows.push(ghtk);
  }

  const toDistrict = Number(process.env.GHN_TO_DISTRICT_ID ?? "");
  const toWard = process.env.GHN_TO_WARD_CODE?.trim();
  if (Number.isFinite(toDistrict) && toDistrict > 0 && toWard) {
    const live = await tryGhnShippingFee({
      toDistrictId: toDistrict,
      toWardCode: toWard,
      weightGrams: grams,
    });
    if (live) liveRows.push({ provider: `GHN (${live.provider})`, price: live.price, eta: String(live.eta) });
  }

  if (liveRows.length > 0) {
    const hasGhtkLive = liveRows.some((l) => l.provider.startsWith("GHTK"));
    const hasGhnLive = liveRows.some((l) => l.provider.startsWith("GHN"));
    const stripMock = mock.filter((m) => {
      if (hasGhtkLive && m.provider.startsWith("GHTK")) return false;
      if (hasGhnLive && m.provider.startsWith("GHN")) return false;
      return true;
    });
    return [...liveRows, ...stripMock];
  }

  return mock;
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
