import path from "path";

/** Đường dẫn mặc định CLI in ra (docs OpenClaw / zalouser, account default). */
export const ZALOUSER_CLI_QR_DEFAULT_UNIX = "/tmp/openclaw/openclaw-zalouser-qr-default.png";

/** Tên file QR do CLI in (vd. openclaw-zalouser-qr-default.png). */
export function isAllowedOpenclawZalouserQrBasename(filename: string): boolean {
  return /^openclaw-zalouser-qr-[a-z0-9._-]+\.png$/i.test(filename);
}

/**
 * Chuẩn hoá đường dẫn từ env — chỉ chấp nhận đường dẫn tuyệt đối và basename khớp pattern.
 * Trả `null` nếu không hợp lệ.
 */
export function resolveOpenclawZalouserCliQrFile(raw: string | undefined): string | null {
  const trimmed = raw?.trim();
  if (!trimmed || trimmed.includes("\0")) return null;
  if (!path.isAbsolute(trimmed)) return null;
  const resolved = path.resolve(trimmed);
  if (!isAllowedOpenclawZalouserQrBasename(path.basename(resolved))) return null;
  return resolved;
}

/**
 * Đường dẫn file PNG để API đọc: ưu tiên `OPENCLAW_ZALOUSER_QR_FILE`, không thì (Unix)
 * dùng đúng path mặc định OpenClaw CLI in ra.
 */
export function resolveZalouserCliQrFilePathForServer(): string | null {
  const fromEnv = resolveOpenclawZalouserCliQrFile(process.env.OPENCLAW_ZALOUSER_QR_FILE);
  if (fromEnv) return fromEnv;
  if (process.platform === "win32") return null;
  return resolveOpenclawZalouserCliQrFile(ZALOUSER_CLI_QR_DEFAULT_UNIX);
}
