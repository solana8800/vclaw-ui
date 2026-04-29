import { prisma } from "@/lib/db";
import { getGhnMasterDataUrl } from "@/lib/logistics/ghn-constants";

/** Chuẩn hóa chuỗi để so khớp tên địa danh (tiếng Việt). */
function normalizeAddressKey(s: string): string {
  return stripVietnameseTones(s)
    .toLowerCase()
    .replace(/đ/g, "d")
    .replace(/\s+/g, " ")
    .replace(/^(tinh|tp|thanh pho|thành phố)\s+/i, "")
    .replace(/^(quan|huyen|huyện|thi xa|thị xã)\s+/i, "")
    .replace(/^(phuong|xa|phường|xã)\s+/i, "")
    .trim();
}

function stripVietnameseTones(str: string): string {
  return str
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "d");
}

type GhnProvinceRow = { ProvinceID?: number; ProvinceName?: string };
type GhnDistrictRow = { DistrictID?: number; DistrictName?: string };
type GhnWardRow = { WardCode?: string; WardName?: string; DistrictID?: number };

function bestNameMatch<T extends Record<string, unknown>>(
  rows: T[],
  query: string,
  nameKey: keyof T,
): T | null {
  const q = normalizeAddressKey(query);
  if (!q) return null;
  let best: T | null = null;
  let bestScore = 0;
  for (const row of rows) {
    const name = String(row[nameKey] ?? "");
    const n = normalizeAddressKey(name);
    if (!n) continue;
    let score = 0;
    if (n === q) score = 100;
    else if (n.includes(q) || q.includes(n)) score = 85;
    else {
      const words = q.split(" ").filter((w) => w.length > 1);
      const hit = words.filter((w) => n.includes(w)).length;
      if (words.length > 0 && hit === words.length) score = 75;
      else if (hit > 0) score = 40 + Math.min(30, hit * 10);
    }
    if (score > bestScore) {
      bestScore = score;
      best = row;
    }
  }
  return bestScore >= 40 ? best : null;
}

async function ghnFetchJson<T>(
  url: string,
  token: string,
): Promise<{ code?: number; data?: T } | null> {
  const res = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Token: token,
    },
  });
  if (!res.ok) return null;
  const json = (await res.json()) as { code?: number; data?: T };
  if (json.code != null && json.code !== 200) return null;
  return json;
}

function asRowArray<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === "object") return [data as T];
  return [];
}

/**
 * Tra master-data GHN theo tên tỉnh / quận / phường (sau khi AI chuẩn hóa).
 * Trả về mã phục vụ API fee; null nếu không map được.
 */
export async function resolveGhnLocationForFee(address: {
  province: string;
  district: string;
  ward: string;
}): Promise<{ toDistrictId: number; toWardCode: string } | null> {
  const settings = await prisma.shopSettings.findFirst();
  const token = settings?.ghnToken?.trim();
  if (!token) return null;

  const provUrl = getGhnMasterDataUrl("province");
  const provRes = await ghnFetchJson<unknown>(provUrl, token);
  const provinces = asRowArray<GhnProvinceRow>(provRes?.data);
  const prov = bestNameMatch(provinces as Record<string, unknown>[], address.province, "ProvinceName") as
    | GhnProvinceRow
    | null;
  const provinceId = prov?.ProvinceID;
  if (provinceId == null) return null;

  const distUrl = getGhnMasterDataUrl("district", { province_id: provinceId });
  const distRes = await ghnFetchJson<unknown>(distUrl, token);
  const districts = asRowArray<GhnDistrictRow>(distRes?.data);
  const dist = bestNameMatch(districts as Record<string, unknown>[], address.district, "DistrictName") as
    | GhnDistrictRow
    | null;
  const districtId = dist?.DistrictID;
  if (districtId == null) return null;

  const wardUrl = getGhnMasterDataUrl("ward", { district_id: districtId });
  const wardRes = await ghnFetchJson<unknown>(wardUrl, token);
  const wards = asRowArray<GhnWardRow>(wardRes?.data);
  const ward = bestNameMatch(wards as Record<string, unknown>[], address.ward, "WardName") as GhnWardRow | null;
  const wardCode = ward?.WardCode?.trim();
  if (!wardCode) return null;

  return { toDistrictId: districtId, toWardCode: wardCode };
}
