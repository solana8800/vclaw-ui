import "server-only";

import { gateway } from "@/lib/gateway/server";
import type { WorkspaceLanguage } from "@/lib/recruitment/workspace-language";

export type JobPositionImportDraft = {
  title: string;
  description?: string | null;
  requirements?: string | null;
  salaryRange?: string | null;
  benefits?: string | null;
  interviewProcess?: string | null;
  hiringPolicy?: string | null;
  companyInfo?: string | null;
  projectTeamInfo?: string | null;
  headcount?: number | null;
  hiringTimeline?: string | null;
  urgencyLevel?: "NORMAL" | "URGENT" | null;
  contractType?: "FULL_TIME" | "PART_TIME" | "CONTRACT" | "INTERN" | null;
  workMode?: "ONSITE" | "HYBRID" | "REMOTE" | null;
  companyUrl?: string | null;
};

const CONTRACT_TYPES = new Set<"FULL_TIME" | "PART_TIME" | "CONTRACT" | "INTERN">([
  "FULL_TIME",
  "PART_TIME",
  "CONTRACT",
  "INTERN",
]);
const WORK_MODES = new Set<"ONSITE" | "HYBRID" | "REMOTE">(["ONSITE", "HYBRID", "REMOTE"]);
const URGENCY = new Set<"NORMAL" | "URGENT">(["NORMAL", "URGENT"]);

function stripJsonFence(raw: string): string {
  return raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

function asOptionalString(v: unknown): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  return s || null;
}

function asHeadcount(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = typeof v === "number" ? v : parseInt(String(v), 10);
  if (!Number.isFinite(n) || n < 1) return null;
  return Math.min(999, Math.round(n));
}

function pickEnum<T extends string>(v: unknown, allowed: Set<T>): T | null {
  const u = String(v ?? "").trim().toUpperCase();
  return allowed.has(u as T) ? (u as T) : null;
}

export function parseJobPositionImportDraft(raw: string): JobPositionImportDraft | null {
  const jsonText = stripJsonFence(raw);
  const start = jsonText.indexOf("{");
  const end = jsonText.lastIndexOf("}");
  if (start < 0 || end <= start) return null;

  try {
    const data = JSON.parse(jsonText.slice(start, end + 1)) as Record<string, unknown>;
    const title = asOptionalString(data.title);
    if (!title) return null;

    return {
      title,
      description: asOptionalString(data.description),
      requirements: asOptionalString(data.requirements),
      salaryRange: asOptionalString(data.salaryRange),
      benefits: asOptionalString(data.benefits),
      interviewProcess: asOptionalString(data.interviewProcess),
      hiringPolicy: asOptionalString(data.hiringPolicy),
      companyInfo: asOptionalString(data.companyInfo),
      projectTeamInfo: asOptionalString(data.projectTeamInfo),
      headcount: asHeadcount(data.headcount),
      hiringTimeline: asOptionalString(data.hiringTimeline),
      urgencyLevel: pickEnum(data.urgencyLevel, URGENCY),
      contractType: pickEnum(data.contractType, CONTRACT_TYPES),
      workMode: pickEnum(data.workMode, WORK_MODES),
      companyUrl: asOptionalString(data.companyUrl),
    };
  } catch {
    return null;
  }
}

function buildImportPrompt(
  pageContent: string,
  sourceUrl: string,
  locale: WorkspaceLanguage,
): string {
  const langNote =
    locale === "en"
      ? "Write string fields in English when the source is English; otherwise Vietnamese is fine."
      : "Các trường text ưu tiên tiếng Việt nếu JD gốc là tiếng Việt.";

  return `Bạn là chuyên gia HR. Từ nội dung trang tuyển dụng công khai dưới đây, trích xuất thông tin vào JSON cho hệ thống ATS nội bộ.

Nguồn URL: ${sourceUrl}
${langNote}

Quy tắc:
- Chỉ dùng thông tin có trong trang; không bịa.
- title: bắt buộc, ngắn gọn (tên vị trí).
- description: mô tả công việc / trách nhiệm (markdown hoặc text, có xuống dòng).
- requirements: yêu cầu ứng viên (kỹ năng, kinh nghiệm, học vấn).
- salaryRange, benefits, interviewProcess, hiringPolicy, companyInfo, projectTeamInfo: string hoặc null.
- headcount: số nguyên dương hoặc null nếu không nêu.
- hiringTimeline: thời gian tuyển nếu có.
- urgencyLevel: chỉ "NORMAL" hoặc "URGENT" (URGENT nếu JD nhấn mạnh tuyển gấp).
- contractType: chỉ FULL_TIME | PART_TIME | CONTRACT | INTERN hoặc null.
- workMode: chỉ ONSITE | HYBRID | REMOTE hoặc null.
- companyUrl: URL LinkedIn company nếu có trên trang, hoặc null.

Trả về ĐÚNG một object JSON (không markdown bọc ngoài), schema:
{
  "title": string,
  "description": string | null,
  "requirements": string | null,
  "salaryRange": string | null,
  "benefits": string | null,
  "interviewProcess": string | null,
  "hiringPolicy": string | null,
  "companyInfo": string | null,
  "projectTeamInfo": string | null,
  "headcount": number | null,
  "hiringTimeline": string | null,
  "urgencyLevel": "NORMAL" | "URGENT" | null,
  "contractType": "FULL_TIME" | "PART_TIME" | "CONTRACT" | "INTERN" | null,
  "workMode": "ONSITE" | "HYBRID" | "REMOTE" | null,
  "companyUrl": string | null
}

=== NỘI DUNG TRANG ===
${pageContent}`;
}

async function callGatewayImport(prompt: string): Promise<string | null> {
  try {
    const res = await gateway.post<{ choices: { message: { content: string } }[] }>(
      "/v1/chat/completions",
      {
        model: "openclaw",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.2,
      },
      {
        headers: { "x-openclaw-model": "deepseek-web/deepseek-chat" },
      },
    );
    return res.choices?.[0]?.message?.content?.trim() ?? null;
  } catch (e) {
    console.error("[callGatewayImport]", e);
    return null;
  }
}

/** AI tổng hợp nội dung trang → các trường JobPosition. */
export async function importJobPositionDraftFromContent(
  pageContent: string,
  sourceUrl: string,
  locale: WorkspaceLanguage = "vi",
): Promise<JobPositionImportDraft | null> {
  const prompt = buildImportPrompt(pageContent, sourceUrl, locale);
  const raw = await callGatewayImport(prompt);
  if (!raw) return null;
  return parseJobPositionImportDraft(raw);
}
