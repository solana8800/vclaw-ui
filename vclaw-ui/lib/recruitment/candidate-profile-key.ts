/**
 * Khóa canonical để gộp ứng viên LinkedIn (tránh trùng profile).
 * - LinkedIn profile: linkedin:in:<slug-or-member-id> (chữ thường, bỏ query)
 * - LinkedIn inbox-only (chưa có URL profile): linkedin:chat:<chatId>
 */

export function normalizeLinkedInProfileUrl(url: string): string {
  const trimmed = url.trim().split("?")[0].replace(/\/+$/, "");
  if (!trimmed) return "";
  if (trimmed.startsWith("linkedin://")) return trimmed;
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
  if (!normalized) return false;
  try {
    const url = new URL(normalized);
    const hostname = url.hostname.toLowerCase();
    return (
      (hostname === "linkedin.com" || hostname === "www.linkedin.com") &&
      /^\/in\/[^/?#]+\/?$/i.test(url.pathname)
    );
  } catch {
    return false;
  }
}

export function profileUrlStorageKey(url: string): string | null {
  const normalized = normalizeLinkedInProfileUrl(url);
  if (!normalized) return null;
  if (normalized.startsWith("linkedin://chat/")) {
    const id = decodeURIComponent(normalized.slice("linkedin://chat/".length));
    return id ? `linkedin:chat:${id}` : null;
  }
  const match = normalized.match(/linkedin\.com\/in\/([^/?#]+)/i);
  if (match?.[1]) {
    return `linkedin:in:${match[1].toLowerCase()}`;
  }
  return normalized.toLowerCase();
}

export function linkedinChatStorageKey(chatId: string): string {
  return `linkedin:chat:${chatId.trim()}`;
}

/** URL lưu DB — ưu tiên LinkedIn thật, fallback linkedin://chat/ */
export function resolveStoredProfileUrl(
  profileUrl: string,
  linkedinChatId?: string | null,
): string {
  const linkedin = profileUrl.includes("linkedin.com/in/") || profileUrl.includes("linkedin.com/profile/")
    ? normalizeLinkedInProfileUrl(profileUrl)
    : "";
  if (linkedin) return linkedin;
  if (linkedinChatId?.trim()) {
    return `linkedin://chat/${encodeURIComponent(linkedinChatId.trim())}`;
  }
  return normalizeLinkedInProfileUrl(profileUrl) || profileUrl;
}
