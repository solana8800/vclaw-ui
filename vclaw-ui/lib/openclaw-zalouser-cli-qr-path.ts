import path from "path";

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
