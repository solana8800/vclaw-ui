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
  parseStoredLinxaConversationHistory,
  refineLinxaMessageDirections,
} from "@/lib/recruitment/linxa-message-map";
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
import {
  groupLinkedInInboundMessagesForAutoReply,
  type GroupedLinkedInInboxMessage,
} from "@/lib/recruitment/linkedin-inbox-grouping";

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

  // payload.args chứa args lồng (cách cũ); các prop top-level như url, threadId cũng phải đưa vào args
  const { args: payloadArgs, ...topLevelPayload } = payload;
  const nestedArgs =
    payloadArgs && typeof payloadArgs === "object" && !Array.isArray(payloadArgs)
      ? (payloadArgs as Record<string, unknown>)
      : {};
  // Merge: top-level props (url, threadId, ...) ghi đè nestedArgs nếu trùng key
  const mergedArgs = { ...nestedArgs, ...topLevelPayload };

  const jobPositionId =
    typeof mergedArgs.jobPositionId === "string" ? mergedArgs.jobPositionId : undefined;

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
        ...mergedArgs,
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
      profile_id_url: typeof c.profile_id_url === "string" ? c.profile_id_url : null,
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
  console.error(`[getProfile] Bắt đầu lấy profile: ${profileUrl}`);
  try {
    const result = await callGatewayTool("head-hunter", "get_profile", {
      args: { url: profileUrl },
    });
    const data = result.result?.data as LinkedInProfileScrape | null;
    if (!data || data.success === false) {
      console.error(`[getProfile] Thất bại — success=false, error=${data?.error ?? result.error ?? "unknown"}`);
      return null;
    }
    if (data.connectionStatus) {
      data.connectionStatus = normalizeConnectionStatus(data.connectionStatus);
    }
    console.error(`[getProfile] OK — name="${data.name}", url="${data.url}", profileIdUrl="${data.profileIdUrl ?? "N/A"}", connection=${data.connectionStatus ?? "?"}`);
    return data;
  } catch (err) {
    console.error(`[getProfile] Exception:`, err instanceof Error ? err.message : err);
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

    console.error(`[search] Bắt đầu tìm kiếm — query="${query}" (source=${querySource}), job="${job?.title ?? "none"}"`);
    const result = await callGatewayTool("head-hunter", "search", {
      args: { query, jobPositionId: jobPositionId || null },
    });
    const hits = normalizeSearchHits(result.result?.data);

    if (!result.ok) {
      console.error(`[search] Thất bại — error: ${result.error ?? "Lỗi Gateway"}`);
      return {
        success: false,
        results: [],
        query,
        error: result.error || "Lỗi Gateway",
      };
    }

    console.error(`[search] Gateway trả về ${hits.length} kết quả`);
    hits.forEach((h, i) => {
      console.error(`[search]   [${i + 1}] "${h.name}" — ${h.profile_url}${h.profile_id_url ? ` (id: ${h.profile_id_url})` : ""}`);
    });

    let scored = hits;
    if (job && hits.length > 0) {
      scored = await scoreCandidatesAgainstJob(job, hits, locale);
      console.error(`[search] Đã chấm điểm ${scored.length} ứng viên theo JD "${job.title}"`);
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
    console.error(`[search] Exception:`, err instanceof Error ? err.message : err);
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
    source: "db_inbox" | "db_history" | "db_preview";
    linxaInboxUrl: string;
  }
  | { success: false; error: string };

/** Đọc tin nhắn hội thoại LinkedIn của ứng viên từ local DB (CDP-synced). */
export async function fetchCandidateLinxaChatMessages(
  candidateId: string,
): Promise<FetchCandidateLinxaChatResult> {
  const candidate = await prisma.candidate.findUnique({
    where: { id: candidateId },
    select: { name: true, profileUrl: true, chatInfo: true, conversationHistory: true },
  });
  if (!candidate) {
    return { success: false, error: "Không tìm thấy ứng viên." };
  }

  const refine = (messages: Parameters<typeof refineLinxaMessageDirections>[0]) =>
    refineLinxaMessageDirections(messages, candidate.name);

  // Ưu tiên 1: tin nhắn đã đồng bộ qua CDP vào ConversationMessage table
  const linkedinConversation = await prisma.conversation.findFirst({
    where: { provider: "LINKEDIN", candidateId },
    orderBy: { updatedAt: "desc" },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });
  if (linkedinConversation?.messages.length) {
    const dbMessages = linkedinConversation.messages.map((m) => ({
      id: m.id,
      text: m.body,
      sentAt: m.createdAt.toISOString(),
      direction: m.direction.toLowerCase() as "inbound" | "outbound",
    }));
    return { success: true, messages: dbMessages, source: "db_inbox", linxaInboxUrl: "" };
  }

  // Ưu tiên 2: lịch sử hội thoại đã lưu trong DB (import cũ từ Linxa)
  const stored = parseStoredLinxaConversationHistory(candidate.conversationHistory);
  if (stored.length > 0) {
    return { success: true, messages: refine(stored), source: "db_history", linxaInboxUrl: "" };
  }

  // Ưu tiên 3: chatInfo preview (một đoạn text ngắn)
  const preview = candidate.chatInfo?.trim();
  if (preview) {
    return {
      success: true,
      messages: refine([{ id: "preview", text: preview, sentAt: null, direction: "inbound" }]),
      source: "db_preview",
      linxaInboxUrl: "",
    };
  }

  return {
    success: false,
    error: "Chưa có tin nhắn nào. Hãy bấm 'Đồng bộ tin nhắn' để tải về.",
  };
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
      args: { url: "https://www.linkedin.com/feed/" },
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

// Kiểm tra CDP, Gateway và session file. Mặc định không điều hướng LinkedIn.
export async function checkLinkedInConnection(options: { refreshBrowserProfile?: boolean } = {}) {
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

    if (options.refreshBrowserProfile && cdpReady) {
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

/** Đồng bộ toàn bộ LinkedIn Inbox qua CDP và lưu trữ cục bộ vào SQLite */
export async function syncLinkedInInboxCDP() {
  try {
    const cdpOk = await checkCdpReady();
    if (!cdpOk) {
      return { success: false, error: "Không phát hiện trình duyệt Chrome debug (CDP port 9222). Vui lòng kiểm tra lại." };
    }

    const gatewayOk = await checkGatewayReady();
    if (!gatewayOk) {
      return { success: false, error: "Không thể kết nối với OpenClaw Gateway Bridge." };
    }

    // Gọi Gateway Tool sync_inbox qua CDP
    const result = await callGatewayTool("head-hunter", "sync_inbox", {});
    console.error("[syncInbox] Gateway raw result:", JSON.stringify(result).slice(0, 2000));

    const data = result.result?.data;
    if (!result.ok || !data || !data.success) {
      const errMsg = data?.error || result.error || "Lỗi đồng bộ Inbox qua CDP";
      console.error("[syncInbox] Thất bại:", errMsg);
      return { success: false, error: errMsg };
    }

    console.error("[syncInbox] Gateway trả về:", {
      conversationsCount: data.conversationsCount,
      messagesCount: data.messagesCount,
      conversationsBatches: (data.conversations || []).length,
      messagesBatches: (data.messages || []).length,
    });

    const conversations = (data.conversations || []) as any[];

    let savedConversations = 0;
    let totalProcessed = 0;

    for (const conv of conversations) {
      // --- DOM fallback ---
      if (conv.fromDom) {
        const elements = (conv.elements || []) as { threadId: string; name: string }[];
        console.error(`[syncInbox] DOM fallback: ${elements.length} hội thoại`);
        for (const item of elements) {
          if (!item.threadId) continue;
          console.error(`[syncInbox]   DOM thread: ${item.threadId} — "${item.name}"`);
          const existing = await prisma.conversation.findFirst({
            where: { provider: "LINKEDIN", externalThreadId: item.threadId },
          });
          if (!existing) {
            await prisma.conversation.create({
              data: {
                provider: "LINKEDIN",
                externalThreadId: item.threadId,
                title: item.name || "Ứng viên LinkedIn",
                status: "ACTIVE",
              },
            });
            savedConversations++;
          }
        }
        continue;
      }

      // --- LinkedIn GraphQL API batch ---
      const elements =
        (conv.data?.messengerConversationsBySyncToken?.elements as any[]) ||
        (conv.elements as any[]) ||
        [];

      console.error(`[syncInbox] GraphQL batch: ${elements.length} hội thoại`);
      if (elements.length > 0) {
        console.error("[syncInbox] Sample element keys:", Object.keys(elements[0]).join(", "));
      }

      for (const item of elements) {
        const backendUrn = item.backendUrn as string | undefined;
        if (!backendUrn) {
          console.error(`[syncInbox]   Bỏ qua item không có backendUrn, keys: ${Object.keys(item).join(", ")}`);
          continue;
        }

        const threadId = backendUrn.replace("urn:li:messagingThread:", "");

        // Lấy người tham gia không phải SELF (ứng viên)
        const participants = (item.conversationParticipants || []) as any[];
        const otherP = participants.find(
          (p: any) => p.participantType?.member?.distance !== "SELF"
        );
        const member = otherP?.participantType?.member;
        const firstName = (member?.firstName?.text as string) || "";
        const lastName = (member?.lastName?.text as string) || "";
        const candidateName = [firstName, lastName].filter(Boolean).join(" ") || "Ứng viên LinkedIn";
        const headline = (member?.headline?.text as string) || null;

        // LinkedIn GraphQL trả về ID URL dạng relative: /in/ACoAACPvLaUB.../
        // Slug URL (/in/que-le-ta/) chỉ biết khi vào profile thật
        const rawIdProfileUrl = (member?.profileUrl as string | undefined)?.split("?")[0] ?? undefined;
        // Normalize thành absolute URL để nhất quán với get_profile
        const idProfileUrl = rawIdProfileUrl
          ? rawIdProfileUrl.startsWith("http")
            ? rawIdProfileUrl
            : `https://www.linkedin.com${rawIdProfileUrl.startsWith("/") ? rawIdProfileUrl : "/in/" + rawIdProfileUrl}`
          : undefined;

        // hostIdentityUrn: urn:li:fsd_profile:ACoAACPvLaUB... → dùng để extract fsdId
        const hostUrn = (otherP?.hostIdentityUrn as string) || "";
        const fsdId = hostUrn.replace("urn:li:fsd_profile:", "");

        // Tìm ứng viên hiện có theo linkedinProfileIdUrl hoặc profileUrl
        let candidate = idProfileUrl
          ? await prisma.candidate.findFirst({
            where: {
              OR: [
                { linkedinProfileIdUrl: idProfileUrl },
                { profileUrl: idProfileUrl },
              ],
            },
            select: { id: true, name: true },
          })
          : null;

        if (!candidate && idProfileUrl) {
          // Auto-create Candidate — mọi người nhắn tin đều là ứng viên tiềm năng
          candidate = await prisma.candidate.create({
            data: {
              name: candidateName,
              headline: headline,
              linkedinProfileIdUrl: idProfileUrl,
              source: "LINKEDIN_INBOX",
              status: "POTENTIAL",
            },
            select: { id: true, name: true },
          });
          console.error(`[syncInbox]   auto-created candidate: ${candidateName} (${fsdId})`);
        } else if (candidate) {
          // Cập nhật linkedinProfileIdUrl nếu chưa có
          if (idProfileUrl) {
            await prisma.candidate.update({
              where: { id: candidate.id },
              data: {
                linkedinProfileIdUrl: idProfileUrl,
                ...(headline ? { headline } : {}),
              },
            }).catch(() => { }); // bỏ qua nếu unique conflict
          }
          console.error(`[syncInbox]   matched: ${candidate.name}`);
        }

        const candidateId = candidate?.id ?? null;

        // Lưu tất cả tin nhắn có text từ inline elements (LinkedIn thường trả 1–5 tin gần nhất)
        // Mỗi tin dedup bằng backendUrn — đảm bảo burst messages từ candidate đều được lưu
        const msgElements = (item.messages?.elements as any[] | undefined) ?? [];
        const textElements = msgElements.filter((m: any) => (m?.body?.text as string)?.trim());

        // Upsert Conversation
        const existing = await prisma.conversation.findFirst({
          where: { provider: "LINKEDIN", externalThreadId: threadId },
        });

        let conversationId: string;
        if (existing) {
          await prisma.conversation.update({
            where: { id: existing.id },
            data: { candidateId: candidateId ?? undefined, title: candidateName },
          });
          conversationId = existing.id;
          console.error(`[syncInbox]   updated thread: ${threadId}`);
        } else {
          const created = await prisma.conversation.create({
            data: {
              provider: "LINKEDIN",
              externalThreadId: threadId,
              candidateId,
              title: candidateName,
              status: "ACTIVE",
            },
          });
          conversationId = created.id;
          savedConversations++;
          console.error(`[syncInbox]   created thread: ${threadId}`);
        }

        if (textElements.length === 0) {
          console.error(`[syncInbox]   no text message found in ${msgElements.length} elements (attachment only?)`);
        }

        for (const msgEl of textElements) {
          const body = (msgEl.body.text as string).trim();
          const urn = (msgEl?.backendUrn as string) || null;
          const isSelf = msgEl?.actor?.participantType?.member?.distance === "SELF";
          const at = msgEl?.deliveredAt ? new Date(Number(msgEl.deliveredAt)) : null;

          const msgExists = urn
            ? await prisma.conversationMessage.findFirst({
              where: { conversationId, externalMessageId: urn },
            })
            : null;

          if (!msgExists) {
            await prisma.conversationMessage.create({
              data: {
                conversationId,
                direction: isSelf ? "OUTBOUND" : "INBOUND",
                body,
                externalMessageId: urn,
                createdAt: at ?? new Date(),
              },
            });
            console.error(`[syncInbox]   saved msg (${isSelf ? "OUT" : "IN"}): "${body.slice(0, 60)}${body.length > 60 ? "…" : ""}"`);
          }
        }

        totalProcessed++;
      }
    }

    console.error(`[syncInbox] Kết quả: ${totalProcessed} đồng bộ (${savedConversations} mới)`);
    revalidatePath("/admin/recruitment/candidates");
    return {
      success: true,
      savedConversations,
      totalProcessed,
    };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/** Đồng bộ chi tiết tin nhắn của một hội thoại LinkedIn cụ thể qua CDP */
export async function syncLinkedInThreadCDP(candidateId: string) {
  try {
    const [cdpOk, gatewayOk] = await Promise.all([checkCdpReady(), checkGatewayReady()]);
    if (!cdpOk) {
      return { success: false, error: "Không phát hiện Chrome debug (CDP port 9222)." };
    }
    if (!gatewayOk) {
      return { success: false, error: "Không thể kết nối OpenClaw Gateway." };
    }

    // Lấy thông tin ứng viên để verify sau
    const candidate = await prisma.candidate.findUnique({
      where: { id: candidateId },
      select: { name: true, profileUrl: true, linkedinProfileIdUrl: true },
    });
    if (!candidate) {
      return { success: false, error: "Không tìm thấy ứng viên." };
    }
    console.error(`[syncThread] Ứng viên: ${candidate.name} | profileUrl=${candidate.profileUrl ?? "-"} | idUrl=${candidate.linkedinProfileIdUrl ?? "-"}`);

    // Tìm Conversation đã sync từ inbox
    let conversation = await prisma.conversation.findFirst({
      where: { provider: "LINKEDIN", candidateId },
      orderBy: { updatedAt: "desc" },
    });

    // Nếu chưa có → tự chạy inbox sync trước
    if (!conversation) {
      console.error("[syncThread] Chưa có conversation — tự chạy inbox sync...");
      await syncLinkedInInboxCDP();
      conversation = await prisma.conversation.findFirst({
        where: { provider: "LINKEDIN", candidateId },
        orderBy: { updatedAt: "desc" },
      });
    }

    if (!conversation) {
      return {
        success: false,
        error: "Không tìm thấy hội thoại LinkedIn nào với ứng viên này. Có thể chưa từng nhắn tin qua LinkedIn.",
      };
    }

    console.error(`[syncThread] Thread ID: ${conversation.externalThreadId} | title=${conversation.title}`);

    const result = await callGatewayTool("head-hunter", "sync_thread", {
      threadId: conversation.externalThreadId,
    });

    const data = result.result?.data;
    if (!result.ok || !data?.success) {
      console.error("[syncThread] Gateway lỗi:", data?.error || result.error);
      return { success: false, error: data?.error || result.error || "Lỗi đồng bộ tin nhắn." };
    }

    const messages = (data.messages || []) as any[];
    console.error(`[syncThread] Gateway trả về ${messages.length} tin nhắn`);

    // Verify: log các actor profile URL từ INBOUND messages để chắc chắn đúng người
    const inboundActorUrls = new Set<string>();
    for (const msg of messages) {
      const actorUrl = (msg.actor?.participantType?.member?.profileUrl as string | undefined)?.split("?")[0];
      const isSelf = msg.actor?.participantType?.member?.distance === "SELF";
      if (!isSelf && actorUrl) inboundActorUrls.add(actorUrl);
    }
    if (inboundActorUrls.size > 0) {
      console.error(`[syncThread] Actor INBOUND URLs: ${[...inboundActorUrls].join(", ")}`);
      // Cảnh báo nếu không khớp với candidate
      const knownUrls = [candidate.profileUrl, candidate.linkedinProfileIdUrl].filter(Boolean);
      const normalizeUrl = (u: string) => u.replace(/^https?:\/\/www\.linkedin\.com/i, "").replace(/\/$/, "");
      const mismatch = [...inboundActorUrls].every((u) =>
        !knownUrls.some((k) => normalizeUrl(u) === normalizeUrl(k!)),
      );
      if (mismatch && knownUrls.length > 0) {
        console.error(`[syncThread] CẢNH BÁO: actor URL không khớp với candidate. Có thể đang đồng bộ nhầm thread!`);
      } else {
        console.error(`[syncThread] Verify OK: actor khớp với candidate`);
      }
    } else {
      console.error(`[syncThread] Không có INBOUND message để verify actor`);
    }

    let savedMessages = 0;
    for (const msg of messages) {
      const body = (msg.body?.text as string) || "";
      if (!body.trim()) continue;

      const externalId = msg.backendUrn as string | undefined;
      const isSelf = msg.actor?.participantType?.member?.distance === "SELF";
      const direction = isSelf ? "OUTBOUND" : "INBOUND";
      const deliveredAt = msg.deliveredAt ? new Date(Number(msg.deliveredAt)) : new Date();

      // Bỏ qua nếu đã có
      if (externalId) {
        const exists = await prisma.conversationMessage.findFirst({
          where: { conversationId: conversation.id, externalMessageId: externalId },
        });
        if (exists) continue;
      }

      await prisma.conversationMessage.create({
        data: {
          conversationId: conversation.id,
          direction,
          body,
          externalMessageId: externalId ?? null,
          createdAt: deliveredAt,
        },
      });
      console.error(`[syncThread]   lưu (${direction}): "${body.slice(0, 60)}${body.length > 60 ? "…" : ""}"`);
      savedMessages++;
    }

    console.error(`[syncThread] Lưu ${savedMessages} tin nhắn mới`);
    revalidatePath("/admin/recruitment/candidates");
    return { success: true, savedMessages };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/** Tạo phản hồi AI thông minh dựa trên lịch sử chat, CV ứng viên và JD tuyển dụng */
export async function generateAIChatReply(candidateId: string) {
  try {
    const candidate = await prisma.candidate.findUnique({
      where: { id: candidateId },
      include: { jobPosition: true }
    });

    if (!candidate) {
      return { success: false, error: "Không tìm thấy hồ sơ ứng viên." };
    }

    const messages = parseStoredLinxaConversationHistory(candidate.conversationHistory);

    const candidateInfo = [
      `Tên ứng viên: ${candidate.name}`,
      candidate.headline ? `Tiêu đề: ${candidate.headline}` : null,
      candidate.cvText ? `Nội dung CV:\n${candidate.cvText}` : null,
      candidate.strengths ? `Điểm mạnh: ${candidate.strengths}` : null,
      candidate.recruiterNotes ? `Ghi chú tuyển dụng:\n${candidate.recruiterNotes}` : null,
    ].filter(Boolean).join("\n");

    const jdInfo = candidate.jobPosition ? [
      `Vị trí tuyển dụng: ${candidate.jobPosition.title}`,
      candidate.jobPosition.companyInfo ? `Thông tin công ty đối tác: ${candidate.jobPosition.companyInfo}` : null,
      candidate.jobPosition.requirements ? `Yêu cầu vị trí:\n${candidate.jobPosition.requirements}` : null,
      candidate.jobPosition.description ? `Mô tả công việc:\n${candidate.jobPosition.description}` : null,
    ].filter(Boolean).join("\n") : "Chưa gắn vị trí tuyển dụng cụ thể.";

    const chatHistoryBlock = messages.length > 0
      ? messages.map(m => `- ${m.direction === "outbound" ? "Nhà tuyển dụng (Bạn)" : `${candidate.name} (Ứng viên)`}: ${m.text}`).join("\n")
      : "(Chưa có tin nhắn hội thoại trước đó)";

    const prompt = `Bạn là một Chuyên viên săn đầu người cấp cao (Senior Headhunter / Recruitment Consultant) vô cùng lịch sự, sắc sảo và chuyên nghiệp của VClaw (đơn vị cung cấp dịch vụ tuyển dụng nhân sự chất lượng cao).
Nhiệm vụ của bạn là soạn thảo một tin nhắn phản hồi thông minh, tinh tế và cá nhân hóa cao để trả lời tin nhắn cuối cùng của ứng viên trên LinkedIn.

Với vai trò là Headhunter, bạn đang hỗ trợ tuyển dụng vị trí này cho công ty đối tác/khách hàng của VClaw. Hãy khéo léo sử dụng thông tin vị trí và thông tin công ty khách hàng (nếu có) để trao đổi với ứng viên.

Dưới đây là thông tin chi tiết:

1. THÔNG TIN HỒ SƠ ỨNG VIÊN:
${candidateInfo}

2. THÔNG TIN VỊ TRÍ & CÔNG TY ĐANG TUYỂN DỤNG (JD):
${jdInfo}

3. LỊCH SỬ CUỘC TRÒ CHUYỆN (Sắp xếp theo trình tự thời gian):
${chatHistoryBlock}

YÊU CẦU SOẠN THẢO:
- Hãy trả lời tin nhắn cuối cùng của ứng viên một cách tự nhiên, chân thành, thể hiện phong thái tôn trọng ứng viên, phong cách chuyên nghiệp của một chuyên gia săn đầu người uy tín.
- Nội dung phản hồi phải dựa trên thông tin thực tế từ CV và JD tuyển dụng của công ty đối tác. Tuyệt đối không tự bịa đặt thông tin không có thực.
- Sử dụng tiếng Việt chuẩn tự nhiên, xưng hô lịch thiệp (ví dụ: Anh/Chị và em/mình/VClaw tùy theo ngữ cảnh hoặc theo cách xưng hô trong lịch sử chat).
- Độ dài tin nhắn vừa phải, tập trung thẳng vào vấn đề của ứng viên, có lời kêu gọi hành động (Call-to-Action) rõ ràng và tinh tế (ví dụ: xác nhận lịch hẹn trao đổi nhanh, phỏng vấn sơ loại, làm rõ thêm kỹ năng, hoặc đặt câu hỏi mở phù hợp).
- KHÔNG hiển thị tiêu đề, không chèn markdown định dạng đặc biệt, chỉ trả về đúng NỘI DUNG TIN NHẮN sẽ gửi.`;

    const { gateway } = await import("@/lib/gateway/server");
    const res = await gateway.post<{ choices: { message: { content: string } }[] }>(
      "/v1/chat/completions",
      {
        model: "openclaw",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.5,
      },
      {
        headers: {
          "x-openclaw-model": "deepseek-web/deepseek-chat",
        },
      },
    );

    const reply = res.choices?.[0]?.message?.content?.trim();
    if (!reply) {
      return { success: false, error: "AI không thể tạo câu trả lời vào lúc này. Vui lòng thử lại." };
    }

    return {
      success: true,
      reply
    };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/** Gửi tin nhắn LinkedIn thật cho ứng viên thông qua CDP và trình duyệt */
export async function sendLinkedInMessageCDP(profileUrl: string | null | undefined, message: string, threadId?: string | null, candidateId?: string | null) {
  try {
    const cdpOk = await checkCdpReady();
    if (!cdpOk) {
      return { success: false, error: "Không phát hiện trình duyệt Chrome debug (CDP port 9222). Vui lòng kiểm tra lại." };
    }

    const gatewayOk = await checkGatewayReady();
    if (!gatewayOk) {
      return { success: false, error: "Không thể kết nối với OpenClaw Gateway Bridge." };
    }

    let resolvedThreadId = threadId;
    let resolvedProfileUrl = profileUrl;
    if (candidateId && (!resolvedThreadId || !resolvedProfileUrl)) {
      const [conv, candidate] = await Promise.all([
        !resolvedThreadId
          ? prisma.conversation.findFirst({
              where: { provider: "LINKEDIN", candidateId },
              orderBy: { updatedAt: "desc" },
              select: { externalThreadId: true },
            })
          : null,
        !resolvedProfileUrl
          ? prisma.candidate.findUnique({
              where: { id: candidateId },
              select: { linkedinProfileIdUrl: true, profileUrl: true },
            })
          : null,
      ]);
      resolvedThreadId ??= conv?.externalThreadId;
      // Ưu tiên ID-based URL vì Voyager cần /in/ACoA... để xác thực
      resolvedProfileUrl ??= candidate?.linkedinProfileIdUrl ?? candidate?.profileUrl ?? "";
    }

    if (!resolvedProfileUrl && !resolvedThreadId) {
      return { success: false, error: "Không tìm thấy profile URL hoặc thread ID của ứng viên." };
    }

    // Gọi Gateway Tool send_message
    const result = await callGatewayTool("head-hunter", "send_message", {
      args: {
        profile_url: resolvedProfileUrl,
        message: message,
        ...(resolvedThreadId ? { threadId: resolvedThreadId } : {}),
      }
    });

    const data = result.result?.data;
    if (!result.ok || !data || !data.success) {
      return { success: false, error: data?.error || result.error || "Gửi tin nhắn qua CDP thất bại" };
    }

    return {
      success: true,
      message: "Gửi tin nhắn LinkedIn thành công!"
    };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export type NewInboxMessage = GroupedLinkedInInboxMessage;

/** Sync LinkedIn inbox rồi trả về các tin nhắn mới (INBOUND) kể từ sinceMs. */
export async function syncInboxAndGetNewMessages(sinceMs: number): Promise<{
  success: boolean;
  newMessages: NewInboxMessage[];
  error?: string;
}> {
  const sync = await syncLinkedInInboxCDP();
  if (!sync.success) {
    return { success: false, newMessages: [], error: sync.error };
  }

  try {
    const rawMsgs = await prisma.conversationMessage.findMany({
      where: {
        direction: "INBOUND",
        createdAt: { gt: new Date(sinceMs) },
        conversation: { provider: "LINKEDIN" },
      },
      include: {
        conversation: {
          include: {
            candidate: {
              select: {
                id: true,
                name: true,
                linkedinProfileIdUrl: true,
                profileUrl: true,
                extractedInfo: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const newMessages: NewInboxMessage[] = groupLinkedInInboundMessagesForAutoReply(rawMsgs);

    return { success: true, newMessages };
  } catch (err) {
    return { success: false, newMessages: [], error: err instanceof Error ? err.message : String(err) };
  }
}
