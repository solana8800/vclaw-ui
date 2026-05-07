import { prisma } from "@/lib/db/prisma";
import { getGhnFeeApiUrl } from "./ghn-constants";

type GhnFeeResponse = {
  code?: number;
  message?: string;
  data?: {
    total?: number;
    service_fee?: number;
    insurance_fee?: number;
    cod_fee?: number;
    pick_remote_areas_fee?: number;
    deliver_remote_areas_fee?: number;
    expected_delivery_time?: string;
  };
};

export type GhnFeeDetail = {
  provider: "GHN";
  total: number;
  serviceFee: number;
  insuranceFee: number;
  codFee: number;
  remoteAreaFee: number;
  /** ISO datetime string từ GHN */
  expectedDeliveryTime: string | null;
  /** fromDistrictId dùng để tính */
  fromDistrictId: number;
  toDistrictId: number;
  toWardCode: string;
};

export async function tryGhnShippingFee(params: {
  toDistrictId: number;
  toWardCode: string;
  weightGrams: number;
  fromDistrictId?: number;
}): Promise<GhnFeeDetail | null> {
  const settings = await prisma.shopSettings.findFirst();
  const token = settings?.ghnToken;
  const shopId = settings?.ghnShopId;

  if (!token || !shopId) return null;

  // Ưu tiên: param truyền vào → ShopSettings.ghnFromDistrictId → default 1442 (Bình Thạnh, HCM)
  const fromDistrictId = Number(
    params.fromDistrictId ?? settings?.ghnFromDistrictId ?? 1442,
  );

  const body = {
    from_district_id: fromDistrictId,
    to_district_id: params.toDistrictId,
    to_ward_code: params.toWardCode,
    weight: Math.max(100, Math.min(params.weightGrams, 50_000)),
    length: 20,
    width: 15,
    height: 10,
    service_type_id: 2,
  };

  const res = await fetch(getGhnFeeApiUrl(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Token: token,
      ShopId: shopId,
    },
    body: JSON.stringify(body),
  });
  const json = (await res.json()) as GhnFeeResponse;
  if (!res.ok || !json.data) return null;
  if (json.code != null && json.code !== 200) return null;

  const d = json.data;
  const total = d.total ?? d.service_fee;
  if (typeof total !== "number") return null;

  return {
    provider: "GHN",
    total,
    serviceFee: d.service_fee ?? 0,
    insuranceFee: d.insurance_fee ?? 0,
    codFee: d.cod_fee ?? 0,
    remoteAreaFee: (d.pick_remote_areas_fee ?? 0) + (d.deliver_remote_areas_fee ?? 0),
    expectedDeliveryTime: d.expected_delivery_time ?? null,
    fromDistrictId,
    toDistrictId: params.toDistrictId,
    toWardCode: params.toWardCode,
  };
}
