/**
 * Khóa canonical để gộp ứng viên LinkedIn + Linxa (tránh trùng profile).
 * - LinkedIn: linkedin:in:<slug-or-member-id> (chữ thường, bỏ query)
 * - Linxa chỉ chat: linxa:chat:<chatId>
 */

export function normalizeLinkedInProfileUrl(url: string): string {
  const trimmed = url.trim().split("?")[0].replace(/\/+$/, "");
  if (!trimmed) return "";
  if (trimmed.startsWith("linxa://")) return trimmed;
  if (!trimmed.startsWith("http")) {
    return `https://www.linkedin.com/in/${trimmed.replace(/^\/+/, "")}`;
  }
  return trimmed;
}

/** Tên tạm từ slug /in/... khi chưa scrape profile. */
export function guessNameFromLinkedInUrl(url: string): string {
  const match = url.match(/linkedin\.com\/in\/([^/?#]+)/i);
  if (!match?.[1]) return "Ứng viên";
  let slug = decodeURIComponent(match[1]);
  slug = slug.replace(/-[a-f0-9]{6,}$/i, "").replace(/-\d{5,}$/, "");
  const words = slug
    .split(/[-_]/)
    .map((w) => w.trim())
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
  return words.length > 0 ? words.join(" ") : "Ứng viên";
}

export function isValidLinkedInProfileInput(input: string): boolean {
  const normalized = normalizeLinkedInProfileUrl(input);
  return Boolean(normalized && /linkedin\.com\/in\//i.test(normalized));
}

export function profileUrlStorageKey(url: string): string | null {
  const normalized = normalizeLinkedInProfileUrl(url);
  if (!normalized) return null;
  if (normalized.startsWith("linxa://chat/")) {
    const id = decodeURIComponent(normalized.slice("linxa://chat/".length));
    return id ? `linxa:chat:${id}` : null;
  }
  const match = normalized.match(/linkedin\.com\/in\/([^/?#]+)/i);
  if (match?.[1]) {
    return `linkedin:in:${match[1].toLowerCase()}`;
  }
  return normalized.toLowerCase();
}

export function linxaChatStorageKey(chatId: string): string {
  return `linxa:chat:${chatId.trim()}`;
}

/** URL lưu DB — ưu tiên LinkedIn thật, fallback linxa://chat/ */
export function resolveStoredProfileUrl(
  profileUrl: string,
  linxaChatId?: string | null,
): string {
  const linkedin = profileUrl.includes("linkedin.com/in/") || profileUrl.includes("linkedin.com/profile/")
    ? normalizeLinkedInProfileUrl(profileUrl)
    : "";
  if (linkedin) return linkedin;
  if (linxaChatId?.trim()) {
    return `linxa://chat/${encodeURIComponent(linxaChatId.trim())}`;
  }
  return normalizeLinkedInProfileUrl(profileUrl) || profileUrl;
}
