import "server-only";

const FETCH_TIMEOUT_MS = 45_000;
const MAX_CONTENT_CHARS = 48_000;

export type JdFetchSource = "firecrawl" | "html";

export type JdFetchResult = {
  content: string;
  source: JdFetchSource;
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

/** Firecrawl v1 scrape → markdown. */
export async function fetchJdViaFirecrawl(
  url: string,
  apiKey: string,
): Promise<{ ok: true; markdown: string } | { ok: false; error: string }> {
  const token = apiKey.trim();
  if (!token) return { ok: false, error: "Chưa cấu hình Firecrawl API key." };

  try {
    const res = await fetchWithTimeout("https://api.firecrawl.dev/v1/scrape", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url,
        formats: ["markdown"],
        onlyMainContent: true,
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.warn("[fetchJdViaFirecrawl]", res.status, body.slice(0, 400));
      return { ok: false, error: `Firecrawl lỗi (${res.status}).` };
    }

    const json = (await res.json()) as {
      success?: boolean;
      data?: { markdown?: string; content?: string };
      markdown?: string;
    };

    const markdown =
      json.data?.markdown?.trim() ||
      json.data?.content?.trim() ||
      json.markdown?.trim() ||
      "";

    if (!markdown) {
      return { ok: false, error: "Firecrawl không trả về nội dung." };
    }
    return { ok: true, markdown };
  } catch (e) {
    console.error("[fetchJdViaFirecrawl]", e);
    return { ok: false, error: "Không kết nối được Firecrawl." };
  }
}

/** HTML thô → text đơn giản (fallback khi không có Firecrawl). */
export function htmlToPlainText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|h[1-6]|li|tr)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/\s+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

export async function fetchJdViaHtml(url: string): Promise<{ ok: true; text: string } | { ok: false; error: string }> {
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
    const text = htmlToPlainText(html);
    if (!text || text.length < 80) {
      return { ok: false, error: "Trang không có nội dung đọc được (có thể cần đăng nhập)." };
    }
    return { ok: true, text };
  } catch (e) {
    console.error("[fetchJdViaHtml]", e);
    return { ok: false, error: "Không tải được nội dung HTML từ link." };
  }
}

/** Ưu tiên Firecrawl markdown; không có token hoặc lỗi → fetch HTML. */
export async function fetchPublicJdContent(
  url: string,
  options?: { firecrawlToken?: string | null },
): Promise<{ ok: true; result: JdFetchResult } | { ok: false; error: string }> {
  const normalized = normalizePublicJdUrl(url);
  if (!normalized.ok) return normalized;

  const token =
    options?.firecrawlToken?.trim() || process.env.FIRECRAWL_API_KEY?.trim() || "";

  if (token) {
    const fc = await fetchJdViaFirecrawl(normalized.url, token);
    if (fc.ok) {
      return {
        ok: true,
        result: { content: truncateContent(fc.markdown), source: "firecrawl" },
      };
    }
    console.warn("[fetchPublicJdContent] Firecrawl fallback HTML:", fc.error);
  }

  const html = await fetchJdViaHtml(normalized.url);
  if (!html.ok) return html;

  return {
    ok: true,
    result: { content: truncateContent(html.text), source: "html" },
  };
}
