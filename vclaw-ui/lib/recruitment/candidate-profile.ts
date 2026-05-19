import type {
  ExtractedProfileInfo,
  LinkedInConnectionStatus,
  LinkedInProfileScrape,
  SaveCandidateInput,
} from "@/lib/recruitment/candidate-types";

export function normalizeConnectionStatus(
  raw: string | undefined,
): LinkedInConnectionStatus {
  if (!raw) return "UNKNOWN";
  const u = raw.toUpperCase();
  if (u === "CONNECTED" || u === "PENDING" || u === "NOT_CONNECTED") return u;
  return "UNKNOWN";
}

export function parseCompanyFromHeadline(headline?: string | null): string | undefined {
  if (!headline) return undefined;
  const at = headline.match(/\bat\s+(.+?)(?:\s*[|·•]|$)/i);
  if (at?.[1]) return at[1].trim();
  const tai = headline.match(/tại\s+(.+?)(?:\s*[|·•]|$)/i);
  if (tai?.[1]) return tai[1].trim();
  return undefined;
}

function normalizeStringList(raw: unknown, max = 20): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((x): x is string => typeof x === "string" && x.trim().length > 0)
    .map((x) => x.trim())
    .slice(0, max);
}

function mergeStringLists(a: string[] = [], b: string[] = [], max = 20): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of [...a, ...b]) {
    const key = item.trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(key);
    if (out.length >= max) break;
  }
  return out;
}

export function hasExtractedProfileContent(info: ExtractedProfileInfo): boolean {
  if (info.about && info.about !== "N/A" && info.about.trim()) return true;
  return (
    (info.experiences?.length ?? 0) > 0 ||
    (info.education?.length ?? 0) > 0 ||
    (info.skills?.length ?? 0) > 0 ||
    (info.projects?.length ?? 0) > 0 ||
    (info.languages?.length ?? 0) > 0 ||
    (info.recommendations?.length ?? 0) > 0
  );
}

export function parseExtractedProfileInfo(raw: string | null | undefined): ExtractedProfileInfo {
  if (!raw?.trim()) return {};
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const aboutRaw = parsed.about;
    const about =
      typeof aboutRaw === "string" && aboutRaw !== "N/A"
        ? normalizeLinkedInAboutText(aboutRaw)
        : typeof aboutRaw === "string"
          ? aboutRaw
          : null;
    const conn = parsed.connectionStatus;
    const loc = parsed.location;
    return {
      about,
      location: typeof loc === "string" && loc !== "N/A" ? loc.trim() : null,
      experiences: normalizeStringList(parsed.experiences, 25),
      education: normalizeStringList(parsed.education, 15),
      skills: normalizeStringList(parsed.skills, 40),
      projects: normalizeStringList(parsed.projects, 15),
      languages: normalizeStringList(parsed.languages, 20),
      recommendations: normalizeStringList(parsed.recommendations, 10),
      avatarUrl: typeof parsed.avatarUrl === "string" ? parsed.avatarUrl : null,
      connectionStatus:
        typeof conn === "string" ? normalizeConnectionStatus(conn) : undefined,
      scrapedAt: typeof parsed.scrapedAt === "string" ? parsed.scrapedAt : undefined,
    };
  } catch {
    return { about: normalizeLinkedInAboutText(raw) };
  }
}

/** Gộp extractedInfo cũ + scrape mới — giữ dữ liệu đã có nếu scrape thiếu. */
export function mergeExtractedInfoJson(
  existing: string | null | undefined,
  profile: LinkedInProfileScrape,
): string {
  const prev = parseExtractedProfileInfo(existing);
  const fresh = parseExtractedProfileInfo(buildExtractedInfoJson(profile));

  const about =
    fresh.about && fresh.about !== "N/A"
      ? fresh.about
      : prev.about && prev.about !== "N/A"
        ? prev.about
        : null;

  const location =
    fresh.location && fresh.location !== "N/A"
      ? fresh.location
      : prev.location && prev.location !== "N/A"
        ? prev.location
        : profile.location && profile.location !== "N/A"
          ? profile.location
          : null;

  return JSON.stringify({
    about,
    location,
    experiences: mergeStringLists(prev.experiences, fresh.experiences, 25),
    education: mergeStringLists(prev.education, fresh.education, 15),
    skills: mergeStringLists(prev.skills, fresh.skills, 40),
    projects: mergeStringLists(prev.projects, fresh.projects, 15),
    languages: mergeStringLists(prev.languages, fresh.languages, 20),
    recommendations: mergeStringLists(prev.recommendations, fresh.recommendations, 10),
    avatarUrl: fresh.avatarUrl || prev.avatarUrl || null,
    connectionStatus:
      profile.connectionStatus ?? fresh.connectionStatus ?? prev.connectionStatus,
    scrapedAt: new Date().toISOString(),
  });
}

export function buildExtractedInfoJson(profile: LinkedInProfileScrape): string {
  const about =
    profile.about && profile.about !== "N/A"
      ? normalizeLinkedInAboutText(profile.about)
      : profile.about;
  return JSON.stringify({
    about,
    location:
      profile.location && profile.location !== "N/A" ? profile.location.trim() : null,
    experiences: normalizeStringList(profile.experiences, 25),
    education: normalizeStringList(profile.education, 15),
    skills: normalizeStringList(profile.skills, 40),
    projects: normalizeStringList(profile.projects, 15),
    languages: normalizeStringList(profile.languages, 20),
    recommendations: normalizeStringList(profile.recommendations, 10),
    avatarUrl: profile.avatarUrl,
    connectionStatus: profile.connectionStatus,
    scrapedAt: new Date().toISOString(),
  });
}

export function mergeProfileIntoSaveInput(
  base: SaveCandidateInput,
  profile: LinkedInProfileScrape | null,
  existingExtractedInfo?: string | null,
): SaveCandidateInput {
  if (!profile?.success) return base;

  return {
    ...base,
    name: profile.name && profile.name !== "N/A" ? profile.name : base.name,
    headline:
      profile.headline && profile.headline !== "N/A" ? profile.headline : base.headline,
    profileUrl: profile.url?.includes("/in/") ? profile.url.split("?")[0] : base.profileUrl,
    linkedinProfileIdUrl: profile.profileIdUrl?.includes("/in/")
      ? profile.profileIdUrl.split("?")[0]
      : base.linkedinProfileIdUrl,
    location:
      profile.location && profile.location !== "N/A"
        ? profile.location.trim()
        : base.location,
    linkedinConnectionStatus:
      profile.connectionStatus ?? base.linkedinConnectionStatus,
    currentCompany:
      parseCompanyFromHeadline(profile.headline) ?? base.currentCompany,
    extractedInfo: mergeExtractedInfoJson(existingExtractedInfo ?? base.extractedInfo, profile),
  };
}

export function labelsToJson(labels?: string[]): string | null {
  if (!labels?.length) return null;
  return JSON.stringify(labels);
}

/** LinkedIn scrape thường còn nút "…see more" trong text — làm sạch trước khi hiển thị. */
export function normalizeLinkedInAboutText(raw: string): string {
  return raw
    .replace(/\u2026\s*see more/gi, "")
    .replace(/\.\.\.\s*see more/gi, "")
    .replace(/\s*…\s*see more/gi, "")
    .replace(/\s*see more\s*$/gim, "")
    .replace(/\s*xem thêm\s*$/gim, "")
    .replace(/\s*…\s*$/g, "")
    .trim();
}

export function parseLabelsJson(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((x): x is string => typeof x === "string")
      : [];
  } catch {
    return [];
  }
}

/** Map hàng DB → input lưu/enrich. */
export type CandidateRowLike = {
  name: string;
  headline?: string | null;
  profileUrl?: string | null;
  linkedinProfileIdUrl?: string | null;
  location?: string | null;
  jobPositionId?: string | null;
  workspaceId?: string | null;
  extractedInfo?: string | null;
  githubUrl?: string | null;
  portfolioUrl?: string | null;
  currentCompany?: string | null;
  linkedinConnectionStatus?: string | null;
  matchScore?: number | null;
  matchSummary?: string | null;
  aiAnalysisSummary?: string | null;
  source?: string | null;
  linxaChatId?: string | null;
  sentiment?: string | null;
  labels?: string | null;
};

export function candidateRowToSaveInput(row: CandidateRowLike): SaveCandidateInput {
  return {
    name: row.name,
    headline: row.headline ?? undefined,
    profileUrl: row.profileUrl ?? "",
    linkedinProfileIdUrl: row.linkedinProfileIdUrl ?? undefined,
    location: row.location ?? undefined,
    jobPositionId: row.jobPositionId ?? undefined,
    workspaceId: row.workspaceId ?? undefined,
    extractedInfo: row.extractedInfo ?? undefined,
    githubUrl: row.githubUrl ?? undefined,
    portfolioUrl: row.portfolioUrl ?? undefined,
    currentCompany: row.currentCompany ?? undefined,
    linkedinConnectionStatus: row.linkedinConnectionStatus
      ? normalizeConnectionStatus(row.linkedinConnectionStatus)
      : undefined,
    matchScore: row.matchScore ?? null,
    matchSummary: row.matchSummary ?? null,
    aiAnalysisSummary: row.aiAnalysisSummary ?? undefined,
    source: (row.source as SaveCandidateInput["source"]) ?? undefined,
    linxaChatId: row.linxaChatId ?? undefined,
    sentiment: row.sentiment ?? undefined,
    labels: row.labels ? parseLabelsJson(row.labels) : undefined,
  };
}

export function buildSaveInputFromSearchHit(
  item: {
    name: string;
    headline?: string;
    profile_url: string;
    profile_id_url?: string | null;
    location?: string;
    matchScore?: number | null;
    matchSummary?: string | null;
  },
  jobPositionId?: string,
): SaveCandidateInput {
  return {
    name: item.name?.trim() || "Ứng viên",
    headline: item.headline,
    profileUrl: item.profile_url.split("?")[0],
    linkedinProfileIdUrl: item.profile_id_url ?? undefined,
    location: item.location,
    jobPositionId,
    matchScore: item.matchScore ?? null,
    matchSummary: item.matchSummary ?? null,
    source: "LINKEDIN_SEARCH",
  };
}
