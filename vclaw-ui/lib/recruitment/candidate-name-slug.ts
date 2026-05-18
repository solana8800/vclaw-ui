/** Slug tên ứng viên cho tên file (CV, PDF hồ sơ…) — dùng được cả client lẫn server. */
export function slugifyCandidateName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/gi, "d")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "ung-vien";
}

export function buildCandidateResumeFileName(
  candidateId: string,
  ext: string,
  candidateName?: string | null,
): string {
  const safeId = candidateId.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 64) || "candidate";
  const slug = candidateName?.trim() ? slugifyCandidateName(candidateName) : "";
  const shortId = safeId.slice(-8);
  if (slug) return `cv-${slug}-${shortId}.${ext}`;
  return `cv-${safeId}.${ext}`;
}
