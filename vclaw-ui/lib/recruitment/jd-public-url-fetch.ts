import "server-only";
import * as cheerio from "cheerio";

const FETCH_TIMEOUT_MS = 45_000;
const MAX_CONTENT_CHARS = 48_000;

export type JdFetchResult = {
  content: string;
  title?: string;
};

function truncateContent(text: string): string {
  const trimmed = text.trim();
  if (trimmed.length <= MAX_CONTENT_CHARS) return trimmed;
  return `${trimmed.slice(0, MAX_CONTENT_CHARS)}\n\n…(đã rút gọn nội dung trang)`;
}

/** Chuẩn hóa URL JD public — chỉ http(s). */
export function normalizePublicJdUrl(raw: string): { ok: true; url: string } | { ok: false; error: string } {
  const input = raw.trim();
  if (!input) return { ok: false, error: "Nhập link JD công khai." };
  try {
    const withProto = /^https?:\/\//i.test(input) ? input : `https://${input}`;
    const parsed = new URL(withProto);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return { ok: false, error: "Chỉ hỗ trợ link http hoặc https." };
    }
    return { ok: true, url: parsed.toString() };
  } catch {
    return { ok: false, error: "Link JD không hợp lệ." };
  }
}

async function fetchWithTimeout(url: string, init?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/** HTML thô → trích xuất nội dung body và loại bỏ các thẻ layout rác bằng Cheerio */
export function htmlToPlainText(html: string): string {
  try {
    const $ = cheerio.load(html);

    // Loại bỏ tất cả các thẻ rác/layout/script/style làm loãng bối cảnh AI
    $("script, style, noscript, header, footer, nav, aside, svg, iframe, link, meta").remove();

    // Thay thế thẻ <br> thành ký tự xuống dòng
    $("br").replaceWith("\n");

    // Thêm ký tự xuống dòng sau các thẻ block phổ biến để tránh dính chữ
    $("p, div, h1, h2, h3, h4, h5, h6, li, tr").each((_, el) => {
      $(el).append("\n");
    });

    // Lấy toàn bộ text thô sạch từ thẻ body (hoặc toàn trang nếu không có body)
    const rawText = $("body").length ? $("body").text() : $.text();

    // Làm sạch khoảng trắng và các thực thể HTML thực tế
    return rawText
      .replace(/\s+\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .replace(/[ \t]{2,}/g, " ")
      .trim();
  } catch (e) {
    console.error("[htmlToPlainText] Lỗi parse HTML bằng Cheerio, dùng fallback Regex:", e);
    // Fallback Regex phòng trường hợp Cheerio bị lỗi bất ngờ
    return html
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }
}

export async function fetchJdViaHtml(url: string): Promise<{ ok: true; text: string; title?: string } | { ok: false; error: string }> {
  try {
    const res = await fetchWithTimeout(url, {
      headers: {
        Accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
        "User-Agent":
          "Mozilla/5.0 (compatible; VClawRecruitment/1.0; +https://vclaw.local)",
      },
      redirect: "follow",
    });

    if (!res.ok) {
      return { ok: false, error: `Không tải được trang (${res.status}).` };
    }

    const html = await res.text();
    const $ = cheerio.load(html);
    const pageTitle = $("title").text().trim();
    const text = htmlToPlainText(html);
    
    if (!text || text.length < 80) {
      return { ok: false, error: "Trang không có nội dung đọc được (có thể cần đăng nhập)." };
    }
    return { ok: true, text, title: pageTitle };
  } catch (e) {
    console.error("[fetchJdViaHtml] Lỗi tải HTML trực tiếp:", e);
    return { ok: false, error: "Không tải được nội dung HTML từ link." };
  }
}

/** Tải trực tiếp nội dung HTML từ link JD công khai và làm sạch trước khi gửi cho AI. */
export async function fetchPublicJdContent(
  url: string,
): Promise<{ ok: true; result: JdFetchResult } | { ok: false; error: string }> {
  const normalized = normalizePublicJdUrl(url);
  if (!normalized.ok) return normalized;

  // Luôn fetch trực tiếp HTML và làm sạch văn bản để tránh rườm rà cho người dùng
  const html = await fetchJdViaHtml(normalized.url);
  if (!html.ok) return html;

  return {
    ok: true,
    result: {
      content: truncateContent(html.text),
      title: html.title || undefined,
    },
  };
}
