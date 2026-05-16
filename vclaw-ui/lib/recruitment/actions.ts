"use server";

// Server actions gọi Gateway Bridge để thực hiện automation LinkedIn
// Gateway chạy Playwright/CDP → trình duyệt thật → LinkedIn

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { prisma } from "@/lib/db";
import { getRecruitmentSettings } from "@/lib/actions/recruitment-settings-actions";
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
      },
      linxaToken: linxaToken || process.env.LINXA_TOKEN,
    }),
  });
  if (!res.ok) throw new Error(`Gateway lỗi ${res.status}: ${await res.text()}`);
  return res.json();
}

// Tìm kiếm ứng viên LinkedIn — kết quả tự động lưu vào DB qua Gateway→VClaw sync
export async function searchLinkedInCandidates(query: string, jobPositionId?: string) {
  try {
    const result = await callGatewayTool("head-hunter", "linkedin_search", {
      args: { query, jobPositionId: jobPositionId || null },
    });
    const data = result.result?.data;
    return {
      success: result.ok,
      results: Array.isArray(data) ? data : [],
      count: Array.isArray(data) ? data.length : 0,
      error: result.ok ? undefined : (result.error || "Lỗi Gateway"),
    };
  } catch (err) {
    return { success: false, error: String(err), results: [] };
  }
}

// Đồng bộ hội thoại từ Linxa (smart-linkedin-inbox)
export async function syncLinkedInCandidates() {
  try {
    const result = await callGatewayTool("smart-linkedin-inbox", "list_conversations", {
      args: { limit: 20 },
    });
    return {
      success: result.ok,
      count: result.result?.data?.length ?? 0,
      error: result.ok ? undefined : "Lỗi kết nối Linxa",
    };
  } catch (err) {
    return { success: false, error: String(err), count: 0 };
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
