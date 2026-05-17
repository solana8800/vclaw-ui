const LINXA_SMART_INBOX_BASE = "https://app.uselinxa.com/smart-inbox";

/** Deep link tới Smart Inbox; thử query chatId (cập nhật khi Linxa xác nhận format). */
export function buildLinxaSmartInboxUrl(chatId?: string | null): string {
  if (!chatId?.trim()) return LINXA_SMART_INBOX_BASE;
  const q = new URLSearchParams({ chatId: chatId.trim() });
  return `${LINXA_SMART_INBOX_BASE}?${q.toString()}`;
}
