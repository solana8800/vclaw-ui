/** Trạng thái do recruiter chỉnh tay — không ghi đè khi sync/AI. */
const LOCKED_RECRUITMENT_STATUSES = new Set([
  "CONTACTED",
  "INTERESTED",
  "HIRED",
]);

export type CandidateRecruitmentStatus =
  | "POTENTIAL"
  | "CONTACTED"
  | "INTERESTED"
  | "SCREENING"
  | "HIRED"
  | "REJECTED";

/** Đã chạy đánh giá AI (JD) đầy đủ — lưu JSON trong aiAnalysisSummary. */
export function hasJdEvaluation(aiAnalysisSummary: string | null | undefined): boolean {
  return Boolean(aiAnalysisSummary?.trim().startsWith("{"));
}

/** Gợi ý trạng thái từ điểm khớp JD — chỉ khi đã có đánh giá AI (JD). */
export function inferCandidateStatusFromMatchScore(
  matchScore: number | null | undefined,
  options?: { hasJdEvaluation?: boolean },
): CandidateRecruitmentStatus {
  if (!options?.hasJdEvaluation) return "POTENTIAL";
  if (matchScore == null || Number.isNaN(matchScore)) return "POTENTIAL";
  if (matchScore >= 75) return "SCREENING";
  if (matchScore >= 50) return "POTENTIAL";
  return "REJECTED";
}

export function normalizeCandidateStatus(raw: string | null | undefined): string {
  const u = (raw ?? "POTENTIAL").toUpperCase();
  const allowed: CandidateRecruitmentStatus[] = [
    "POTENTIAL",
    "CONTACTED",
    "INTERESTED",
    "SCREENING",
    "HIRED",
    "REJECTED",
  ];
  return allowed.includes(u as CandidateRecruitmentStatus) ? u : "POTENTIAL";
}

/** Cập nhật trạng thái tự động khi có điểm JD mới — giữ trạng thái đã liên hệ/tuyển. */
export function resolveCandidateStatusAfterScoring(
  currentStatus: string | null | undefined,
  matchScore: number | null | undefined,
  aiAnalysisSummary?: string | null,
): CandidateRecruitmentStatus {
  const cur = normalizeCandidateStatus(currentStatus) as CandidateRecruitmentStatus;
  if (LOCKED_RECRUITMENT_STATUSES.has(cur)) return cur;
  const jd = hasJdEvaluation(aiAnalysisSummary);
  if (!jd) return "POTENTIAL";
  return inferCandidateStatusFromMatchScore(matchScore, { hasJdEvaluation: true });
}

/** Nhãn pipeline trên bảng — tách «chưa đánh giá JD» khỏi «tiềm năng». */
export function resolveCandidatePipelineDisplayKey(
  currentStatus: string | null | undefined,
  matchScore: number | null | undefined,
  aiAnalysisSummary?: string | null,
): CandidateRecruitmentStatus | "UNSCORED" {
  const resolved = resolveCandidateStatusAfterScoring(
    currentStatus,
    matchScore,
    aiAnalysisSummary,
  );
  if (!hasJdEvaluation(aiAnalysisSummary) && !LOCKED_RECRUITMENT_STATUSES.has(resolved)) {
    return "UNSCORED";
  }
  return resolved;
}
