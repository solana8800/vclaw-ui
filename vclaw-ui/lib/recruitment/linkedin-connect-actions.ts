"use server";

import { prisma } from "@/lib/db";
import { isLinkedInProfileUrl } from "@/lib/recruitment/candidate-types";
import { revalidateCandidatesPage } from "@/lib/recruitment/candidate-persistence";
import { generateConnectionNoteWithAi, truncateConnectNote } from "@/lib/recruitment/connection-note";
import { buildJdConnectNoteFallback } from "@/lib/recruitment/connection-note-fallback";
import { getWorkspaceLanguage } from "@/lib/recruitment/workspace-language";
import { normalizeConnectionStatus } from "@/lib/recruitment/candidate-profile";

const LINKEDIN_CONNECT_TOOL = "recruitment.linkedin.send_connect";
const DEFAULT_DAILY_CAP = 15;

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

async function assertConnectRateLimit(): Promise<void> {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const count = await prisma.agentToolLog.count({
    where: {
      tool: LINKEDIN_CONNECT_TOOL,
      ok: true,
      createdAt: { gte: startOfDay },
    },
  });
  if (count >= DEFAULT_DAILY_CAP) {
    throw new Error(
      `Đã đạt giới hạn ${DEFAULT_DAILY_CAP} lời mời kết nối/ngày. Thử lại ngày mai.`,
    );
  }
}

async function callHeadHunterSendConnect(profileUrl: string, note: string) {
  const res = await fetch(`${GATEWAY_URL}/tools/invoke`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${GATEWAY_TOKEN}`,
    },
    body: JSON.stringify({
      tool: "head-hunter",
      action: "send_connect",
      args: { profile_url: profileUrl, note },
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

export type ConnectActionResult =
  | { success: true; note?: string }
  | { success: false; error: string };

export type SuggestConnectNoteResult =
  | { success: true; note: string }
  | { success: false; error: string };

/** Gợi ý ghi chú kết nối — AI (JD + đánh giá), fallback mẫu nếu AI lỗi. */
export async function suggestCandidateConnectNote(
  candidateId: string,
): Promise<SuggestConnectNoteResult> {
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
      error: "Gắn ứng viên với vị trí tuyển dụng trước khi soạn ghi chú.",
    };
  }

  const locale = await getWorkspaceLanguage();
  const aiNote = await generateConnectionNoteWithAi(
    candidate.jobPosition,
    candidate,
    locale,
  );

  const note =
    aiNote ??
    buildJdConnectNoteFallback({
      candidateName: candidate.name,
      jobTitle: candidate.jobPosition.title,
      matchScore: candidate.matchScore,
      locale,
    });

  return { success: true, note };
}

/** Gửi lời mời kết nối LinkedIn qua CDP (Linxa không hỗ trợ). */
export async function sendCandidateLinkedInConnect(
  candidateId: string,
  note: string,
): Promise<ConnectActionResult> {
  const text = truncateConnectNote(note);
  if (!text) {
    return { success: false, error: "Ghi chú kết nối trống." };
  }

  const candidate = await prisma.candidate.findUnique({ where: { id: candidateId } });
  if (!candidate) {
    return { success: false, error: "Không tìm thấy ứng viên." };
  }
  if (!isLinkedInProfileUrl(candidate.profileUrl)) {
    return {
      success: false,
      error: "Chưa có link profile LinkedIn (/in/).",
    };
  }

  const status = candidate.linkedinConnectionStatus;
  if (status === "CONNECTED") {
    return { success: false, error: "Đã kết nối — dùng Gửi tin nhắn." };
  }
  if (status === "PENDING") {
    return { success: false, error: "Đã gửi lời mời — đang chờ ứng viên chấp nhận." };
  }

  try {
    await assertConnectRateLimit();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: msg };
  }

  const profileUrl = candidate.profileUrl!.split("?")[0];
  let gatewayData: Record<string, unknown> | null = null;
  let ok = false;
  let errorMsg: string | null = null;

  try {
    const raw = await callHeadHunterSendConnect(profileUrl, text);
    gatewayData = extractHeadHunterPayload(raw);
    ok = gatewayData?.success === true;
    if (!ok) {
      errorMsg = String(gatewayData?.error ?? "Không gửi được lời mời kết nối.");
    }
  } catch (err) {
    errorMsg = err instanceof Error ? err.message : String(err);
  }

  await prisma.agentToolLog.create({
    data: {
      tool: LINKEDIN_CONNECT_TOOL,
      payload: JSON.stringify({
        candidateId,
        profileUrl,
        notePreview: text.slice(0, 120),
        gatewayOk: ok,
      }).slice(0, 8000),
      ok,
      error: ok ? null : errorMsg,
    },
  });

  if (!ok) {
    return { success: false, error: errorMsg ?? "Không gửi được lời mời." };
  }

  const newStatus =
    typeof gatewayData?.connectionStatus === "string"
      ? normalizeConnectionStatus(gatewayData.connectionStatus)
      : "PENDING";

  await prisma.candidate.update({
    where: { id: candidateId },
    data: { linkedinConnectionStatus: newStatus },
  });

  revalidateCandidatesPage();
  return {
    success: true,
    note:
      typeof gatewayData?.note === "string"
        ? gatewayData.note
        : "Đã gửi lời mời kết nối trên LinkedIn.",
  };
}
