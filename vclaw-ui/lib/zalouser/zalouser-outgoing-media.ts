/** Đồng bộ ý nghĩa với `prepareZalouserOutboundFromText` trong OpenClaw `zalouser/src/outbound-media.ts` (reply bot gateway). */
type ZalouserOutgoingMessage = {
  message: string;
  mediaUrl?: string;
};

const TRAILING_URL_PUNCTUATION = /[.,!?;:)\]}]+$/;
const URL_TOKEN_REGEX = /https?:\/\/\S+/gi;
const IMAGE_PATH_REGEX = /\.(png|jpg|jpeg|gif|webp)$/i;

function stripTrailingUrlPunctuation(value: string): string {
  return value.replace(TRAILING_URL_PUNCTUATION, "");
}

function isVietQrImageUrl(url: URL): boolean {
  return url.protocol === "https:" && url.hostname === "img.vietqr.io" && url.pathname.startsWith("/image/");
}

function isRegularImageUrl(url: URL): boolean {
  return IMAGE_PATH_REGEX.test(url.pathname);
}

function findOutgoingMediaUrl(message: string): { raw: string; mediaUrl: string } | null {
  for (const match of message.matchAll(URL_TOKEN_REGEX)) {
    const raw = match[0];
    const mediaUrl = stripTrailingUrlPunctuation(raw);
    try {
      const parsed = new URL(mediaUrl);
      if (isVietQrImageUrl(parsed) || isRegularImageUrl(parsed)) {
        return { raw, mediaUrl };
      }
    } catch {
      // Bỏ qua token giống URL nhưng không parse được.
    }
  }
  return null;
}

function removeMediaUrlFromCaption(message: string, rawUrl: string): string {
  return message
    .replace(rawUrl, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

export function prepareZalouserOutgoingMessage(
  message: string,
  explicitMediaUrl?: string | null,
): ZalouserOutgoingMessage {
  if (explicitMediaUrl?.trim()) {
    return { message, mediaUrl: explicitMediaUrl.trim() };
  }

  const detected = findOutgoingMediaUrl(message);
  if (!detected) return { message };

  return {
    message: removeMediaUrlFromCaption(message, detected.raw),
    mediaUrl: detected.mediaUrl,
  };
}
