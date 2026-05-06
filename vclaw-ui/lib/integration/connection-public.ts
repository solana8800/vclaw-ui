import {
  CHANNEL_META_FB,
  CHANNEL_SHOPEE_OPEN,
} from "@/lib/channel/providers";

/** Giảm nhạy cảm trước khi gửi `profileJson` xuống client. */
export function sanitizeConnectionProfileForPublic(
  provider: string,
  profileJson: string | null,
): string | null {
  if (!profileJson) return null;
  if (provider === CHANNEL_META_FB) {
    try {
      const raw = JSON.parse(profileJson) as {
        user?: { id?: string; name?: string };
        pages?: Array<{ id: string; name: string; access_token?: string }>;
      };
      const pages = (raw.pages ?? []).map((p) => ({ id: p.id, name: p.name }));
      return JSON.stringify({ user: raw.user, pages });
    } catch {
      return null;
    }
  }
  if (provider === CHANNEL_SHOPEE_OPEN) {
    try {
      const raw = JSON.parse(profileJson) as { shopName?: string; shopId?: string };
      return JSON.stringify({
        shopName: raw.shopName ?? null,
        shopId: raw.shopId ?? null,
      });
    } catch {
      return null;
    }
  }
  return profileJson;
}
