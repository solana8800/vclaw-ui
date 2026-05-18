"use server";

// Server actions gọi Gateway Bridge để thực hiện automation LinkedIn
// Gateway chạy Playwright/CDP → trình duyệt thật → LinkedIn

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getRecruitmentSettings } from "@/lib/actions/recruitment-settings-actions";
import {
  buildLinkedInSearchQueryFromJob,
  normalizeUserSearchQuery,
  resolveLinkedInSearchQueryForJob,
} from "@/lib/recruitment/candidate-search-query";
import { scoreCandidatesAgainstJob } from "@/lib/recruitment/candidate-match";
import {
  extractLinxaConversations,
  mapLinxaConversationToCandidate,
  type LinxaConversationRaw,
} from "@/lib/recruitment/linxa-conversation-map";
import {
  labelsToJson,
  mergeProfileIntoSaveInput,
  normalizeConnectionStatus,
} from "@/lib/recruitment/candidate-profile";
import type {
  LinkedInProfileScrape,
  LinkedInSearchHit,
} from "@/lib/recruitment/candidate-types";
import { getWorkspaceLanguage } from "@/lib/recruitment/workspace-language";
import {
  type LinkedInProfile,
  isLinkedInProfileLoggedIn,
} from "@/lib/recruitment/linkedin-types";
import {
  type LinkedInSessionSummary,
  parseLinkedInSessionFile,
  summarizeLinkedInSession,
} from "@/lib/recruitment/linkedin-session";

const LINKEDIN_SESSION_FILE = path.join(
  os.homedir(),
  ".openclaw",
  "workspace",
  "linkedin-session.json",
);

export type { LinkedInProfile } from "@/lib/recruitment/linkedin-types";

const GATEWAY_URL = process.env.OPENCLAW_GATEWAY_URL || "http://127.0.0.1:3001";
const GATEWAY_TOKEN =
  process.env.OPENCLAW_GATEWAY_TOKEN || "62b791625fa441be036acd3c206b7e14e2bb13c803355823";
const CDP_URL = process.env.LINKEDIN_CDP_URL || "http://127.0.0.1:9222";

async function checkCdpReady(): Promise<boolean> {
  try {
    const base = CDP_URL.replace(/\/$/, "");
    const res = await fetch(`${base}/json/version`, {
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return false;
    const data = (await res.json()) as { webSocketDebuggerUrl?: string };
    return Boolean(data.webSocketDebuggerUrl);
  } catch {
    return false;
  }
}

async function checkGatewayReady(): Promise<boolean> {
  try {
    const res = await fetch(`${GATEWAY_URL}/tools/invoke`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${GATEWAY_TOKEN}`,
      },
      body: JSON.stringify({ tool: "head-hunter", action: "get_session", args: {} }),
      signal: AbortSignal.timeout(5000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function callGatewayTool(tool: string, action: string, payload: Record<string, unknown>) {
  // Lấy token từ database
  const settings = await getRecruitmentSettings();
  const linxaToken = settings?.linxaToken;

  const nestedArgs =
    payload.args && typeof payload.args === "object" && !Array.isArray(payload.args)
      ? (payload.args as Record<string, unknown>)
      : {};
  const jobPositionId =
    typeof payload.jobPositionId === "string"
      ? payload.jobPositionId
      : typeof nestedArgs.jobPositionId === "string"
        ? nestedArgs.jobPositionId
        : undefined;

  const res = await fetch(`${GATEWAY_URL}/tools/invoke`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${GATEWAY_TOKEN}`,
    },
    body: JSON.stringify({
      tool,
      action,
      args: {
        ...nestedArgs,
        ...(jobPositionId ? { jobPositionId } : {}),
        ...((linxaToken || process.env.LINXA_TOKEN)
          ? { linxaToken: linxaToken || process.env.LINXA_TOKEN }
          : {}),
      },
      linxaToken: linxaToken || process.env.LINXA_TOKEN,
    }),
  });
  if (!res.ok) throw new Error(`Gateway lỗi ${res.status}: ${await res.text()}`);
  return res.json();
}

function normalizeSearchHits(data: unknown): LinkedInSearchHit[] {
  if (!Array.isArray(data)) return [];
  return data
    .filter((c): c is Record<string, unknown> => Boolean(c && typeof c === "object"))
    .map((c) => ({
      name: String(c.name ?? "Ứng viên"),
      headline: typeof c.headline === "string" ? c.headline : undefined,
      profile_url: String(c.profile_url ?? c.profileUrl ?? ""),
      location: typeof c.location === "string" ? c.location : undefined,
    }))
    .filter((c) => c.profile_url.includes("/in/"));
}

/** Gợi ý từ khóa tìm LinkedIn từ JD (AI, fallback ngắn). */
export async function suggestLinkedInSearchQuery(jobPositionId: string) {
  const job = await prisma.jobPosition.findUnique({ where: { id: jobPositionId } });
  if (!job) {
    return { success: false as const, error: "Không tìm thấy vị trí tuyển dụng.", query: "" };
  }
  const locale = await getWorkspaceLanguage();
  const resolved = await resolveLinkedInSearchQueryForJob(job, locale);
  return {
    success: true as const,
    query: resolved.query,
    source: resolved.source,
  };
}

/** Lấy profile LinkedIn qua CDP (một URL). */
export async function fetchLinkedInProfileByUrl(
  profileUrl: string,
): Promise<LinkedInProfileScrape | null> {
  try {
    const result = await callGatewayTool("head-hunter", "get_profile", {
      args: { url: profileUrl },
    });
    const data = result.result?.data as LinkedInProfileScrape | null;
    if (!data || data.success === false) return null;
    if (data.connectionStatus) {
      data.connectionStatus = normalizeConnectionStatus(data.connectionStatus);
    }
    return data;
  } catch {
    return null;
  }
}

/** Tìm ứng viên LinkedIn — không ghi DB; trả preview + điểm khớp JD. */
export async function searchLinkedInCandidates(
  jobPositionId?: string,
  queryOverride?: string,
) {
  try {
    const settings = await getRecruitmentSettings();
    const locale = await getWorkspaceLanguage();

    let job: Awaited<ReturnType<typeof prisma.jobPosition.findUnique>> = null;
    if (jobPositionId) {
      job = await prisma.jobPosition.findUnique({ where: { id: jobPositionId } });
      if (!job) {
        return { success: false, error: "Không tìm thấy vị trí tuyển dụng.", results: [], query: "" };
      }
    }

    let query = "";
    let querySource: "ai" | "fallback" | "user" = "user";

    if (queryOverride?.trim()) {
      query = normalizeUserSearchQuery(queryOverride.trim(), locale);
      querySource = "user";
    } else if (job) {
      const resolved = await resolveLinkedInSearchQueryForJob(job, locale);
      query = resolved.query;
      querySource = resolved.source;
    }

    if (!query) {
      return {
        success: false,
        error: "Chọn vị trí tuyển dụng hoặc nhập từ khóa tìm kiếm.",
        results: [],
        query: "",
      };
    }

    const result = await callGatewayTool("head-hunter", "linkedin_search", {
      args: { query, jobPositionId: jobPositionId || null },
    });
    const hits = normalizeSearchHits(result.result?.data);

    if (!result.ok) {
      return {
        success: false,
        results: [],
        query,
        error: result.error || "Lỗi Gateway",
      };
    }

    let scored = hits;
    if (job && hits.length > 0) {
      scored = await scoreCandidatesAgainstJob(job, hits, locale);
    }

    return {
      success: true,
      results: scored,
      count: scored.length,
      query,
      querySource,
      jobPositionId: jobPositionId ?? null,
      error: undefined,
    };
  } catch (err) {
    return { success: false, error: String(err), results: [], query: "" };
  }
}

/** Lấy danh sách hội thoại Linxa qua HTTPS API (Bearer token) — không dùng Chrome CDP. */
export async function fetchLinxaConversationsForImport(limit = 50) {
  const settings = await getRecruitmentSettings();
  const token = settings?.linxaToken || process.env.LINXA_TOKEN;
  if (!token) {
    return {
      success: false as const,
      error: "Thiếu LINXA_TOKEN — cấu hình tại Cài đặt tuyển dụng.",
      conversations: [] as LinxaConversationRaw[],
    };
  }

  const { listLinxaConversations } = await import("@/lib/recruitment/linxa-client");
  const linxa = await listLinxaConversations(token, limit);
  if (!linxa.ok) {
    return { success: false as const, error: linxa.error, conversations: [] as LinxaConversationRaw[] };
  }
  return { success: true as const, conversations: linxa.conversations, error: undefined };
}

export type FetchCandidateLinxaChatResult =
  | {
      success: true;
      messages: import("@/lib/recruitment/linxa-message-map").LinxaChatMessage[];
      source: "linxa_api" | "db_history" | "db_preview";
      linxaInboxUrl: string;
    }
  | { success: false; error: string };

/** Đọc tin nhắn hội thoại Linxa của ứng viên (MCP API), fallback lịch sử đã lưu DB. */
export async function fetchCandidateLinxaChatMessages(
  candidateId: string,
): Promise<FetchCandidateLinxaChatResult> {
  const { resolveLinxaChatId } = await import("@/lib/recruitment/linxa-chat-id");
  const {
    extractLinxaChatMessages,
    parseStoredLinxaConversationHistory,
    refineLinxaMessageDirections,
  } = await import("@/lib/recruitment/linxa-message-map");
  const { getLinxaMessages } = await import("@/lib/recruitment/linxa-client");
  const { buildLinxaSmartInboxUrl } = await import("@/lib/recruitment/linxa-inbox-url");

  const candidate = await prisma.candidate.findUnique({
    where: { id: candidateId },
    select: {
      name: true,
      linxaChatId: true,
      profileUrl: true,
      chatInfo: true,
      conversationHistory: true,
    },
  });
  if (!candidate) {
    return { success: false, error: "Không tìm thấy ứng viên." };
  }

  const refine = (messages: import("@/lib/recruitment/linxa-message-map").LinxaChatMessage[]) =>
    refineLinxaMessageDirections(messages, candidate.name);

  const chatId = resolveLinxaChatId(candidate.linxaChatId, candidate.profileUrl);
  const inboxUrl = buildLinxaSmartInboxUrl(chatId);

  if (!chatId) {
    const stored = parseStoredLinxaConversationHistory(candidate.conversationHistory);
    if (stored.length > 0) {
      return { success: true, messages: refine(stored), source: "db_history", linxaInboxUrl: inboxUrl };
    }
    const preview = candidate.chatInfo?.trim();
    if (preview) {
      return {
        success: true,
        messages: refine([
          {
            id: "preview",
            text: preview,
            sentAt: null,
            direction: "inbound",
          },
        ]),
        source: "db_preview",
        linxaInboxUrl: inboxUrl,
      };
    }
    return {
      success: false,
      error: "Ứng viên chưa liên kết hội thoại Linxa (import từ Smart Inbox).",
    };
  }

  const settings = await getRecruitmentSettings();
  const token = settings?.linxaToken || process.env.LINXA_TOKEN;
  if (!token) {
    return {
      success: false,
      error: "Thiếu LINXA_TOKEN — cấu hình tại Cài đặt tuyển dụng.",
    };
  }

  const api = await getLinxaMessages(token, chatId);
  if (api.ok) {
    const fromApi = extractLinxaChatMessages(api.data);
    if (fromApi.length > 0) {
      return { success: true, messages: refine(fromApi), source: "linxa_api", linxaInboxUrl: inboxUrl };
    }
  }

  const stored = parseStoredLinxaConversationHistory(candidate.conversationHistory);
  if (stored.length > 0) {
    return { success: true, messages: refine(stored), source: "db_history", linxaInboxUrl: inboxUrl };
  }

  const preview = candidate.chatInfo?.trim();
  if (preview) {
    return {
      success: true,
      messages: refine([{ id: "preview", text: preview, sentAt: null, direction: "inbound" }]),
      source: "db_preview",
      linxaInboxUrl: inboxUrl,
    };
  }

  if (!api.ok) {
    return { success: false, error: api.error };
  }

  return { success: true, messages: [], source: "linxa_api", linxaInboxUrl: inboxUrl };
}

export type SaveOneLinxaResult =
  | { success: true; name: string; created: boolean }
  | { success: false; skipped: true; reason: string }
  | { success: false; skipped: false; error: string };

/** Lưu một hội thoại Linxa vào DB ngay (mặc định không enrich CDP — nhanh). */
export async function saveOneLinxaConversation(
  conversation: LinxaConversationRaw,
  jobPositionId?: string,
  options?: { enrichProfile?: boolean },
): Promise<SaveOneLinxaResult> {
  try {
    const mapped = mapLinxaConversationToCandidate(conversation, jobPositionId);
    if (!mapped) {
      return {
        success: false,
        skipped: true,
        reason: "Thiếu chatId và link LinkedIn.",
      };
    }

    const { upsertCandidateRecord, revalidateCandidatesPage } = await import(
      "@/lib/recruitment/candidate-persistence"
    );

    let toSave = mapped;
    const isRealLinkedIn =
      mapped.profileUrl.includes("linkedin.com/in/") ||
      mapped.profileUrl.includes("linkedin.com/profile/");

    if (options?.enrichProfile && isRealLinkedIn) {
      const cdpOk = await checkCdpReady();
      if (cdpOk) {
        const profile = await fetchLinkedInProfileByUrl(mapped.profileUrl);
        if (profile) {
          toSave = mergeProfileIntoSaveInput(mapped, profile);
        }
      }
    }

    const existing = await prisma.candidate.findUnique({
      where: { profileUrl: toSave.profileUrl },
      select: { id: true },
    });

    await upsertCandidateRecord(toSave);
    revalidateCandidatesPage();

    return {
      success: true,
      name: toSave.name,
      created: !existing,
    };
  } catch (err) {
    return {
      success: false,
      skipped: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/** Đồng bộ hội thoại Linxa → DB (batch, không enrich CDP). UI nên gọi saveOneLinxaConversation từng dòng. */
export async function syncLinkedInCandidates(jobPositionId?: string) {
  try {
    const listed = await fetchLinxaConversationsForImport(50);
    if (!listed.success) {
      return {
        success: false,
        saved: 0,
        enriched: 0,
        fetched: 0,
        skipped: 0,
        error: listed.error,
      };
    }

    let saved = 0;
    let skipped = 0;

    for (const conv of listed.conversations) {
      const one = await saveOneLinxaConversation(conv, jobPositionId, { enrichProfile: false });
      if (one.success) saved++;
      else if (one.skipped) skipped++;
    }

    return {
      success: true,
      saved,
      enriched: 0,
      fetched: listed.conversations.length,
      skipped,
      count: saved,
      error: undefined,
    };
  } catch (err) {
    return {
      success: false,
      saved: 0,
      enriched: 0,
      fetched: 0,
      skipped: 0,
      error: String(err),
      count: 0,
    };
  }
}

// Đăng bài marketing LinkedIn (feed cá nhân hoặc Company Page) — không phải Job Post trả phí
export async function postJobToLinkedIn(params: {
  title: string;
  description: string;
  target: "personal" | "company";
  companyUrl?: string;
  jobPositionId?: string;
  imagePath?: string;
}) {
  const { validateLinkedInJobCopy } = await import("@/lib/recruitment/linkedin-job-copy");
  const copyCheck = validateLinkedInJobCopy(params.description);
  if (!copyCheck.ok) {
    return {
      success: false,
      postUrl: null,
      error: `Nội dung không hợp lệ để đăng LinkedIn: ${copyCheck.issues.join(" ")}`,
    };
  }

  let companyUrlForGateway = params.companyUrl;
  if (params.target === "company") {
    const settings = await getRecruitmentSettings();
    const { resolveLinkedInCompanyUrl } = await import("@/lib/recruitment/company-url");
    const normalized = resolveLinkedInCompanyUrl(
      settings?.linkedinCompanyUrl,
      params.companyUrl,
    ).replace(/\/+$/, "");
    if (!normalized.includes("linkedin.com/company/")) {
      return {
        success: false,
        postUrl: null,
        error: "Cần link Company Page hợp lệ (https://www.linkedin.com/company/...).",
      };
    }
    companyUrlForGateway = `${normalized}/`;
  }

  if (params.imagePath) {
    const { assertRecruitmentPostImagePath } = await import("@/lib/recruitment/linkedin-post-image");
    const imageCheck = assertRecruitmentPostImagePath(params.imagePath);
    if (!imageCheck.ok) {
      return { success: false, postUrl: null, error: imageCheck.error };
    }
  }

  try {
    const result = await callGatewayTool("head-hunter", "create_feed_post", {
      args: {
        title: params.title,
        description: params.description,
        target: params.target,
        companyUrl: params.target === "company" ? companyUrlForGateway ?? null : null,
        imagePath: params.imagePath ?? null,
        jobPositionId: params.jobPositionId || null,
      },
    });

    const data = result.result?.data;
    const postUrl = data?.postUrl ?? data?.jobUrl ?? null;
    const success = Boolean(result.ok && data?.success);

    // Lịch sử đăng được lưu qua recruitment-bridge → save_job_post (tránh ghi trùng).
    // Fallback khi bridge không gọi được API (gateway lỗi mạng nội bộ).
    if (success && params.jobPositionId) {
      try {
        const { recordLinkedInPost } = await import("@/lib/recruitment/linkedin-post-record");
        const recent = await prisma.jobLinkedInPost.findFirst({
          where: {
            jobPositionId: params.jobPositionId,
            postedAt: { gte: new Date(Date.now() - 15_000) },
          },
          orderBy: { postedAt: "desc" },
        });
        if (!recent) {
          await recordLinkedInPost({
            jobPositionId: params.jobPositionId,
            postUrl,
            title: params.title,
            target: params.target,
            companyUrl: params.target === "company" ? companyUrlForGateway : null,
            hasImage: Boolean(params.imagePath),
          });
        }
      } catch (err) {
        console.error("Không lưu được lịch sử đăng LinkedIn vào DB:", err);
      }
    }

    return {
      success,
      postUrl,
      jobUrl: postUrl,
      note: data?.note ?? null,
      error: result.ok ? (data?.error ?? undefined) : (result.error || "Lỗi Gateway"),
    };
  } catch (err) {
    return { success: false, error: String(err), postUrl: null, jobUrl: null };
  }
}

// Mở trình duyệt để người dùng đăng nhập LinkedIn
export async function openLinkedInBrowser() {
  try {
    const result = await callGatewayTool("head-hunter", "open_browser", {
      args: { url: "https://www.linkedin.com/login" }
    });
    return { success: result.ok, error: result.ok ? undefined : "Không thể mở trình duyệt" };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

/** Đọc session từ file local — không cần Gateway (để hiển thị trạng thái đăng nhập) */
export async function readLocalLinkedInSession() {
  try {
    if (!fs.existsSync(LINKEDIN_SESSION_FILE)) {
      return { success: false, sessionData: null, summary: null as LinkedInSessionSummary | null };
    }
    const sessionData = fs.readFileSync(LINKEDIN_SESSION_FILE, "utf-8");
    const parsed = parseLinkedInSessionFile(sessionData);
    const summary = summarizeLinkedInSession(parsed);
    return {
      success: summary.hasLiAt,
      sessionData,
      summary,
      sessionFile: LINKEDIN_SESSION_FILE,
    };
  } catch (err) {
    return {
      success: false,
      sessionData: null,
      summary: null as LinkedInSessionSummary | null,
      error: String(err),
    };
  }
}

function profileFromSessionSummary(summary: LinkedInSessionSummary): LinkedInProfile {
  return {
    success: true,
    loggedIn: true,
    name: summary.displayName || undefined,
    headline: summary.headline || undefined,
    url: summary.profileUrl || undefined,
    avatarUrl: summary.avatarUrl || undefined,
    sessionCookie: "from-file",
  };
}

// Kiểm tra CDP, Gateway và session file (dùng khi mount settings)
export async function checkLinkedInConnection() {
  const [cdpReady, gatewayReady, localSession] = await Promise.all([
    checkCdpReady(),
    checkGatewayReady(),
    readLocalLinkedInSession(),
  ]);

  let sessionExists = Boolean(localSession.success && localSession.summary?.hasLiAt);
  let sessionData = localSession.sessionData ?? null;
  let sessionSummary = localSession.summary ?? null;
  let profile: LinkedInProfile | null = null;

  if (sessionSummary?.hasLiAt) {
    profile = profileFromSessionSummary(sessionSummary);
  }

  if (gatewayReady) {
    if (!sessionExists) {
      try {
        const sessionRes = await getSavedLinkedInSession();
        if (sessionRes.success && sessionRes.sessionData) {
          sessionExists = true;
          sessionData = sessionRes.sessionData;
          sessionSummary = summarizeLinkedInSession(
            parseLinkedInSessionFile(sessionRes.sessionData),
          );
          if (sessionSummary.hasLiAt) {
            profile = profileFromSessionSummary(sessionSummary);
          }
        }
      } catch {
        /* giữ kết quả đọc local */
      }
    }

    if (cdpReady) {
      try {
        const profileRes = await getLinkedInProfile();
        if (profileRes.profile && isLinkedInProfileLoggedIn(profileRes.profile)) {
          profile = profileRes.profile;
        }
      } catch {
        /* giữ profile từ file session */
      }
    }
  }

  const loggedIn =
    isLinkedInProfileLoggedIn(profile) || Boolean(sessionSummary?.hasLiAt);

  return {
    cdpReady,
    gatewayReady,
    sessionExists,
    sessionData,
    sessionSummary,
    profile,
    loggedIn,
  };
}

// Lấy thông tin hồ sơ LinkedIn đang đăng nhập
export async function getLinkedInProfile() {
  try {
    const result = await callGatewayTool("head-hunter", "get_profile", { args: {} });
    const data = (result.result?.data || null) as LinkedInProfile | null;
    const loggedIn = isLinkedInProfileLoggedIn(data);
    return {
      success: result.ok && loggedIn,
      profile: data,
      loggedIn,
      sessionCookie: data?.sessionCookie || null,
      sessionData: data?.sessionData || null,
      sessionFile: data?.sessionFile || null,
      error: loggedIn
        ? undefined
        : data?.error || (result.ok ? "Chưa đăng nhập LinkedIn" : result.error || "Không lấy được hồ sơ"),
    };
  } catch (err) {
    return { success: false, loggedIn: false, error: String(err) };
  }
}

// Đọc session LinkedIn đã lưu từ file qua Gateway
export async function getSavedLinkedInSession() {
  try {
    const result = await callGatewayTool("head-hunter", "get_session", { args: {} });
    const data = result.result?.data;
    return { 
      success: result.ok && data?.success, 
      sessionData: data?.data || null, 
      sessionFile: data?.file || null,
      error: result.ok ? (data?.error ?? undefined) : "Lỗi kết nối Gateway"
    };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

// Lưu session LinkedIn vào file qua Gateway
export async function saveLinkedInSession(sessionData: string) {
  try {
    const result = await callGatewayTool("head-hunter", "save_session", { 
      args: { message: sessionData } // Dùng message làm phương tiện truyền data
    });
    const data = result.result?.data;
    return { 
      success: result.ok && data?.success, 
      sessionFile: data?.file || null,
      error: result.ok ? (data?.error ?? undefined) : "Lỗi kết nối Gateway"
    };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}
