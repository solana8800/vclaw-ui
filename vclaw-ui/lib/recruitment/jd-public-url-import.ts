import "server-only";

import { gateway, GatewayHttpError } from "@/lib/gateway/server";
import type { WorkspaceLanguage } from "@/lib/recruitment/workspace-language";

export type JobPositionImportDraft = {
  title: string;
  description?: string | null;
  requirements?: string | null;
  salaryRange?: string | null;
  benefits?: string | null;
  interviewProcess?: string | null;
  hiringPolicy?: string | null;
  companyInfo?: string | null;
  projectTeamInfo?: string | null;
  headcount?: number | null;
  hiringTimeline?: string | null;
  urgencyLevel?: "NORMAL" | "URGENT" | null;
  contractType?: "FULL_TIME" | "PART_TIME" | "CONTRACT" | "INTERN" | null;
  workMode?: "ONSITE" | "HYBRID" | "REMOTE" | null;
  companyUrl?: string | null;
};

const CONTRACT_TYPES = new Set<"FULL_TIME" | "PART_TIME" | "CONTRACT" | "INTERN">([
  "FULL_TIME",
  "PART_TIME",
  "CONTRACT",
  "INTERN",
]);
const WORK_MODES = new Set<"ONSITE" | "HYBRID" | "REMOTE">(["ONSITE", "HYBRID", "REMOTE"]);
const URGENCY = new Set<"NORMAL" | "URGENT">(["NORMAL", "URGENT"]);

function stripJsonFence(raw: string): string {
  return raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

function asOptionalString(v: unknown): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  return s || null;
}

function asHeadcount(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = typeof v === "number" ? v : parseInt(String(v), 10);
  if (!Number.isFinite(n) || n < 1) return null;
  return Math.min(999, Math.round(n));
}

function pickEnum<T extends string>(v: unknown, allowed: Set<T>): T | null {
  const u = String(v ?? "").trim().toUpperCase();
  return allowed.has(u as T) ? (u as T) : null;
}

export function parseJobPositionImportDraft(raw: string): JobPositionImportDraft | null {
  const jsonText = stripJsonFence(raw);
  const start = jsonText.indexOf("{");
  const end = jsonText.lastIndexOf("}");

  // Trường hợp 1: Nhận diện và bóc tách cấu trúc JSON chuẩn nếu có
  if (start >= 0 && end > start) {
    try {
      const data = JSON.parse(jsonText.slice(start, end + 1)) as Record<string, unknown>;
      const title = asOptionalString(data.title);
      if (title) {
        return {
          title,
          description: asOptionalString(data.description),
          requirements: asOptionalString(data.requirements),
          salaryRange: asOptionalString(data.salaryRange),
          benefits: asOptionalString(data.benefits),
          interviewProcess: asOptionalString(data.interviewProcess),
          hiringPolicy: asOptionalString(data.hiringPolicy),
          companyInfo: asOptionalString(data.companyInfo),
          projectTeamInfo: asOptionalString(data.projectTeamInfo),
          headcount: asHeadcount(data.headcount),
          hiringTimeline: asOptionalString(data.hiringTimeline),
          urgencyLevel: pickEnum(data.urgencyLevel, URGENCY),
          contractType: pickEnum(data.contractType, CONTRACT_TYPES),
          workMode: pickEnum(data.workMode, WORK_MODES),
          companyUrl: asOptionalString(data.companyUrl),
        };
      }
    } catch (e) {
      console.warn("[parseJobPositionImportDraft] Phân tích JSON thất bại, tự động chuyển sang cơ chế Plain Text dự phòng:", e);
    }
  }

  // Trường hợp 2 (Dự phòng thông minh): AI chỉ phản hồi Plain Text hoặc JSON lỗi
  // Chúng ta tự động lấy dòng đầu tiên không trống làm tên công việc (Title) và các dòng còn lại làm Mô tả (Description)
  const lines = raw
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length > 0) {
    // Loại bỏ các ký tự tiêu đề markdown nếu AI định dạng dạng '# Tên vị trí'
    const title = lines[0]!.replace(/^#+\s*/, "");
    const description = lines.slice(1).join("\n\n");
    
    console.log("[parseJobPositionImportDraft] Đã kích hoạt bộ phân tích Plain Text dự phòng. Tên công việc trích xuất được:", title);
    
    return {
      title: title.slice(0, 100), // Giới hạn độ dài tiêu đề để không lỗi database
      description: description || null,
      requirements: "Vui lòng xem thông tin chi tiết trong mô tả công việc ở trên.",
    };
  }

  return null;
}

function buildImportPrompt(
  pageContent: string,
  sourceUrl: string,
  locale: WorkspaceLanguage,
): string {
  const isEn = locale === "en";

  if (isEn) {
    return `You are an HR expert. Extract information from the public job posting content below into a JSON for the internal ATS system.

Source URL: ${sourceUrl}
Note: Extract and translate all text fields to English.

Rules:
- Use ONLY information from the page; do not invent.
- title: mandatory, short (job title).
- description: job description/responsibilities (markdown or text, allow line breaks).
- requirements: candidate requirements (skills, experience, education).
- salaryRange, benefits, interviewProcess, hiringPolicy, companyInfo, projectTeamInfo: string or null.
- headcount: positive integer or null if not stated.
- hiringTimeline: hiring timeline if any.
- urgencyLevel: "NORMAL" or "URGENT" only (URGENT if JD emphasizes urgent hiring).
- contractType: FULL_TIME | PART_TIME | CONTRACT | INTERN or null only.
- workMode: ONSITE | HYBRID | REMOTE or null only.
- companyUrl: LinkedIn company URL if on the page, or null.

Return EXACTLY a JSON object (no markdown wrappers), schema:
{
  "title": string,
  "description": string | null,
  "requirements": string | null,
  "salaryRange": string | null,
  "benefits": string | null,
  "interviewProcess": string | null,
  "hiringPolicy": string | null,
  "companyInfo": string | null,
  "projectTeamInfo": string | null,
  "headcount": number | null,
  "hiringTimeline": string | null,
  "urgencyLevel": "NORMAL" | "URGENT" | null,
  "contractType": "FULL_TIME" | "PART_TIME" | "CONTRACT" | "INTERN" | null,
  "workMode": "ONSITE" | "HYBRID" | "REMOTE" | null,
  "companyUrl": string | null
}

=== PAGE CONTENT ===
${pageContent}`;
  }

  const langNote = "Các trường text ưu tiên tiếng Việt nếu JD gốc là tiếng Việt.";

  return `Bạn là chuyên gia HR. Từ nội dung trang tuyển dụng công khai dưới đây, trích xuất thông tin vào JSON cho hệ thống ATS nội bộ.

Nguồn URL: ${sourceUrl}
${langNote}

Quy tắc:
- Chỉ dùng thông tin có trong trang; không bịa.
- title: bắt buộc, ngắn gọn (tên vị trí).
- description: mô tả công việc / trách nhiệm (markdown hoặc text, có xuống dòng).
- requirements: yêu cầu ứng viên (kỹ năng, kinh nghiệm, học vấn).
- salaryRange, benefits, interviewProcess, hiringPolicy, companyInfo, projectTeamInfo: string hoặc null.
- headcount: số nguyên dương hoặc null nếu không nêu.
- hiringTimeline: thời gian tuyển nếu có.
- urgencyLevel: chỉ "NORMAL" hoặc "URGENT" (URGENT nếu JD nhấn mạnh tuyển gấp).
- contractType: chỉ FULL_TIME | PART_TIME | CONTRACT | INTERN hoặc null.
- workMode: chỉ ONSITE | HYBRID | REMOTE hoặc null.
- companyUrl: URL LinkedIn company nếu có trên trang, hoặc null.

Trả về ĐÚNG một object JSON (không markdown bọc ngoài), schema:
{
  "title": string,
  "description": string | null,
  "requirements": string | null,
  "salaryRange": string | null,
  "benefits": string | null,
  "interviewProcess": string | null,
  "hiringPolicy": string | null,
  "companyInfo": string | null,
  "projectTeamInfo": string | null,
  "headcount": number | null,
  "hiringTimeline": string | null,
  "urgencyLevel": "NORMAL" | "URGENT" | null,
  "contractType": "FULL_TIME" | "PART_TIME" | "CONTRACT" | "INTERN" | null,
  "workMode": "ONSITE" | "HYBRID" | "REMOTE" | null,
  "companyUrl": string | null
}

=== NỘI DUNG TRANG ===
${pageContent}`;
}

type GatewayImportResult =
  | { ok: true; content: string }
  | { ok: false; error: string };

async function callGatewayImport(prompt: string): Promise<GatewayImportResult> {
  const randomUser = `recruitment-import-${Math.random().toString(36).substring(2, 15)}`;
  console.log(`[callGatewayImport] Đang gửi yêu cầu bóc tách sang Gateway AI (Session User: ${randomUser})...`);
  try {
    const res = await gateway.post<{
      choices?: { message: { content: string } }[];
    }>(
      "/v1/chat/completions",
      {
        model: "openclaw",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.2,
        user: randomUser,
      },
      {
        headers: { "x-openclaw-model": "deepseek-web/deepseek-chat" },
      },
    );

    const content = res.choices?.[0]?.message?.content?.trim();
    if (!content) {
      console.warn("[callGatewayImport] Phản hồi gateway thiếu trường choices/content:", JSON.stringify(res));
      return {
        ok: false,
        error: "AI gateway không trả về nội dung. Worker upstream có thể chưa khởi động hoặc model trả response rỗng.",
      };
    }
    return { ok: true, content };
  } catch (e) {
    if (e instanceof GatewayHttpError) {
      console.error("[callGatewayImport] AI Gateway HTTP", e.status, e.upstreamMessage ?? e.body);
      const detail = e.upstreamMessage ?? `HTTP ${e.status}`;
      return {
        ok: false,
        error: `AI gateway lỗi: ${detail}. Kiểm tra OpenClaw worker upstream (CDP/LLM provider).`,
      };
    }
    console.error("[callGatewayImport] Không kết nối được gateway:", e);
    return {
      ok: false,
      error: `Không kết nối được AI gateway tại ${process.env.OPENCLAW_GATEWAY_URL ?? "http://127.0.0.1:18789"}.`,
    };
  }
}

export type JdImportResult =
  | { ok: true; draft: JobPositionImportDraft }
  | { ok: false; error: string; isSessionTimeout?: boolean; isSalesPlaybookConflict?: boolean };

/** AI tổng hợp nội dung trang → các trường JobPosition. */
export async function importJobPositionDraftFromContent(
  pageContent: string,
  sourceUrl: string,
  locale: WorkspaceLanguage = "vi",
): Promise<JdImportResult> {
  const prompt = buildImportPrompt(pageContent, sourceUrl, locale);
  const gw = await callGatewayImport(prompt);
  if (!gw.ok) {
    console.warn("[importJobPositionDraftFromContent] Lỗi từ AI gateway:", gw.error);
    return { ok: false, error: gw.error };
  }

  const raw = gw.content;
  console.log("[importJobPositionDraftFromContent] Phản hồi thô từ AI (độ dài " + raw.length + " ký tự):");
  console.log(raw);

  // Kiểm tra xem phản hồi thô có chứa các dấu hiệu hết phiên làm việc của AI trên trình duyệt debug hay không
  const lowerRaw = raw.toLowerCase();
  const isSessionTimeout =
    lowerRaw.includes("session timed out") ||
    lowerRaw.includes("previous attempt timed out") ||
    lowerRaw.includes("completely in the dark") ||
    lowerRaw.includes("missing the context") ||
    lowerRaw.includes("try a quick reset") ||
    lowerRaw.includes("nothing was saved on my end");

  if (isSessionTimeout) {
    console.error("[importJobPositionDraftFromContent] Phát hiện AI trên trình duyệt debug bị hết hạn phiên chat (session timeout).");
    return {
      ok: false,
      error: "AI trên trình duyệt debug bị hết hạn phiên làm việc. Hãy mở trình duyệt Chrome debug của bạn, bấm nút 'Chat mới' (New Chat) trên trang Gemini hoặc Claude, rồi thử nhập lại.",
      isSessionTimeout: true,
    };
  }

  // Kiểm tra xem phản hồi thô có chứa các dấu hiệu xung đột bối cảnh với Robot bán hàng (Sales Playbook) hay không
  const isSalesPlaybookConflict =
    lowerRaw.includes("playbook") ||
    lowerRaw.includes("customer message") ||
    lowerRaw.includes("order details") ||
    lowerRaw.includes("order log") ||
    lowerRaw.includes("shop đang cập nhật");

  if (isSalesPlaybookConflict) {
    console.error("[importJobPositionDraftFromContent] Phát hiện AI đang bị kẹt trong bối cảnh Robot bán hàng (Sales Playbook).");
    return {
      ok: false,
      error: "AI đang bị kẹt trong bối cảnh của Robot bán hàng (Sales Playbook). Hãy đăng nhập DeepSeek trên trình duyệt Chrome debug của bạn để hệ thống tự động bóc tách JD độc lập qua tab DeepSeek, hoặc bấm nút 'Chat mới' (New Chat) trên trang Gemini/Claude và thử lại.",
      isSalesPlaybookConflict: true,
    };
  }

  const parsed = parseJobPositionImportDraft(raw);
  if (!parsed) {
    console.error("[importJobPositionDraftFromContent] Thất bại khi bóc tách JSON hoặc thiếu trường 'title' bắt buộc từ phản hồi của AI.");
    return {
      ok: false,
      error: "AI phản hồi dữ liệu không đúng cấu trúc JSON mong đợi hoặc thiếu tên vị trí tuyển dụng (title). Bạn hãy thử lại hoặc tự điền tay.",
    };
  }

  console.log("[importJobPositionDraftFromContent] Phân tích dữ liệu JSON thành công!");
  return { ok: true, draft: parsed };
}
