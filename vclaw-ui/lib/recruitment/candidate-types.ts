/** Kết quả scrape từ LinkedIn People search (head-hunter). */
export type LinkedInSearchHit = {
  name: string;
  headline?: string;
  profile_url: string;         // slug URL: /in/que-le-ta/
  profile_id_url?: string | null; // ID URL: /in/ACoAAC.../
  location?: string;
  matchScore?: number | null;
  matchSummary?: string | null;
};

export type LinkedInConnectionStatus =
  | "NOT_CONNECTED"
  | "PENDING"
  | "CONNECTED"
  | "UNKNOWN";

export type CandidateSource = "LINKEDIN_SEARCH" | "LINKEDIN_INBOX" | "RESUME" | "MANUAL";

/** URL profile LinkedIn thật (có thể gửi tin qua CDP). */
export function isLinkedInProfileUrl(url?: string | null): boolean {
  const trimmed = url?.trim();
  if (!trimmed || trimmed.startsWith("linkedin://")) return false;
  if (/^\/in\/[^/?#]+\/?$/i.test(trimmed)) return true;
  try {
    const parsed = new URL(trimmed);
    const hostname = parsed.hostname.toLowerCase();
    return (
      (hostname === "linkedin.com" || hostname === "www.linkedin.com") &&
      /^\/in\/[^/?#]+\/?$/i.test(parsed.pathname)
    );
  } catch {
    return false;
  }
}

export type LinkedInProfileScrape = {
  success?: boolean;
  name?: string;
  headline?: string;
  about?: string;
  location?: string;
  experiences?: string[];
  education?: string[];
  skills?: string[];
  projects?: string[];
  languages?: string[];
  recommendations?: string[];
  url?: string;
  profileIdUrl?: string; // ID URL: /in/ACoAAC.../
  avatarUrl?: string;
  connectionStatus?: LinkedInConnectionStatus;
  error?: string;
};

export type ExtractedProfileInfo = {
  about?: string | null;
  location?: string | null;
  experiences?: string[];
  education?: string[];
  skills?: string[];
  projects?: string[];
  languages?: string[];
  recommendations?: string[];
  avatarUrl?: string | null;
  connectionStatus?: LinkedInConnectionStatus;
  scrapedAt?: string;
};

export type SaveCandidateInput = {
  name: string;
  headline?: string;
  profileUrl: string;
  linkedinProfileIdUrl?: string | null; // ID URL: /in/ACoAAC.../
  location?: string;
  jobPositionId?: string;
  workspaceId?: string;
  matchScore?: number | null;
  matchSummary?: string | null;
  aiAnalysisSummary?: string;
  chatInfo?: string;
  conversationHistory?: string;
  linkedinConnectionStatus?: LinkedInConnectionStatus;
  extractedInfo?: string;
  githubUrl?: string;
  portfolioUrl?: string;
  currentCompany?: string;
  source?: CandidateSource;
  linkedinChatId?: string;
  sentiment?: string;
  labels?: string[];
};

/** Dữ liệu tối thiểu hiển thị sheet chi tiết — lấy từ hàng bảng trước khi fetch nền. */
export type CandidateDetailSnapshot = {
  id: string;
  name: string;
  headline?: string | null;
  location?: string | null;
  currentCompany?: string | null;
  profileUrl?: string | null;
  linkedinProfileIdUrl?: string | null;
  matchScore?: number | null;
  matchSummary?: string | null;
  linkedinConnectionStatus?: string | null;
  sentiment?: string | null;
  source?: string | null;
  labels?: string | null;
  extractedInfo?: string | null;
  aiAnalysisSummary?: string | null;
  recruiterNotes?: string | null;
  email?: string | null;
  phone?: string | null;
  cvText?: string | null;
  cvFileUrl?: string | null;
  linkedinChatId?: string | null;
  chatInfo?: string | null;
  conversationHistory?: string | null;
  jobPositionId?: string | null;
  jobPosition?: { id: string; title: string; summary?: string | null; description?: string | null } | null;
  updatedAt: string | Date;
};

type RowForDetailSnapshot = {
  id: string;
  name: string;
  headline?: string | null;
  location?: string | null;
  currentCompany?: string | null;
  profileUrl?: string | null;
  linkedinProfileIdUrl?: string | null;
  matchScore?: number | null;
  matchSummary?: string | null;
  linkedinConnectionStatus?: string | null;
  sentiment?: string | null;
  source?: string | null;
  labels?: string | null;
  extractedInfo?: string | null;
  aiAnalysisSummary?: string | null;
  recruiterNotes?: string | null;
  email?: string | null;
  phone?: string | null;
  cvText?: string | null;
  cvFileUrl?: string | null;
  linkedinChatId?: string | null;
  chatInfo?: string | null;
  conversationHistory?: string | null;
  jobPositionId?: string | null;
  jobPosition?: { id: string; title: string; description?: string | null; summary?: string | null } | null;
  updatedAt: string | Date;
};

export function mapRowToDetailSnapshot(row: RowForDetailSnapshot): CandidateDetailSnapshot {
  return {
    id: row.id,
    name: row.name,
    headline: row.headline ?? null,
    location: row.location ?? null,
    currentCompany: row.currentCompany ?? null,
    profileUrl: row.profileUrl ?? null,
    linkedinProfileIdUrl: row.linkedinProfileIdUrl ?? null,
    matchScore: row.matchScore ?? null,
    matchSummary: row.matchSummary ?? null,
    linkedinConnectionStatus: row.linkedinConnectionStatus ?? null,
    sentiment: row.sentiment ?? null,
    source: row.source ?? null,
    labels: row.labels ?? null,
    extractedInfo: row.extractedInfo ?? null,
    aiAnalysisSummary: row.aiAnalysisSummary ?? null,
    recruiterNotes: row.recruiterNotes ?? null,
    email: row.email ?? null,
    phone: row.phone ?? null,
    cvText: row.cvText ?? null,
    cvFileUrl: row.cvFileUrl ?? null,
    linkedinChatId: row.linkedinChatId ?? null,
    chatInfo: row.chatInfo ?? null,
    conversationHistory: row.conversationHistory ?? null,
    jobPositionId: row.jobPositionId ?? null,
    jobPosition: row.jobPosition
      ? {
        id: row.jobPosition.id,
        title: row.jobPosition.title,
        summary: row.jobPosition.summary ?? row.jobPosition.description ?? null
      }
      : null,
    updatedAt: row.updatedAt,
  };
}
