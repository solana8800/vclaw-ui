import { gateway } from "@/lib/gateway/server";
import type { WorkspaceLanguage } from "@/lib/recruitment/workspace-language";
import { buildCandidateProfileContext } from "@/lib/recruitment/candidate-profile-context";
import type { JobForSearchQuery } from "@/lib/recruitment/candidate-search-query";

export type CandidateCriterionScore = {
  key: string;
  label: string;
  score: number;
  note: string;
};

export type CandidateJdEvaluation = {
  version: 1;
  overallScore: number;
  criteria: CandidateCriterionScore[];
  strengths: string[];
  concerns: string[];
  conclusion: string;
};

export type CandidateForEvaluation = {
  name: string;
  headline?: string | null;
  location?: string | null;
  currentCompany?: string | null;
  profileUrl?: string | null;
  extractedInfo?: string | null;
  source?: string | null;
  linkedinConnectionStatus?: string | null;
  matchScore?: number | null;
};

function stripJsonFence(raw: string): string {
  return raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

function clampScore(n: number): number {
  return Math.min(100, Math.max(0, Math.round(n)));
}

export function parseCandidateJdEvaluation(raw: string): CandidateJdEvaluation | null {
  try {
    const parsed = JSON.parse(stripJsonFence(raw)) as Record<string, unknown>;
    const overallScore =
      typeof parsed.overallScore === "number"
        ? clampScore(parsed.overallScore)
        : typeof parsed.score === "number"
          ? clampScore(parsed.score)
          : null;
    if (overallScore == null) return null;

    const criteriaRaw = parsed.criteria;
    const criteria: CandidateCriterionScore[] = Array.isArray(criteriaRaw)
      ? criteriaRaw
          .filter((c): c is Record<string, unknown> => Boolean(c && typeof c === "object"))
          .map((c) => ({
            key: String(c.key ?? "criterion"),
            label: String(c.label ?? c.key ?? "Tiêu chí"),
            score: clampScore(Number(c.score ?? 0)),
            note: String(c.note ?? "").trim(),
          }))
          .filter((c) => c.note.length > 0 || c.score > 0)
      : [];

    const strengths = Array.isArray(parsed.strengths)
      ? parsed.strengths.filter((s): s is string => typeof s === "string" && s.trim().length > 0)
      : [];
    const concerns = Array.isArray(parsed.concerns)
      ? parsed.concerns.filter((s): s is string => typeof s === "string" && s.trim().length > 0)
      : [];

    const conclusion =
      typeof parsed.conclusion === "string"
        ? parsed.conclusion.trim()
        : typeof parsed.summary === "string"
          ? parsed.summary.trim()
          : "";

    if (!conclusion && criteria.length === 0) return null;

    return {
      version: 1,
      overallScore,
      criteria,
      strengths,
      concerns,
      conclusion: conclusion || strengths[0] || "—",
    };
  } catch {
    return null;
  }
}

function buildEvaluationPrompt(
  job: JobForSearchQuery & {
    description?: string | null;
    requirements?: string | null;
    salaryRange?: string | null;
    benefits?: string | null;
    workMode?: string | null;
    contractType?: string | null;
  },
  candidate: CandidateForEvaluation,
  locale: WorkspaceLanguage,
): string {
  const jobBlock = [
    `Tiêu đề: ${job.title}`,
    job.requirements ? `Yêu cầu: ${job.requirements}` : null,
    job.description ? `Mô tả: ${job.description}` : null,
    job.workMode ? `Hình thức: ${job.workMode}` : null,
    job.contractType ? `Loại HĐ: ${job.contractType}` : null,
    job.salaryRange ? `Lương: ${job.salaryRange}` : null,
    job.benefits ? `Quyền lợi: ${job.benefits}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const profileBlock = buildCandidateProfileContext(candidate);
  const lang = locale === "vi" ? "tiếng Việt" : "English";

  return `Bạn là nhà tuyển dụng / HR Business Partner có kinh nghiệm. Đánh giá ứng viên dưới đây so với JD — dựa trên TOÀN BỘ hồ sơ (giới thiệu, kinh nghiệm, học vấn, kỹ năng, khu vực, dự án, ngôn ngữ, đề xuất…).

Chỉ dùng thông tin có trong hồ sơ và JD. Không bịa. Thiếu dữ liệu thì ghi rõ trong note và điểm thấp hơn ở tiêu chí đó.

Trả về DUY NHẤT JSON hợp lệ (không markdown):
{
  "overallScore": <0-100>,
  "criteria": [
    { "key": "skills_fit", "label": "Kỹ năng & stack", "score": <0-100>, "note": "..." },
    { "key": "experience_fit", "label": "Kinh nghiệm", "score": <0-100>, "note": "..." },
    { "key": "education_fit", "label": "Học vấn", "score": <0-100>, "note": "..." },
    { "key": "location_fit", "label": "Khu vực / làm việc", "score": <0-100>, "note": "..." },
    { "key": "projects_impact", "label": "Dự án & thành tựu", "score": <0-100>, "note": "..." },
    { "key": "languages_soft", "label": "Ngôn ngữ & đề xuất", "score": <0-100>, "note": "..." }
  ],
  "strengths": ["...", "..."],
  "concerns": ["...", "..."],
  "conclusion": "2-4 câu kết luận như HR: có nên mời PV không, vì sao — viết bằng ${lang}"
}

Bắt buộc đủ 6 tiêu chí criteria. overallScore phản ánh mức phù hợp tổng thể.

=== JD ===
${jobBlock}

=== HỒ SƠ ỨNG VIÊN ===
${profileBlock}`;
}

async function callGatewayEvaluation(prompt: string): Promise<{ ok: boolean; content?: string }> {
  try {
    const res = await gateway.post<{ choices: { message: { content: string } }[] }>(
      "/v1/chat/completions",
      {
        model: "openclaw",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.35,
      },
      {
        headers: {
          "x-openclaw-model": "deepseek-web/deepseek-chat",
        },
      },
    );
    const raw = res.choices?.[0]?.message?.content?.trim();
    if (!raw) return { ok: false };
    return { ok: true, content: raw };
  } catch {
    return { ok: false };
  }
}

/** Đánh giá chi tiết một ứng viên so với JD (như nhà tuyển dụng). */
export async function evaluateCandidateAgainstJob(
  job: JobForSearchQuery & {
    description?: string | null;
    requirements?: string | null;
    salaryRange?: string | null;
    benefits?: string | null;
    workMode?: string | null;
    contractType?: string | null;
  },
  candidate: CandidateForEvaluation,
  locale: WorkspaceLanguage,
): Promise<CandidateJdEvaluation | null> {
  const ai = await callGatewayEvaluation(buildEvaluationPrompt(job, candidate, locale));
  if (!ai.ok || !ai.content) return null;
  return parseCandidateJdEvaluation(ai.content);
}

export function serializeCandidateJdEvaluation(eval_: CandidateJdEvaluation): string {
  return JSON.stringify(eval_);
}

export function parseStoredCandidateJdEvaluation(
  aiAnalysisSummary: string | null | undefined,
  matchSummary: string | null | undefined,
  matchScore: number | null | undefined,
): CandidateJdEvaluation | null {
  if (aiAnalysisSummary?.trim().startsWith("{")) {
    const parsed = parseCandidateJdEvaluation(aiAnalysisSummary);
    if (parsed) return parsed;
  }
  if (matchSummary && matchScore != null) {
    return {
      version: 1,
      overallScore: matchScore,
      criteria: [],
      strengths: [],
      concerns: [],
      conclusion: matchSummary,
    };
  }
  return null;
}
