import type { WorkspaceLanguage } from "@/lib/recruitment/workspace-language";
import { truncateConnectNote } from "@/lib/recruitment/connection-note";

function firstName(fullName: string): string {
  const part = fullName.trim().split(/\s+/)[0];
  return part || fullName.trim() || "bạn";
}

/** Mẫu ghi chú kết nối khi AI không khả dụng. */
export function buildJdConnectNoteFallback(params: {
  candidateName: string;
  jobTitle: string;
  matchScore?: number | null;
  locale?: WorkspaceLanguage;
}): string {
  const name = firstName(params.candidateName);
  const title = params.jobTitle.trim();
  const fit =
    params.matchScore != null && params.matchScore >= 60
      ? params.locale === "en"
        ? `Your profile looks like a strong match (${params.matchScore}%).`
        : `Profile của bạn khá phù hợp (${params.matchScore}%).`
      : params.locale === "en"
        ? "Your background caught our attention for this role."
        : "Mình thấy profile của bạn phù hợp với vị trí này.";

  const body =
    params.locale === "en"
      ? `Hi ${name}, I'm hiring for ${title} at our team. ${fit} Would love to connect and share more about the opportunity.`
      : `Chào ${name}, mình đang tuyển ${title}. ${fit} Rất mong được kết nối để trao đổi thêm về cơ hội này.`;

  return truncateConnectNote(body);
}
