/** Dữ liệu vị trí gửi AI — không gồm mô tả cũ; AI soạn mô tả marketing mới từ các trường còn lại. */
import type { WorkspaceLanguage } from "@/lib/recruitment/workspace-language";

export type LinkedInJobFacts = {
  title: string;
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
  location: string;
};

const LABELS = {
  vi: {
    contract: {
      FULL_TIME: "Toàn thời gian",
      PART_TIME: "Bán thời gian",
      CONTRACT: "Hợp đồng",
      INTERN: "Thực tập",
    },
    workMode: {
      ONSITE: "Tại văn phòng",
      HYBRID: "Linh hoạt (Hybrid)",
      REMOTE: "Từ xa (Remote)",
    },
    urgency: {
      URGENT: "Cần gấp",
    },
    fields: {
      title: "Tiêu đề vị trí",
      location: "Địa điểm làm việc",
      contract: "Loại hợp đồng",
      workMode: "Hình thức làm việc",
      requirements: "Yêu cầu ứng viên",
      salary: "Mức lương",
      benefits: "Quyền lợi / chế độ",
      company: "Thông tin công ty",
      team: "Thông tin dự án / team",
      policy: "Chính sách tuyển dụng",
      interview: "Quy trình phỏng vấn",
      headcount: "Số lượng cần tuyển",
      timeline: "Thời gian tuyển",
      priority: "Độ ưu tiên",
    },
    dataBlock: "DỮ_LIỆU_VỊ_TRÍ",
    variant: "BIẾN_THỂ",
    variantHint:
      "Hãy chọn cách mở đầu và nhấn mạnh khác lần trước nhưng không đổi sự thật trong dữ liệu vị trí.",
    writeNow: "Viết mô tả công việc LinkedIn mới ngay bây giờ:",
    strictRetry:
      "LƯU Ý: Lần trước vi phạm quy tắc. Viết lại hoàn toàn, tuyệt đối không dùng từ cấm.",
  },
  en: {
    contract: {
      FULL_TIME: "Full-time",
      PART_TIME: "Part-time",
      CONTRACT: "Contract",
      INTERN: "Internship",
    },
    workMode: {
      ONSITE: "On-site",
      HYBRID: "Hybrid",
      REMOTE: "Remote",
    },
    urgency: {
      URGENT: "Urgent",
    },
    fields: {
      title: "Job title",
      location: "Location",
      contract: "Employment type",
      workMode: "Work arrangement",
      requirements: "Requirements",
      salary: "Salary range",
      benefits: "Benefits",
      company: "Company information",
      team: "Project / team",
      policy: "Hiring policy",
      interview: "Interview process",
      headcount: "Headcount",
      timeline: "Hiring timeline",
      priority: "Priority",
    },
    dataBlock: "POSITION_DATA",
    variant: "VARIATION",
    variantHint:
      "Use a different opening and emphasis than before while keeping the same facts from the position data.",
    writeNow: "Write the new LinkedIn job post copy now:",
    strictRetry:
      "NOTE: The previous attempt broke the rules. Rewrite completely and avoid all forbidden terms.",
  },
} as const;

function labelEnum(
  value: string | null | undefined,
  map: Record<string, string>,
): string | null {
  if (!value?.trim()) return null;
  return map[value.trim()] ?? value.trim();
}

function pushLine(lines: string[], label: string, value: string | number | null | undefined) {
  if (value == null) return;
  const text = typeof value === "string" ? value.trim() : String(value);
  if (!text) return;
  lines.push(`${label}: ${text}`);
}

export function getLinkedInJobPostSystemRules(lang: WorkspaceLanguage): string {
  if (lang === "en") {
    return `
You are an HR / talent acquisition specialist writing a LinkedIn hiring post.

GOAL: Write LinkedIn post copy that attracts candidates, using only [POSITION_DATA]. There is no pre-written marketing blurb — synthesize from the fields provided.

MANDATORY RULES:
1. Use ONLY information in [POSITION_DATA]. Do not invent salary, tech stack, benefits, location, or interview steps.
2. Do not inflate numbers or requirements.
3. FORBIDDEN: demo, test, pilot, placeholder, lorem, fake, bot; any mention of AI/ChatGPT/OpenClaw/VClaw; meta lines like "Note", "You are reading", disclaimers in brackets.
4. Tone: professional, direct, like a real recruiter — no fluff, no emojis, no hashtags, no generic "passionate about innovation" unless supported by data.
5. Structure: specific opener → role & responsibilities → requirements → benefits (if any) → short apply CTA. Mention work arrangement / employment type when present.
6. Length 600–1200 characters, natural line breaks.
7. Output plain text only. No markdown, no "Output:" heading, no explanation to the prompt reader.
8. Write the entire post in English (IT terms in English are fine when the JD uses them).
`.trim();
  }

  return `
Bạn là HR / talent acquisition viết bài tuyển dụng LinkedIn.

MỤC TIÊU: Soạn nội dung đăng LinkedIn thu hút ứng viên, chỉ từ [DỮ_LIỆU_VỊ_TRÍ]. Không có mô tả marketing sẵn — tổng hợp từ các trường được cung cấp.

QUY TẮC BẮT BUỘC:
1. CHỈ dùng thông tin trong [DỮ_LIỆU_VỊ_TRÍ]. Không bịa thêm lương, stack, quyền lợi, địa điểm, quy trình PV nếu không có trong dữ liệu.
2. Không suy diễn số liệu, không phóng đại yêu cầu.
3. CẤM: demo, test, pilot, placeholder, lorem, fake, bot; mọi nhắc tới AI/ChatGPT/OpenClaw/VClaw; câu meta kiểu "Lưu ý", "Bạn đang đọc", disclaimer trong ngoặc.
4. Giọng văn: chuyên nghiệp, trực diện, như người tuyển dụng thật — không sáo rỗng, không emoji, không hashtag.
5. Cấu trúc: mở đầu cụ thể → vai trò & việc làm → yêu cầu → quyền lợi (nếu có) → cách ứng tuyển ngắn.
6. Độ dài 600–1200 ký tự, xuống dòng tự nhiên.
7. Chỉ trả về nội dung bài đăng (plain text). Không markdown, không giải thích cho người đọc prompt.
8. Viết toàn bộ bài bằng tiếng Việt (thuật ngữ IT tiếng Anh được phép nếu JD gốc dùng).
`.trim();
}

function formatFactsBlock(facts: LinkedInJobFacts, lang: WorkspaceLanguage): string {
  const L = LABELS[lang];
  const lines: string[] = [];

  pushLine(lines, L.fields.title, facts.title);
  pushLine(lines, L.fields.location, facts.location);
  pushLine(lines, L.fields.contract, labelEnum(facts.contractType, L.contract));
  pushLine(lines, L.fields.workMode, labelEnum(facts.workMode, L.workMode));
  pushLine(lines, L.fields.requirements, facts.requirements);
  pushLine(lines, L.fields.salary, facts.salaryRange);
  pushLine(lines, L.fields.benefits, facts.benefits);
  pushLine(lines, L.fields.company, facts.companyInfo);
  pushLine(lines, L.fields.team, facts.projectTeamInfo);
  pushLine(lines, L.fields.policy, facts.hiringPolicy);
  pushLine(lines, L.fields.interview, facts.interviewProcess);
  pushLine(lines, L.fields.headcount, facts.headcount);
  pushLine(lines, L.fields.timeline, facts.hiringTimeline);
  pushLine(
    lines,
    L.fields.priority,
    facts.urgencyLevel && facts.urgencyLevel !== "NORMAL"
      ? labelEnum(facts.urgencyLevel, L.urgency)
      : null,
  );

  return lines.join("\n");
}

export function buildLinkedInJobPostPrompt(
  facts: LinkedInJobFacts,
  options?: { variationSeed?: string; strictRetry?: boolean; locale?: WorkspaceLanguage },
): string {
  const lang = options?.locale ?? "vi";
  const L = LABELS[lang];
  const seed = options?.variationSeed ?? String(Date.now());
  const strictNote = options?.strictRetry ? `\n${L.strictRetry}` : "";
  const dataTag = lang === "en" ? "[POSITION_DATA]" : "[DỮ_LIỆU_VỊ_TRÍ]";
  const variantTag = lang === "en" ? "[VARIATION]" : "[BIẾN_THỂ]";

  return `
${getLinkedInJobPostSystemRules(lang)}
${strictNote}

${dataTag}
${formatFactsBlock(facts, lang)}

${variantTag}
Session: ${seed}
${L.variantHint}

${L.writeNow}
`.trim();
}
