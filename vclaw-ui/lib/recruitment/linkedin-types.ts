export type LinkedInProfile = {
  success?: boolean;
  loggedIn?: boolean;
  name?: string;
  headline?: string;
  about?: string;
  url?: string;
  avatarUrl?: string;
  sessionCookie?: string | null;
  sessionData?: string | null;
  sessionFile?: string | null;
  error?: string;
};

export type LinkedInConnectionStatus =
  | "disconnected"
  | "waiting_login"
  | "connected"
  | "error";

export function isLinkedInProfileLoggedIn(
  profile: LinkedInProfile | null | undefined,
): boolean {
  if (!profile) return false;
  if (profile.success === false || profile.loggedIn === false) return false;
  if (profile.sessionCookie) return true;
  if (profile.loggedIn === true) return true;
  const name = profile.name?.trim();
  return Boolean(name && name !== "N/A");
}

export function profileDisplayName(profile: LinkedInProfile | null | undefined): string {
  if (!profile) return "";
  const name = profile.name?.trim();
  if (name && name !== "N/A") return name;
  return "";
}

export function profileInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export function hasLinkedInSession(sessionData: string | null | undefined): boolean {
  if (!sessionData?.trim()) return false;
  try {
    const parsed = JSON.parse(sessionData) as { cookie?: string };
    return Boolean(parsed.cookie?.includes("li_at="));
  } catch {
    return sessionData.includes("li_at=");
  }
}
