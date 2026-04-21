/**
 * GHTK — báo phí khi có token + địa chỉ lấy/giao (biến môi trường).
 * @see https://docs.giaohangtietkiem.vn/
 */

type GhtkFeeResponse = {
  success?: boolean;
  fee?: {
    fee?: number;
    insurance_fee?: number;
    delivery_time?: string;
  };
  message?: string;
};

export async function tryGhtkShippingFee(params: {
  token?: string;
  pickProvince: string;
  pickDistrict: string;
  province: string;
  district: string;
  address: string;
  weightGrams: number;
  valueVnd?: number;
}): Promise<{ provider: string; price: number; eta: string } | null> {
  const token = params.token?.trim() ?? process.env.GHTK_TOKEN?.trim();
  if (!token) return null;

  const body = {
    token,
    pick_province: params.pickProvince,
    pick_district: params.pickDistrict,
    province: params.province,
    district: params.district,
    address: params.address,
    weight: Math.max(100, Math.min(params.weightGrams, 50_000)),
    value: params.valueVnd ?? 0,
    deliver_option: "none",
  };

  const res = await fetch("https://services.giaohangtietkiem.vn/services/shipment/fee", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = (await res.json()) as GhtkFeeResponse;
  if (!res.ok || !json.success || !json.fee || typeof json.fee.fee !== "number") {
    return null;
  }
  const insurance = json.fee.insurance_fee ?? 0;
  return {
    provider: "GHTK",
    price: json.fee.fee + insurance,
    eta: json.fee.delivery_time ?? "—",
  };
}
