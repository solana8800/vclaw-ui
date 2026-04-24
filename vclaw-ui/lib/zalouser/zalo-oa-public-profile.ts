/**
 * Sau OAuth OA, gọi Open API để lấy tên / OA id lưu vào ChannelConnection.profileJson.
 * Định dạng phản hồi có thể khác theo phiên bản API — parse lỏng, bỏ qua khi lỗi.
 */
export type ZaloOaPublicProfile = {
  oaId: string | null;
  name: string | null;
  raw: unknown;
};

function pickName(data: Record<string, unknown> | null): string | null {
  if (!data) return null;
  const n = data.name ?? data.oa_name;
  return typeof n === "string" && n.trim() ? n.trim() : null;
}

function pickOaId(data: Record<string, unknown> | null): string | null {
  if (!data) return null;
  const id = data.oa_id ?? data.id;
  if (typeof id === "string" && id.trim()) return id.trim();
  if (typeof id === "number") return String(id);
  return null;
}

export async function fetchZaloOaPublicProfile(
  accessToken: string,
): Promise<ZaloOaPublicProfile | null> {
  try {
    const res = await fetch("https://openapi.zalo.me/v2.0/oa/getprofile", {
      method: "GET",
      headers: { access_token: accessToken },
      cache: "no-store",
    });
    const json = (await res.json()) as Record<string, unknown>;
    const err = json.error;
    if (typeof err === "number" && err !== 0) {
      return null;
    }
    const data =
      json.data && typeof json.data === "object"
        ? (json.data as Record<string, unknown>)
        : typeof json === "object" && json !== null && !("error" in json)
          ? (json as Record<string, unknown>)
          : null;
    const name = pickName(data);
    const oaId = pickOaId(data);
    if (!name && !oaId) {
      return null;
    }
    return { oaId, name, raw: json };
  } catch {
    return null;
  }
}
