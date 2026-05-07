"use server";

import { gateway } from "@/lib/gateway/server";
import { tryGhnShippingFee } from "@/lib/logistics/ghn-quote";
import { resolveGhnLocationForFee } from "@/lib/logistics/ghn-resolve";
import { prisma } from "@/lib/db";

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
  /** ISO datetime string hoặc text mô tả */
  estimatedDelivery: string | null;
  fee: number;
  /** Breakdown phí (chỉ có khi GHN trả về thật) */
  breakdown?: {
    serviceFee: number;
    insuranceFee: number;
    codFee: number;
    remoteAreaFee: number;
  };
  /** Tuyến đường: từ → đến */
  route?: {
    from: string;
    to: string;
  };
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

import { ADDRESS_SYSTEM_PROMPT, ADDRESS_STANDARDIZATION_PROMPT } from "@/lib/ai/prompts/logistics-prompts";

export async function standardizeAddress(rawAddress: string) {
  try {
    // 1. Thử gọi endpoint chuyên dụng (thường có ở bản OpenClaw Full)
    try {
      const result = await gateway.post<Record<string, unknown>>("/api/ai/text-processing", {
        text: rawAddress,
        task: "address_standardization",
        format: "json",
      });

      const parsed = extractStructuredAddress(result);
      if (parsed && parsed.province?.trim() && parsed.district?.trim()) {
        return { success: true as const, data: parsed };
      }
    } catch (e) {
      console.warn("Dedicated address API failed, trying fallback via Chat Completions...", e);
    }

    // 2. Fallback: Sử dụng Chat Completions (hỗ trợ bởi hầu hết các bản Gateway kể cả Zero Token)
    const prompt = ADDRESS_STANDARDIZATION_PROMPT(rawAddress);

    try {
      const chatResult = await gateway.post<any>("/v1/chat/completions", {
        model: "openclaw",
        messages: [
          { role: "system", content: ADDRESS_SYSTEM_PROMPT },
          { role: "user", content: prompt }
        ],
        temperature: 0,
      }, {
        headers: {
          "x-openclaw-model": "deepseek-web/deepseek-chat"
        }
      });


      const content = chatResult.choices?.[0]?.message?.content;
      if (content) {
        // Làm sạch content nếu AI trả về code block
        const jsonStr = content.replace(/```json/g, "").replace(/```/g, "").trim();
        try {
          const d = JSON.parse(jsonStr);
          if (d.province && d.district) {
            return {
              success: true as const,
              data: {
                province: d.province,
                district: d.district,
                ward: d.ward || "",
                street: d.street || ""
              }
            };
          }
        } catch (parseError) {
          console.error("Failed to parse address JSON from AI:", content);
        }
      }
    } catch (chatError) {
      console.error("Gateway Chat Completions fallback failed:", chatError);
    }

    return {
      success: false as const,
      message: "AI không trả đủ tỉnh/thành và quận/huyện. Kiểm tra OpenClaw gateway và model.",
    };
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
 * Báo giá GHN thật khi đủ cấu hình; fallback mock khi chưa cấu hình.
 */
export async function getShippingQuotes(params: {
  from: string;
  to: string;
  weight: number;
  receiverStructured?: AddressInfo;
}): Promise<ShippingEstimate[]> {
  const mock: ShippingEstimate[] = [
    {
      provider: "GHN (ước tính)",
      service: "Tiêu chuẩn",
      estimatedDelivery: null,
      fee: 35000,
      route: { from: params.from, to: params.to },
    },
  ];

  const grams = Math.round((params.weight || 0.5) * 1000);
  const rs = params.receiverStructured;

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
      return [
        {
          provider: "Giao Hàng Nhanh",
          service: "Tiêu chuẩn (GHN)",
          estimatedDelivery: live.expectedDeliveryTime,
          fee: live.total,
          breakdown: {
            serviceFee: live.serviceFee,
            insuranceFee: live.insuranceFee,
            codFee: live.codFee,
            remoteAreaFee: live.remoteAreaFee,
          },
          route: { from: params.from, to: params.to },
        },
      ];
    }
  }

  return mock;
}

/** Báo giá theo địa chỉ đã chuẩn hóa (bọc `getShippingQuotes`). */
export async function getShippingEstimates(
  address: AddressInfo,
  options?: { from?: string; weight?: number },
): Promise<ShippingEstimate[]> {
  const to = [address.ward, address.district, address.province].filter(Boolean).join(", ");

  let fromLabel = options?.from;
  if (!fromLabel) {
    const shop = await prisma.shopSettings.findFirst({
      select: { shopName: true, address: true },
    });
    // Dùng địa chỉ shop nếu có, fallback về tên shop, fallback về "Kho gửi hàng"
    fromLabel = shop?.address?.trim() || shop?.shopName?.trim() || "Kho gửi hàng";
  }

  return getShippingQuotes({
    from: fromLabel,
    to: to || address.normalized,
    weight: options?.weight ?? 0.5,
    receiverStructured: address,
  });
}
