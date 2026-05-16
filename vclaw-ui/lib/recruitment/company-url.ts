/** URL Company Page mặc định: cấu hình tuyển dụng → ghi đè trên job (tránh slug cũ trên DB). */
export function resolveLinkedInCompanyUrl(
  settingsUrl?: string | null,
  jobUrl?: string | null,
): string {
  const fromSettings = settingsUrl?.trim();
  if (fromSettings) return fromSettings.replace(/\/+$/, "") + "/";
  const fromJob = jobUrl?.trim();
  if (fromJob) return fromJob.replace(/\/+$/, "") + "/";
  return "";
}
