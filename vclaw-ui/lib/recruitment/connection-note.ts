import { gateway } from "@/lib/gateway/server";
import { buildCandidateProfileContext } from "@/lib/recruitment/candidate-profile-context";
import { parseStoredCandidateJdEvaluation } from "@/lib/recruitment/candidate-jd-evaluation";
import type { WorkspaceLanguage } from "@/lib/recruitment/workspace-language";

const MAX_CONNECT_NOTE = 300;

function stripJsonFence(raw: string): string {
  return raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

export function truncateConnectNote(text: string): string {
  const t = text.trim();
  if (t.length <= MAX_CONNECT_NOTE) return t;
  return `${t.slice(0, MAX_CONNECT_NOTE - 1)}…`;
}

export function parseConnectionNoteResponse(raw: string): string | null {
  const cleaned = stripJsonFence(raw);
  try {
    const parsed = JSON.parse(cleaned) as { note?: string };
    if (typeof parsed.note === "string" && parsed.note.trim()) {
      return truncateConnectNote(parsed.note);
    }
  } catch {
    if (cleaned.length > 10) return truncateConnectNote(cleaned);
  }
  return null;
}

type JobForNote = {
  title: string;
  requirements?: string | null;
  description?: string | null;
};

type CandidateForNote = {
  name: string;
  headline?: string | null;
  location?: string | null;
  currentCompany?: string | null;
  profileUrl?: string | null;
  extractedInfo?: string | null;
  linkedinConnectionStatus?: string | null;
  aiAnalysisSummary?: string | null;
  matchSummary?: string | null;
  matchScore?: number | null;
};

function buildConnectionNotePrompt(
  job: JobForNote,
  candidate: CandidateForNote,
  locale: WorkspaceLanguage,
): string {
  const evaluation = parseStoredCandidateJdEvaluation(
    candidate.aiAnalysisSummary,
    candidate.matchSummary,
    candidate.matchScore,
  );

  const jobBlock = [
    `Vị trí: ${job.title}`,
    job.requirements ? `Yêu cầu: ${job.requirements.slice(0, 800)}` : null,
    job.description ? `Mô tả: ${job.description.slice(0, 500)}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const profileBlock = buildCandidateProfileContext(candidate);
  const evalBlock = evaluation
    ? [
        `Điểm tổng JD: ${evaluation.overallScore}%`,
        evaluation.conclusion ? `Kết luận AI: ${evaluation.conclusion}` : null,
        evaluation.strengths.length > 0
          ? `Điểm mạnh: ${evaluation.strengths.slice(0, 3).join("; ")}`
          : null,
      ]
        .filter(Boolean)
        .join("\n")
    : candidate.matchSummary
      ? `Đánh giá sơ bộ: ${candidate.matchSummary}`
      : null;

  const lang = locale === "vi" ? "tiếng Việt" : "English";

  return `Bạn là nhà tuyển dụng viết GHI CHÚ kèm lời mời kết nối LinkedIn (tối đa ${MAX_CONNECT_NOTE} ký tự).

Quy tắc:
- Giọng chuyên nghiệp, thân thiện, không spam emoji/hashtag.
- Nêu rõ vị trí đang tuyển và vì sao profile phù hợp (dựa trên JD + đánh giá).
- Không hứa hẹn quá mức, không bịa thông tin không có trong hồ sơ.
- Viết bằng ${lang}.
- Trả về DUY NHẤT JSON: {"note":"..."}

=== JD ===
${jobBlock}

=== ĐÁNH GIÁ ===
${evalBlock || "(chưa có — dựa trên profile)"}

=== HỒ SƠ ===
${profileBlock}`;
}

/** Soạn ghi chú kết nối bằng AI từ JD + đánh giá ứng viên. */
export async function generateConnectionNoteWithAi(
  job: JobForNote,
  candidate: CandidateForNote,
  locale: WorkspaceLanguage,
): Promise<string | null> {
  try {
    const res = await gateway.post<{ choices: { message: { content: string } }[] }>(
      "/v1/chat/completions",
      {
        model: "openclaw",
        messages: [{ role: "user", content: buildConnectionNotePrompt(job, candidate, locale) }],
        temperature: 0.45,
      },
      {
        headers: {
          "x-openclaw-model": "deepseek-web/deepseek-chat",
        },
      },
    );
    const raw = res.choices?.[0]?.message?.content?.trim();
    if (!raw) return null;
    return parseConnectionNoteResponse(raw);
  } catch {
    return null;
  }
}
