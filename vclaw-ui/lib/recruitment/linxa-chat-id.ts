/** Lấy chatId Linxa từ cột DB hoặc profileUrl dạng linxa://chat/… */
export function resolveLinxaChatId(
  linxaChatId?: string | null,
  profileUrl?: string | null,
): string | null {
  const direct = linxaChatId?.trim();
  if (direct) return direct;

  const url = profileUrl?.trim() ?? "";
  if (!url.startsWith("linxa://chat/")) return null;
  const id = decodeURIComponent(url.slice("linxa://chat/".length)).trim();
  return id || null;
}
