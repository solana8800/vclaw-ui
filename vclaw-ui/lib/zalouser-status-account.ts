/** Thông tin tài khoản zalouser lấy từ payload `channels.status` (gateway). */
export type ZalouserGatewayAccountInfo = {
  accountId: string;
  displayName: string;
  linked: boolean;
  running?: boolean;
};

/**
 * `channels.status` trả `channelAccounts.zalouser` (mảng snapshot) và
 * `channelDefaultAccountId.zalouser`.
 */
export function pickZalouserAccountFromChannelsStatus(status: unknown): ZalouserGatewayAccountInfo | null {
  if (!status || typeof status !== "object") return null;
  const s = status as Record<string, unknown>;
  const rawAccounts = s.channelAccounts;
  if (!rawAccounts || typeof rawAccounts !== "object") return null;
  const zList = (rawAccounts as Record<string, unknown>)["zalouser"];
  if (!Array.isArray(zList) || zList.length === 0) return null;

  const defaultMap = s.channelDefaultAccountId;
  const defaultId =
    defaultMap && typeof defaultMap === "object"
      ? String((defaultMap as Record<string, unknown>)["zalouser"] ?? "default")
      : "default";

  let pick: Record<string, unknown> | null = null;
  for (const entry of zList) {
    if (entry && typeof entry === "object") {
      const row = entry as { accountId?: unknown };
      if (String(row.accountId ?? "") === defaultId) {
        pick = entry as Record<string, unknown>;
        break;
      }
    }
  }
  if (!pick) {
    const first = zList[0];
    pick = first && typeof first === "object" ? (first as Record<string, unknown>) : null;
  }
  if (!pick) return null;

  const accountId = String(pick.accountId ?? defaultId ?? "default");
  const nameRaw = pick.name;
  const displayName =
    typeof nameRaw === "string" && nameRaw.trim().length > 0 ? nameRaw.trim() : accountId;
  return {
    accountId,
    displayName,
    linked: pick.linked === true,
    running: pick.running === true,
  };
}
