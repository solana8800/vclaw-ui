import { gateway } from "@/lib/gateway/server";
import { buildLinkedInPeopleSearchQueryPrompt } from "@/lib/ai/prompts/recruitment-prompts";
import type { WorkspaceLanguage } from "@/lib/recruitment/workspace-language";
import { defaultRecruitmentLocation } from "@/lib/recruitment/workspace-language";

export type JobForSearchQuery = {
  title: string;
  requirements?: string | null;
  description?: string | null;
  workMode?: string | null;
  contractType?: string | null;
};

const MAX_QUERY_WORDS = 8;
const MAX_QUERY_CHARS = 72;

const STOP_WORDS = new Set([
  "and",
  "or",
  "the",
  "with",
  "for",
  "years",
  "year",
  "experience",
  "required",
  "must",
  "have",
  "will",
  "our",
  "team",
  "work",
  "working",
  "position",
  "role",
  "job",
  "candidate",
  "candidates",
  "looking",
  "join",
  "company",
  "vị",
  "trí",
  "tuyển",
  "dụng",
  "cần",
  "có",
  "kinh",
  "nghiệm",
  "năm",
  "làm",
  "việc",
  "tại",
  "và",
  "hoặc",
  "các",
  "cho",
  "với",
  "trong",
  "một",
  "được",
  "yêu",
  "cầu",
]);

/** Làm sạch chuỗi tìm LinkedIn People — ngắn, không câu dài. */
export function sanitizeLinkedInSearchQuery(raw: string): string {
  let q = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  try {
    const parsed = JSON.parse(q) as { query?: string; keywords?: string };
    if (typeof parsed.query === "string") q = parsed.query;
    else if (typeof parsed.keywords === "string") q = parsed.keywords;
  } catch {
    /* plain text */
  }

  q = q
    .replace(/[\n\r\t•·|/\\;:]+/g, " ")
    .replace(/[^\p{L}\p{N}\s+#.+&-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

  const words = q
    .split(" ")
    .map((w) => w.trim())
    .filter((w) => w.length > 1 && !STOP_WORDS.has(w.toLowerCase()));

  const trimmed = words.slice(0, MAX_QUERY_WORDS).join(" ");
  if (trimmed.length <= MAX_QUERY_CHARS) return trimmed;
  return trimmed.slice(0, MAX_QUERY_CHARS).replace(/\s+\S*$/, "").trim();
}

export function parseLinkedInSearchQueryResponse(raw: string): string | null {
  const cleaned = sanitizeLinkedInSearchQuery(raw);
  if (cleaned.split(" ").length < 2) return null;
  return cleaned;
}

/** Trích 1–2 kỹ năng ngắn từ JD (ưu tiên từ viết hoa / tech). */
function pickSkillTokens(text: string): string[] {
  const tokens = text
    .replace(/[^\p{L}\p{N}\s+#.+]/gu, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w.toLowerCase()));

  const techLike = tokens.filter(
    (w) =>
      /^[A-Z][a-zA-Z0-9+#.]*$/.test(w) ||
      /^(react|node|python|java|typescript|aws|docker|kubernetes|figma|sql)$/i.test(w),
  );
  const picked = [...new Set(techLike.map((t) => t.replace(/^./, (c) => c.toUpperCase())))].slice(0, 2);
  if (picked.length > 0) return picked;

  return [...new Set(tokens)].slice(0, 2);
}

/** Fallback ngắn khi AI không dùng được — title + tối đa 2 skill + location. */
export function buildLinkedInSearchQueryFromJob(
  job: JobForSearchQuery,
  locale: WorkspaceLanguage,
): string {
  const titleWords = job.title.trim().split(/\s+/).slice(0, 4).join(" ");
  const req = (job.requirements || job.description || "").trim();
  const skills = req ? pickSkillTokens(req) : [];

  const location = defaultRecruitmentLocation(locale);
  const parts = [titleWords, ...skills, location].filter(Boolean);

  const seen = new Set<string>();
  const unique = parts.filter((p) => {
    const k = p.toLowerCase();
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  return sanitizeLinkedInSearchQuery(unique.join(" "));
}

async function callGatewaySearchKeywords(prompt: string): Promise<string | null> {
  try {
    const res = await gateway.post<{ choices: { message: { content: string } }[] }>(
      "/v1/chat/completions",
      {
        model: "openclaw",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.35,
      },
      {
        headers: {
          "x-openclaw-model": "deepseek-web/deepseek-chat",
        },
      },
    );
    const raw = res.choices?.[0]?.message?.content?.trim();
    if (!raw) return null;
    return parseLinkedInSearchQueryResponse(raw);
  } catch {
    return null;
  }
}

/** Ưu tiên AI → query ngắn; fallback heuristic. */
export async function resolveLinkedInSearchQueryForJob(
  job: JobForSearchQuery,
  locale: WorkspaceLanguage,
): Promise<{ query: string; source: "ai" | "fallback" }> {
  const prompt = buildLinkedInPeopleSearchQueryPrompt(job, locale);
  const aiQuery = await callGatewaySearchKeywords(prompt);
  if (aiQuery) {
    return { query: aiQuery, source: "ai" };
  }
  return { query: buildLinkedInSearchQueryFromJob(job, locale), source: "fallback" };
}

/** Chuẩn hóa từ khóa người dùng tự nhập trước khi search. */
export function normalizeUserSearchQuery(input: string, locale: WorkspaceLanguage): string {
  const cleaned = sanitizeLinkedInSearchQuery(input);
  if (cleaned.split(" ").length >= 2) return cleaned;
  const withLoc = `${cleaned} ${defaultRecruitmentLocation(locale)}`.trim();
  return sanitizeLinkedInSearchQuery(withLoc);
}
