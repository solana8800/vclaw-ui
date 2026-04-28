import { prisma } from "@/lib/db/prisma";
import { getGhnFeeApiUrl } from "./ghn-constants";

type GhnFeeResponse = {
  code?: number;
  message?: string;
  data?: {
    service_fee?: number;
    total?: number;
    expected_delivery_time?: string;
  };
};

export async function tryGhnShippingFee(params: {
  toDistrictId: number;
  toWardCode: string;
  weightGrams: number;
  fromDistrictId?: number;
}): Promise<{ provider: string; price: number; eta: string } | null> {
  const settings = await prisma.shopSettings.findFirst();
  const token = settings?.ghnToken;
  const shopId = settings?.ghnShopId;
  
  if (!token || !shopId) return null;

  const fromDistrictId = Number(
    params.fromDistrictId ?? 1442,
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
  if (!res.ok || !json.data) {
    return null;
  }
  if (json.code != null && json.code !== 200) {
    return null;
  }
  const fee = json.data.total ?? json.data.service_fee;
  if (typeof fee !== "number") return null;
  return {
    provider: "GHN",
    price: fee,
    eta: json.data.expected_delivery_time ?? "—",
  };
}
