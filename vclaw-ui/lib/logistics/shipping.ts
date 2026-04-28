"use server";

import { gateway } from "@/lib/gateway/server";
import { tryGhnShippingFee } from "@/lib/logistics/ghn-quote";
import { tryGhtkShippingFee } from "@/lib/logistics/ghtk-quote";
import { getGhtkResolvedConfig } from "@/lib/logistics/ghtk-config";
import { resolveGhnLocationForFee } from "@/lib/logistics/ghn-resolve";

/**
 * Chuẩn hóa địa chỉ qua OpenClaw gateway (AI).
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

function extractStructuredAddress(result: Record<string, unknown>): {
  province?: string;
  district?: string;
  ward?: string;
  street?: string;
} | null {
  const pick = (o: unknown) => {
    if (!o || typeof o !== "object" || Array.isArray(o)) return null;
    const r = o as Record<string, unknown>;
    return {
      province: typeof r.province === "string" ? r.province : undefined,
      district: typeof r.district === "string" ? r.district : undefined,
      ward: typeof r.ward === "string" ? r.ward : undefined,
      street: typeof r.street === "string" ? r.street : undefined,
    };
  };

  const a = pick(result.structuredAddress);
  if (a && (a.province?.trim() || a.district?.trim())) return a;

  const data = result.data;
  if (data && typeof data === "object" && !Array.isArray(data)) {
    const d = data as Record<string, unknown>;
    const b = pick(d.structuredAddress);
    if (b && (b.province?.trim() || b.district?.trim())) return b;
  }

  const resText = result.result ?? result.text;
  if (typeof resText === "string") {
    try {
      const j = JSON.parse(resText) as Record<string, unknown>;
      const c = pick(j.structuredAddress ?? j);
      if (c && (c.province?.trim() || c.district?.trim())) return c;
    } catch {
      /* ignore */
    }
  }

  return null;
}

export async function standardizeAddress(rawAddress: string) {
  try {
    const result = await gateway.post<Record<string, unknown>>("/api/ai/text-processing", {
      text: rawAddress,
      task: "address_standardization",
      format: "json",
    });

    const parsed = extractStructuredAddress(result);
    if (!parsed || !parsed.province?.trim() || !parsed.district?.trim()) {
      return {
        success: false as const,
        message:
          "AI không trả đủ tỉnh/thành và quận/huyện. Kiểm tra OpenClaw gateway (OPENCLAW_GATEWAY_URL) và model.",
      };
    }

    return { success: true as const, data: parsed };
  } catch (error) {
    console.error("Address standardization failed:", error);
    return {
      success: false as const,
      message: "Không thể kết nối gateway để chuẩn hóa địa chỉ.",
    };
  }
}

/** Chuẩn hóa địa chỉ cho UI admin (bọc `standardizeAddress`). */
export async function normalizeAddress(rawAddress: string): Promise<AddressInfo | null> {
  const result = await standardizeAddress(rawAddress);
  if (!result.success || !("data" in result) || !result.data) return null;
  const d = result.data;
  const province = d.province?.trim() ?? "";
  const district = d.district?.trim() ?? "";
  const ward = d.ward?.trim() ?? "";
  const street = d.street?.trim() || rawAddress.trim();
  if (!province || !district) return null;
  const normalized = [street, ward, district, province].filter(Boolean).join(", ");
  return { normalized, province, district, ward, street };
}

/**
 * Báo giá: GHTK/GHN thật khi đủ cấu hình; có thể truyền địa chỉ đã chuẩn hóa để tính theo điểm nhận.
 */
export async function getShippingQuotes(params: {
  from: string;
  to: string;
  weight: number;
  receiverStructured?: AddressInfo;
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
  const recvAddrFallback = ghtkCfg.receiverAddress?.trim() || params.to;

  const rs = params.receiverStructured;
  const recvProvince = rs?.province?.trim() || recvPv || "";
  const recvDistrict = rs?.district?.trim() || recvDt || "";
  const recvAddressLine =
    rs != null
      ? [rs.street, rs.ward].filter(Boolean).join(", ").trim() || params.to
      : recvAddrFallback;

  if (ghtkCfg.token && pickPv && pickDt && recvProvince && recvDistrict && recvAddressLine) {
    const ghtk = await tryGhtkShippingFee({
      token: ghtkCfg.token,
      pickProvince: pickPv,
      pickDistrict: pickDt,
      province: recvProvince,
      district: recvDistrict,
      address: recvAddressLine,
      weightGrams: grams,
    });
    if (ghtk) liveRows.push(ghtk);
  }

  let ghnToDistrict: number | null = null;
  let ghnToWard: string | null = null;

  if (rs?.province?.trim() && rs.district?.trim() && rs.ward?.trim()) {
    const resolved = await resolveGhnLocationForFee({
      province: rs.province,
      district: rs.district,
      ward: rs.ward,
    });
    if (resolved) {
      ghnToDistrict = resolved.toDistrictId;
      ghnToWard = resolved.toWardCode;
    }
  }

  if (ghnToDistrict == null || !ghnToWard) {
    const toDistrict = Number(process.env.GHN_TO_DISTRICT_ID ?? "");
    const toWard = process.env.GHN_TO_WARD_CODE?.trim();
    if (Number.isFinite(toDistrict) && toDistrict > 0 && toWard) {
      ghnToDistrict = toDistrict;
      ghnToWard = toWard;
    }
  }

  if (ghnToDistrict != null && ghnToWard) {
    const live = await tryGhnShippingFee({
      toDistrictId: ghnToDistrict,
      toWardCode: ghnToWard,
      weightGrams: grams,
    });
    if (live) {
      liveRows.push({
        provider: `GHN (${live.provider})`,
        price: live.price,
        eta: String(live.eta),
      });
    }
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
  options?: { from?: string; weight?: number },
): Promise<ShippingEstimate[]> {
  const to = [address.street, address.ward, address.district, address.province]
    .filter(Boolean)
    .join(", ");
  const quotes = await getShippingQuotes({
    from: options?.from ?? "TP. Hồ Chí Minh",
    to: to || address.normalized,
    weight: options?.weight ?? 0.5,
    receiverStructured: address,
  });
  return quotes.map((q) => ({
    provider: q.provider,
    service: "Tiêu chuẩn",
    estimatedDelivery: q.eta,
    fee: q.price,
  }));
}
