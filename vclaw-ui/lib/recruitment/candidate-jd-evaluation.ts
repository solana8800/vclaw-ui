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

/** Tiêu chí chuyên môn cốt lõi — quyết định overallScore và mức khớp nghề. */
export const JD_CORE_CRITERION_KEYS = [
  "skills_fit",
  "experience_fit",
  "education_fit",
  "projects_impact",
] as const;

/** Tiêu chí bổ sung — chỉ có ý nghĩa khi chuyên môn cốt lõi đạt ngưỡng. */
export const JD_BONUS_CRITERION_KEYS = ["languages_soft", "location_fit"] as const;

export const JD_CRITERION_DISPLAY_ORDER = [
  ...JD_CORE_CRITERION_KEYS,
  ...JD_BONUS_CRITERION_KEYS,
] as const;

const BONUS_KEYS = new Set<string>(JD_BONUS_CRITERION_KEYS);
const CORE_FIT_THRESHOLD = 50;
const BONUS_NOTE_SUFFIX =
  " (Tiêu chí bổ sung — chỉ có ý nghĩa khi phù hợp chuyên môn cốt lõi đạt; không cứu điểm khi sai nghề.)";

function criterionSortIndex(key: string): number {
  const idx = JD_CRITERION_DISPLAY_ORDER.indexOf(
    key as (typeof JD_CRITERION_DISPLAY_ORDER)[number],
  );
  return idx >= 0 ? idx : JD_CRITERION_DISPLAY_ORDER.length;
}

function averageScores(items: CandidateCriterionScore[]): number {
  if (items.length === 0) return 0;
  return items.reduce((sum, c) => sum + c.score, 0) / items.length;
}

function appendBonusNote(note: string): string {
  const trimmed = BONUS_NOTE_SUFFIX.trim();
  return note.includes(trimmed) ? note : `${note}${BONUS_NOTE_SUFFIX}`;
}

/** overall = TB 4 tiêu chí cốt lõi; bonus bị chặn khi cốt lõi chưa đạt. */
export function normalizeCandidateJdEvaluation(
  eval_: CandidateJdEvaluation,
): CandidateJdEvaluation {
  const sorted = [...eval_.criteria].sort(
    (a, b) => criterionSortIndex(a.key) - criterionSortIndex(b.key),
  );

  const core = sorted.filter((c) =>
    JD_CORE_CRITERION_KEYS.includes(c.key as (typeof JD_CORE_CRITERION_KEYS)[number]),
  );
  const coreAvg = core.length > 0 ? averageScores(core) : eval_.overallScore;

  const overallScore =
    core.length > 0 ? clampScore(averageScores(core)) : clampScore(eval_.overallScore);

  const criteria = sorted.map((c) => {
    if (!BONUS_KEYS.has(c.key)) return c;
    if (coreAvg >= CORE_FIT_THRESHOLD) {
      return { ...c, score: clampScore(c.score) };
    }
    const capped = Math.min(c.score, clampScore(Math.max(coreAvg - 5, 0)));
    return {
      ...c,
      score: clampScore(capped),
      note: appendBonusNote(c.note),
    };
  });

  return { ...eval_, overallScore, criteria };
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

    return normalizeCandidateJdEvaluation({
      version: 1,
      overallScore,
      criteria,
      strengths,
      concerns,
      conclusion: conclusion || strengths[0] || "—",
    });
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
    { "key": "projects_impact", "label": "Dự án & thành tựu", "score": <0-100>, "note": "..." },
    { "key": "languages_soft", "label": "Ngôn ngữ & đề xuất", "score": <0-100>, "note": "..." },
    { "key": "location_fit", "label": "Khu vực / làm việc", "score": <0-100>, "note": "..." }
  ],
  "strengths": ["...", "..."],
  "concerns": ["...", "..."],
  "conclusion": "2-4 câu kết luận như HR: có nên mời PV không, vì sao — viết bằng ${lang}"
}

Bắt buộc đủ 6 tiêu chí criteria (đúng thứ tự key như mẫu).

Quy tắc chấm:
- overallScore = trung bình 4 tiêu chí CỐT LÕI: skills_fit, experience_fit, education_fit, projects_impact — KHÔNG tính languages_soft hay location_fit.
- languages_soft và location_fit là BỔ SUNG (cuối danh sách): chỉ đánh giá cao khi 4 tiêu chí cốt lõi đạt (TB >= 50).
- Ví dụ: tuyển kỹ sư IT mà hồ sơ là vận động viên → skills/experience rất thấp → languages/location cũng phải thấp, không được “cứu” điểm.
- Khi TB 4 cốt lõi < 50: languages_soft và location_fit không cao hơn mức cốt lõi; ghi rõ trong note là tiêu chí bổ sung.
- education_fit: đánh giá mức bằng cấp/chứng chỉ hỗ trợ JD. Ngành học khác (vd. Kinh doanh) nhưng có nhiều năm kinh nghiệm đúng stack/ngành tuyển (vd. React, IT) → chấm theo mức hỗ trợ nghề + chứng chỉ kỹ thuật, thường 40–65; không hạ 20–30 chỉ vì bằng không phải CNTT khi kinh nghiệm làm việc rõ ràng trong lĩnh vực JD. Chỉ <35 khi không có dấu hiệu làm đúng ngành tuyển.

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

function tryParseStoredAiJson(raw: string): CandidateJdEvaluation | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("{")) {
    return parseCandidateJdEvaluation(trimmed);
  }
  const jsonStart = trimmed.indexOf("{");
  if (jsonStart >= 0) {
    return parseCandidateJdEvaluation(trimmed.slice(jsonStart));
  }
  return null;
}

/** Điểm hiển thị thống nhất — ưu tiên overall từ JSON đánh giá JD đã chuẩn hóa. */
export function resolveCandidateDisplayMatchScore(
  matchScore: number | null | undefined,
  aiAnalysisSummary?: string | null,
  matchSummary?: string | null,
): number | null {
  const stored = aiAnalysisSummary?.trim();
  if (stored?.startsWith("{")) {
    const parsed = tryParseStoredAiJson(stored);
    if (parsed) return parsed.overallScore;
  }
  if (matchScore == null || Number.isNaN(matchScore)) return null;
  return clampScore(matchScore);
}

export function parseStoredCandidateJdEvaluation(
  aiAnalysisSummary: string | null | undefined,
  matchSummary: string | null | undefined,
  matchScore: number | null | undefined,
): CandidateJdEvaluation | null {
  const stored = aiAnalysisSummary?.trim();
  if (stored) {
    const parsed = tryParseStoredAiJson(stored);
    if (parsed) return parsed;
    // Bản cũ lưu plain text trong aiAnalysisSummary
    if (stored.length > 16) {
      return {
        version: 1,
        overallScore: matchScore != null ? clampScore(matchScore) : 0,
        criteria: [],
        strengths: [],
        concerns: [],
        conclusion: stored,
      };
    }
  }
  if (matchSummary?.trim() && matchScore != null) {
    return {
      version: 1,
      overallScore: matchScore,
      criteria: [],
      strengths: [],
      concerns: [],
      conclusion: matchSummary.trim(),
    };
  }
  return null;
}
