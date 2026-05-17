export const CV_STORE_MAX_CHARS = 12_000;
export const CV_PROMPT_MAX_CHARS = 6_000;

/** Chuẩn hóa text/markdown sau parse — bỏ khoảng trắng thừa, không giữ ảnh. */
export function normalizeResumeMarkdown(raw: string): string {
  return raw
    .replace(/\r\n/g, "\n")
    .replace(/!\[[^\]]*]\([^)]+\)/g, "")
    .replace(/\[([^\]]+)]\([^)]+\)/g, "$1")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]+\n/g, "\n")
    .trim();
}

export function prepareCvTextForPrompt(cvText: string): string {
  const trimmed = cvText.trim();
  if (trimmed.length <= CV_PROMPT_MAX_CHARS) return trimmed;
  return `${trimmed.slice(0, CV_PROMPT_MAX_CHARS)}\n\n…(đã rút gọn cho chấm JD)`;
}

export function hardTruncateForStorage(text: string): string {
  if (text.length <= CV_STORE_MAX_CHARS) return text;
  return `${text.slice(0, CV_STORE_MAX_CHARS)}\n\n…(đã rút gọn)`;
}
