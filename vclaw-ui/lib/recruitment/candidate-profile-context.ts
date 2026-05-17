import { parseExtractedProfileInfo } from "@/lib/recruitment/candidate-profile";

export type CandidateProfileContextInput = {
  name: string;
  headline?: string | null;
  location?: string | null;
  currentCompany?: string | null;
  profileUrl?: string | null;
  extractedInfo?: string | null;
  source?: string | null;
  linkedinConnectionStatus?: string | null;
};

function block(title: string, lines: string[]): string {
  if (lines.length === 0) return "";
  return `${title}:\n${lines.map((l) => `- ${l}`).join("\n")}`;
}

/** Gom toàn bộ metadata ứng viên thành text cho AI đánh giá JD. */
export function buildCandidateProfileContext(input: CandidateProfileContextInput): string {
  const info = parseExtractedProfileInfo(input.extractedInfo);
  const lines: string[] = [];

  lines.push(`Tên: ${input.name}`);
  if (input.headline) lines.push(`Headline: ${input.headline}`);
  if (input.currentCompany) lines.push(`Công ty hiện tại: ${input.currentCompany}`);
  const location = input.location || info.location;
  if (location) lines.push(`Khu vực: ${location}`);
  if (input.profileUrl) lines.push(`LinkedIn: ${input.profileUrl}`);
  if (input.linkedinConnectionStatus) lines.push(`Kết nối LinkedIn: ${input.linkedinConnectionStatus}`);
  if (input.source) lines.push(`Nguồn: ${input.source}`);

  if (info.about) lines.push("", `Giới thiệu:\n${info.about}`);

  const sections = [
    block("Kinh nghiệm", info.experiences ?? []),
    block("Học vấn", info.education ?? []),
    block("Kỹ năng", info.skills ?? []),
    block("Dự án", info.projects ?? []),
    block("Ngôn ngữ", info.languages ?? []),
    block("Đề xuất / nhận xét", info.recommendations ?? []),
  ].filter(Boolean);

  if (sections.length > 0) {
    lines.push("", ...sections);
  }

  if (info.scrapedAt) lines.push("", `Profile cập nhật lúc: ${info.scrapedAt}`);

  return lines.join("\n");
}
