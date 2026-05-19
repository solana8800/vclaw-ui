import { cn } from "@/lib/shared";

const pillBase =
  "inline-flex items-center whitespace-nowrap px-2 py-0.5 rounded-full text-[10px] font-medium border leading-none";

export function candidateStatusPill(className: string): string {
  return cn(pillBase, className);
}

export const candidateJdBadgeClass = {
  evaluated: "bg-emerald-50 text-emerald-800 border-emerald-200/90",
  unevaluated: "bg-slate-50 text-slate-600 border-dashed border-slate-300/90",
} as const;

export const candidateConnectionBadgeClass: Record<string, string> = {
  CONNECTED: "bg-sky-50 text-sky-800 border-sky-200/90",
  PENDING: "bg-amber-50 text-amber-900 border-amber-200/90",
  NOT_CONNECTED: "bg-orange-50/80 text-orange-900/90 border-orange-200/80",
  UNKNOWN: "bg-slate-50/90 text-slate-500 border-slate-200/80",
};

export const candidateSourceBadgeClass: Record<string, string> = {
  LINKEDIN_INBOX: "bg-violet-50 text-violet-800 border-violet-200/90",
  LINKEDIN_SEARCH: "bg-[#0a66c2]/10 text-[#0a66c2] border-[#0a66c2]/30",
  default: "bg-[color:var(--surface-soft)] text-[color:var(--foreground-muted)] border-[color:var(--line)]",
};

export const candidateLinkedInProfileBadgeClass = {
  scraped: "bg-[#0a66c2]/12 text-[#0a66c2] border-[#0a66c2]/35",
  urlOnly: "bg-amber-50 text-amber-900 border-amber-200/90 border-dashed",
  resume: "bg-indigo-50 text-indigo-800 border-indigo-200/90",
} as const;

export type LinkedInOutreachMode = "message" | "connect" | "pending" | "none";

export function resolveLinkedInOutreachMode(
  connectionStatus: string | null | undefined,
  profileUrl: string | null | undefined,
  isLinkedInUrl: (url?: string | null) => boolean,
): LinkedInOutreachMode {
  if (!isLinkedInUrl(profileUrl)) return "none";
  if (connectionStatus === "CONNECTED") return "message";
  if (connectionStatus === "PENDING") return "pending";
  return "connect";
}
