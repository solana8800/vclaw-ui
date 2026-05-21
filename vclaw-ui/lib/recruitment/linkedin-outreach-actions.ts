"use server";

import { prisma } from "@/lib/db";
import { isLinkedInProfileUrl } from "@/lib/recruitment/candidate-types";
import { revalidateCandidatesPage } from "@/lib/recruitment/candidate-persistence";
import { buildJdOutreachDraft } from "@/lib/recruitment/outreach-message";
import { getWorkspaceLanguage } from "@/lib/recruitment/workspace-language";

const LINKEDIN_MESSAGE_TOOL = "recruitment.linkedin.send_message";
const DEFAULT_DAILY_CAP = 10;

const GATEWAY_URL = process.env.OPENCLAW_GATEWAY_URL || "http://127.0.0.1:3001";
const GATEWAY_TOKEN =
  process.env.OPENCLAW_GATEWAY_TOKEN || "62b791625fa441be036acd3c206b7e14e2bb13c803355823";

function extractHeadHunterPayload(raw: unknown): Record<string, unknown> | null {
  if (!raw || typeof raw !== "object") return null;
  const root = raw as Record<string, unknown>;

  if (root.result && typeof root.result === "object") {
    const inner = root.result as Record<string, unknown>;
    if (inner.data && typeof inner.data === "object") {
      return inner.data as Record<string, unknown>;
    }
    if (typeof inner.success === "boolean") return inner;
  }

  if (root.data && typeof root.data === "object") {
    return root.data as Record<string, unknown>;
  }

  if (typeof root.success === "boolean") return root;
  return null;
}

async function assertLinkedInMessageRateLimit(): Promise<void> {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const count = await prisma.agentToolLog.count({
    where: {
      tool: LINKEDIN_MESSAGE_TOOL,
      ok: true,
      createdAt: { gte: startOfDay },
    },
  });
  if (count >= DEFAULT_DAILY_CAP) {
    throw new Error(
      `Đã đạt giới hạn ${DEFAULT_DAILY_CAP} tin LinkedIn/ngày. Thử lại ngày mai.`,
    );
  }
}

async function callHeadHunterSendMessage(profileUrl: string, message: string, threadId?: string | null) {
  const res = await fetch(`${GATEWAY_URL}/tools/invoke`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${GATEWAY_TOKEN}`,
    },
    body: JSON.stringify({
      tool: "head-hunter",
      action: "send_message",
      args: { profile_url: profileUrl, message, ...(threadId ? { threadId } : {}) },
    }),
    signal: AbortSignal.timeout(180_000),
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(
      `Gateway lỗi ${res.status}. Kiểm tra OpenClaw đang chạy (${GATEWAY_URL}). ${text.slice(0, 200)}`,
    );
  }
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new Error("Gateway trả về dữ liệu không hợp lệ.");
  }
}

export type LinkedInOutreachResult =
  | { success: true; note?: string }
  | { success: false; error: string };

export type SuggestOutreachResult =
  | { success: true; message: string }
  | { success: false; error: string };

/** Gợi ý tin giới thiệu JD (mẫu — user chỉnh trước khi gửi). */
export async function suggestCandidateOutreachMessage(
  candidateId: string,
): Promise<SuggestOutreachResult> {
  const candidate = await prisma.candidate.findUnique({
    where: { id: candidateId },
    include: { jobPosition: true },
  });
  if (!candidate) {
    return { success: false, error: "Không tìm thấy ứng viên." };
  }
  if (!candidate.jobPosition) {
    return {
      success: false,
      error: "Ứng viên chưa gắn vị trí tuyển dụng — chọn vị trí bên trái hoặc gắn JD trước khi soạn mẫu.",
    };
  }

  const locale = await getWorkspaceLanguage();
  const message = buildJdOutreachDraft({
    candidateName: candidate.name,
    jobTitle: candidate.jobPosition.title,
    jobRequirements: candidate.jobPosition.requirements,
    locale,
  });

  return { success: true, message };
}

/** Gửi tin LinkedIn qua Chrome CDP (Playwright + head-hunter). */
export async function sendCandidateLinkedInMessage(
  candidateId: string,
  message: string,
): Promise<LinkedInOutreachResult> {
  const text = message.trim();
  if (!text) {
    return { success: false, error: "Nội dung tin nhắn trống." };
  }

  const candidate = await prisma.candidate.findUnique({ where: { id: candidateId } });
  if (!candidate) {
    return { success: false, error: "Không tìm thấy ứng viên." };
  }
  if (!isLinkedInProfileUrl(candidate.profileUrl)) {
    return {
      success: false,
      error:
        "Chưa có link profile LinkedIn (/in/). Bấm 「Cập nhật profile LinkedIn」 trong chi tiết ứng viên.",
    };
  }

  try {
    await assertLinkedInMessageRateLimit();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: msg };
  }

  const profileUrl = candidate.profileUrl!.split("?")[0];
  
  const conv = await prisma.conversation.findFirst({
    where: { provider: "LINKEDIN", candidateId },
    orderBy: { updatedAt: "desc" },
    select: { externalThreadId: true },
  });
  const threadId = conv?.externalThreadId;

  let gatewayData: Record<string, unknown> | null = null;
  let ok = false;
  let errorMsg: string | null = null;

  try {
    const raw = await callHeadHunterSendMessage(profileUrl, text, threadId);
    gatewayData = extractHeadHunterPayload(raw);
    ok = gatewayData?.success === true;
    if (!ok) {
      const bridgeErr =
        typeof raw === "object" && raw && "error" in raw ?
          String((raw as { error?: unknown }).error)
        : null;
      errorMsg = String(
        gatewayData?.error ?? bridgeErr ?? "Không gửi được tin trên LinkedIn.",
      );
    }
  } catch (err) {
    errorMsg = err instanceof Error ? err.message : String(err);
  }

  await prisma.agentToolLog.create({
    data: {
      tool: LINKEDIN_MESSAGE_TOOL,
      payload: JSON.stringify({
        candidateId,
        profileUrl,
        messagePreview: text.slice(0, 120),
        gatewayOk: ok,
      }).slice(0, 8000),
      ok,
      error: ok ? null : errorMsg,
    },
  });

  if (!ok) {
    const hint =
      errorMsg?.includes("CDP") ||
      errorMsg?.includes("Chrome") ||
      errorMsg?.includes("Gateway") ?
        errorMsg
      : `${errorMsg ?? "Không gửi được tin."} Cần: OpenClaw gateway + Chrome --remote-debugging-port=9222 đã đăng nhập LinkedIn.`;
    return { success: false, error: hint };
  }

  revalidateCandidatesPage();
  return {
    success: true,
    note: typeof gatewayData?.note === "string" ? gatewayData.note : "Đã gửi tin qua LinkedIn (Chrome CDP).",
  };
}
