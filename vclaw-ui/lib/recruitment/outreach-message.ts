import type { WorkspaceLanguage } from "@/lib/recruitment/workspace-language";

function firstName(fullName: string): string {
  const part = fullName.trim().split(/\s+/)[0];
  return part || fullName.trim() || "bạn";
}

/** Mẫu tin giới thiệu JD — chỉnh sửa trước khi gửi (HITL). */
export function buildJdOutreachDraft(params: {
  candidateName: string;
  jobTitle: string;
  jobRequirements?: string | null;
  locale?: WorkspaceLanguage;
}): string {
  const name = firstName(params.candidateName);
  const title = params.jobTitle.trim();
  const req = params.jobRequirements?.trim();
  const reqLine =
    req && req.length > 0 ?
      req.length > 220 ?
        `${req.slice(0, 217)}…`
      : req
    : null;

  if (params.locale === "en") {
    return [
      `Hi ${name},`,
      ``,
      `I'm reaching out about our ${title} opening. Your background looks like a strong fit.`,
      reqLine ? `Key points: ${reqLine}` : null,
      `If you're open to it, I'd love to share more details and hear about your interest.`,
      ``,
      `Would you be open to a quick chat this week?`,
    ]
      .filter(Boolean)
      .join("\n");
  }

  return [
    `Chào ${name},`,
    ``,
    `Mình liên hệ về vị trí ${title} đang tuyển — thấy profile của bạn khá phù hợp.`,
    reqLine ? `Một vài điểm chính: ${reqLine}` : null,
    `Nếu bạn quan tâm, mình gửi thêm JD chi tiết và trao đổi nhanh về cơ hội apply nhé.`,
    ``,
    `Bạn có thể phản hồi khi rảnh không? Cảm ơn bạn!`,
  ]
    .filter(Boolean)
    .join("\n");
}
