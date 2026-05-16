import type { LinkedInJobFacts } from "@/lib/ai/prompts/recruitment-prompts";

/** Cụm từ dễ bị LinkedIn/độc giả coi là spam hoặc bài test — chặn trước khi đăng. */
export const LINKEDIN_FORBIDDEN_PATTERNS: RegExp[] = [
  /\bdemo\b/i,
  /\btest\b/i,
  /\btesting\b/i,
  /\bpilot\b/i,
  /\bsandbox\b/i,
  /\bplaceholder\b/i,
  /\blorem\b/i,
  /\bsample\b/i,
  /\bfake\b/i,
  /\bbot\b/i,
  /thử\s*nghiệm/i,
  /đang\s*test/i,
  /\bvclaw\s*test/i,
  /\bopenclaw\b/i,
  /\bchatgpt\b/i,
  /ai\s*(viết|tạo|generated)/i,
  /tự\s*động\s*đăng/i,
  /đăng\s*bài\s*tự\s*động/i,
  /bài\s*đăng\s*tuyển\s*dụng\s*thật/i,
  /bạn\s*đang\s*đọc/i,
  /\[lưu\s*ý:/i,
  /\*\*\[.*lưu\s*ý/i,
  /vclaw\s*ai\*\*/i,
  /nhờ\s*ai/i,
  /do\s*ai\s*soạn/i,
];

export type LinkedInJobCopyValidation = {
  ok: boolean;
  issues: string[];
};

export type JobPositionForLinkedInFacts = {
  title: string;
  description?: string | null;
  requirements?: string | null;
  salaryRange?: string | null;
  benefits?: string | null;
  companyInfo?: string | null;
  projectTeamInfo?: string | null;
  hiringPolicy?: string | null;
  interviewProcess?: string | null;
  headcount?: number | null;
  hiringTimeline?: string | null;
  urgencyLevel?: string | null;
  contractType?: string | null;
  workMode?: string | null;
  publicInstructions?: string | null;
  companyUrl?: string | null;
};

export function stripAiWrappers(text: string): string {
  return text
    .replace(/^```[\w]*\n?/gm, "")
    .replace(/```$/gm, "")
    .replace(/^\s*"([\s\S]*)"\s*$/, "$1")
    .trim();
}

/** Gỡ dòng meta / disclaimer AI thường chèn vào đầu bài. */
export function sanitizeLinkedInPostCopy(text: string): string {
  const lines = stripAiWrappers(text)
    .split("\n")
    .filter((line) => {
      const t = line.trim();
      if (!t) return true;
      if (/^\*\*\[.*\]\*\*$/i.test(t)) return false;
      if (/^\[lưu\s*ý:/i.test(t)) return false;
      if (/bài\s*đăng\s*tuyển\s*dụng\s*thật/i.test(t)) return false;
      if (/bạn\s*đang\s*đọc/i.test(t)) return false;
      if (/^---+$/.test(t)) return false;
      return true;
    });
  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

export function validateLinkedInJobCopy(text: string): LinkedInJobCopyValidation {
  const issues: string[] = [];
  const trimmed = text.trim();

  if (trimmed.length < 80) {
    issues.push("Mô tả quá ngắn (tối thiểu ~80 ký tự).");
  }
  if (trimmed.length > 4000) {
    issues.push("Mô tả quá dài cho LinkedIn Jobs.");
  }

  for (const re of LINKEDIN_FORBIDDEN_PATTERNS) {
    const m = trimmed.match(re);
    if (m) {
      issues.push(`Chứa cụm không được phép: "${m[0]}"`);
    }
  }

  return { ok: issues.length === 0, issues };
}

/** Gom toàn bộ thuộc tính vị trí cho AI — không gửi mô tả cũ. */
export function jobRecordToLinkedInFacts(
  job: JobPositionForLinkedInFacts,
  location: string,
): LinkedInJobFacts {
  return {
    title: job.title,
    requirements: job.requirements,
    salaryRange: job.salaryRange,
    benefits: job.benefits,
    companyInfo: job.companyInfo,
    projectTeamInfo: job.projectTeamInfo,
    hiringPolicy: job.hiringPolicy,
    interviewProcess: job.interviewProcess,
    headcount: job.headcount,
    hiringTimeline: job.hiringTimeline,
    urgencyLevel: job.urgencyLevel,
    contractType: job.contractType,
    workMode: job.workMode,
    publicInstructions: job.publicInstructions,
    companyUrl: job.companyUrl,
    location: location.trim() || "Vietnam",
  };
}
