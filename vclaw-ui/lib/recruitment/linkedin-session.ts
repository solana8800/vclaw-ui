/** Dữ liệu lưu trong ~/.openclaw/workspace/linkedin-session.json */
export type LinkedInSessionFile = {
  cookie?: string;
  userAgent?: string;
  profile?: {
    name?: string;
    headline?: string;
    username?: string;
    avatarUrl?: string;
    url?: string;
    savedAt?: string;
  };
};

export type LinkedInSessionSummary = {
  hasLiAt: boolean;
  username: string | null;
  displayName: string | null;
  headline: string | null;
  profileUrl: string | null;
  avatarUrl: string | null;
};

export function cookieValue(cookieStr: string, name: string): string | null {
  const match = cookieStr.match(new RegExp(`(?:^|;\\s*)${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}=([^;]*)`));
  if (!match?.[1]) return null;
  try {
    return decodeURIComponent(match[1].replace(/^"|"$/g, ""));
  } catch {
    return match[1];
  }
}

export function parseLinkedInSessionFile(raw: string): LinkedInSessionFile | null {
  if (!raw?.trim()) return null;
  try {
    const parsed = JSON.parse(raw) as LinkedInSessionFile;
    if (!parsed || typeof parsed !== "object") return null;
    return parsed;
  } catch {
    return null;
  }
}

export function summarizeLinkedInSession(
  session: LinkedInSessionFile | null | undefined,
): LinkedInSessionSummary {
  const empty: LinkedInSessionSummary = {
    hasLiAt: false,
    username: null,
    displayName: null,
    headline: null,
    profileUrl: null,
    avatarUrl: null,
  };
  if (!session?.cookie) return empty;

  const hasLiAt = session.cookie.includes("li_at=");
  if (!hasLiAt) return empty;

  const username = session.profile?.username?.trim() || null;

  const name = session.profile?.name?.trim();
  const displayName = name && name !== "N/A" ? name : null;
  const headline = session.profile?.headline?.trim();
  const headlineClean =
    headline && headline !== "N/A" ? headline : null;

  let profileUrl = session.profile?.url?.trim() || null;

  return {
    hasLiAt: true,
    username,
    displayName,
    headline: headlineClean,
    profileUrl,
    avatarUrl: session.profile?.avatarUrl?.trim() || null,
  };
}

/** Nhãn hiển thị trên UI — ưu tiên tên, rồi @username */
export function sessionDisplayLabel(
  summary: LinkedInSessionSummary | null | undefined,
  fallback = "",
): string {
  if (!summary?.hasLiAt) return fallback;
  if (summary.displayName) return summary.displayName;
  if (summary.username) return `@${summary.username}`;
  return fallback;
}
