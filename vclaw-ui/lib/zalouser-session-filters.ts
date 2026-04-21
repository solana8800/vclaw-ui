/** Một dòng trong kết quả sessions.list (gateway trả về dạng lỏng). */
export type SessionListEntry = {
  key?: string;
  sessionKey?: string;
  title?: string;
  label?: string;
  displayName?: string;
  derivedTitle?: string;
  lastMessagePreview?: string;
  lastTo?: string;
  lastThreadId?: string | number;
  updatedAt?: number;
  [key: string]: unknown;
};

export function sessionListRowKey(e: SessionListEntry): string {
  const k = e.key ?? e.sessionKey;
  return typeof k === "string" ? k.trim() : "";
}

function entryKey(e: SessionListEntry): string | null {
  const k = sessionListRowKey(e);
  return k ? k : null;
}

/** Giữ session có vẻ liên quan zalouser (theo key hoặc search đã lọc phía server). */
export function filterSessionsForZalouserUi(entries: SessionListEntry[]): SessionListEntry[] {
  return entries.filter((e) => {
    const k = entryKey(e);
    if (!k) return false;
    if (k.toLowerCase().includes("zalouser")) return true;
    const t = `${e.title ?? ""} ${e.label ?? ""}`.toLowerCase();
    return t.includes("zalo");
  });
}
