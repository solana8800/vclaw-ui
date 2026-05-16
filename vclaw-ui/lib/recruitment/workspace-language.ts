import { getShopSettings } from "@/lib/actions/shop-settings-actions";

export type WorkspaceLanguage = "vi" | "en";

export function normalizeWorkspaceLanguage(raw?: string | null): WorkspaceLanguage {
  const code = raw?.trim().toLowerCase();
  if (code === "en" || code?.startsWith("en")) return "en";
  return "vi";
}

export async function getWorkspaceLanguage(): Promise<WorkspaceLanguage> {
  const settings = await getShopSettings();
  return normalizeWorkspaceLanguage(settings?.language);
}

export function defaultRecruitmentLocation(lang: WorkspaceLanguage): string {
  return lang === "en" ? "Vietnam" : "Việt Nam";
}
