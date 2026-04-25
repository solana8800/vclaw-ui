/**
 * GHN (Giao Hàng Nhanh) — báo giá thật khi có token + shop + mã địa chỉ.
 * @see https://api.ghn.vn/home/docs/detail?id=95
 */

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
  const token = process.env.GHN_TOKEN;
  const shopId = process.env.GHN_SHOP_ID;
  if (!token || !shopId) return null;

  const fromDistrictId = Number(
    params.fromDistrictId ?? process.env.GHN_FROM_DISTRICT_ID ?? 1442,
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

  const res = await fetch(
    "https://online-gateway.ghn.vn/shiip/public-api/v2/shipping-order/fee",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Token: token,
        ShopId: shopId,
      },
      body: JSON.stringify(body),
    },
  );
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
