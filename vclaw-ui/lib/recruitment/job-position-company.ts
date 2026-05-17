/** Nhãn công ty ngắn cho sidebar / header filter vị trí. */
export function resolveJobPositionCompanyLabel(job: {
  companyInfo?: string | null;
  companyUrl?: string | null;
}): string | null {
  const fromInfo = companyLabelFromInfo(job.companyInfo);
  if (fromInfo) return fromInfo;

  return companyLabelFromLinkedInUrl(job.companyUrl);
}

function companyLabelFromInfo(companyInfo?: string | null): string | null {
  const raw = companyInfo?.trim();
  if (!raw) return null;

  const firstLine =
    raw
      .split("\n")
      .map((l) => l.trim())
      .find((l) => l.length > 0) ?? "";

  const cleaned = firstLine
    .replace(/^#+\s*/, "")
    .replace(/^\*+\s*|\*+$/g, "")
    .replace(/^(công ty|cty|company)\s*[:：\-]\s*/i, "")
    .trim();

  if (!cleaned) return null;
  if (cleaned.length <= 80) return cleaned;
  return `${cleaned.slice(0, 77)}…`;
}

function companyLabelFromLinkedInUrl(companyUrl?: string | null): string | null {
  const url = companyUrl?.trim();
  if (!url) return null;

  try {
    const parsed = new URL(url.startsWith("http") ? url : `https://${url}`);
    const match = parsed.pathname.match(/\/company\/([^/]+)/i);
    const slug = match?.[1] ? decodeURIComponent(match[1]) : null;
    if (!slug || /^\d+$/.test(slug)) return null;
    return slugToTitleLabel(slug);
  } catch {
    return null;
  }
}

function slugToTitleLabel(slug: string): string {
  return slug
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
