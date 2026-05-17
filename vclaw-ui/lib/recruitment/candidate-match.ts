import { gateway } from "@/lib/gateway/server";
import type { WorkspaceLanguage } from "@/lib/recruitment/workspace-language";
import type { LinkedInSearchHit } from "@/lib/recruitment/candidate-types";
import type { JobForSearchQuery } from "@/lib/recruitment/candidate-search-query";

export type CandidateMatchRow = {
  profile_url: string;
  score: number;
  summary: string;
};

function stripJsonFence(raw: string): string {
  return raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

export function parseCandidateMatchResponse(raw: string): CandidateMatchRow[] {
  try {
    const parsed = JSON.parse(stripJsonFence(raw)) as
      | { matches?: CandidateMatchRow[] }
      | CandidateMatchRow[];
    const rows = Array.isArray(parsed) ? parsed : parsed.matches;
    if (!Array.isArray(rows)) return [];
    return rows
      .filter(
        (r) =>
          r &&
          typeof r.profile_url === "string" &&
          typeof r.score === "number" &&
          typeof r.summary === "string",
      )
      .map((r) => ({
        profile_url: r.profile_url,
        score: Math.min(100, Math.max(0, Math.round(r.score))),
        summary: r.summary.trim(),
      }));
  } catch {
    return [];
  }
}

function buildMatchPrompt(
  job: JobForSearchQuery & { description?: string | null },
  hits: LinkedInSearchHit[],
  locale: WorkspaceLanguage,
): string {
  const jobBlock = [
    `Title: ${job.title}`,
    job.requirements ? `Requirements: ${job.requirements}` : null,
    job.description ? `Description: ${job.description}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const candidatesBlock = hits
    .map(
      (h, i) =>
        `${i + 1}. profile_url=${h.profile_url}\n   name=${h.name}\n   headline=${h.headline ?? ""}\n   location=${h.location ?? ""}`,
    )
    .join("\n\n");

  const lang = locale === "vi" ? "Vietnamese" : "English";

  return `You are an HR sourcer. Score each LinkedIn search result against the job (0-100) based on PROFESSIONAL fit only (skills, role, experience in headline) — NOT location or language alone.
If headline/profile clearly wrong profession (e.g. athlete for IT engineer), score below 40 even if same city.
Reply with ONLY valid JSON: { "matches": [ { "profile_url": "...", "score": 85, "summary": "one sentence in ${lang}" } ] }
Include every candidate listed. No markdown.

JOB:
${jobBlock}

CANDIDATES:
${candidatesBlock}`;
}

async function callGatewayMatch(prompt: string): Promise<{ ok: boolean; content?: string }> {
  try {
    const res = await gateway.post<{ choices: { message: { content: string } }[] }>(
      "/v1/chat/completions",
      {
        model: "openclaw",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
      },
      {
        headers: {
          "x-openclaw-model": "deepseek-web/deepseek-chat",
        },
      },
    );
    const raw = res.choices?.[0]?.message?.content?.trim();
    if (!raw) return { ok: false };
    return { ok: true, content: raw };
  } catch {
    return { ok: false };
  }
}

/** Chấm điểm phù hợp JD; trả hits đã gắn matchScore/matchSummary (best-effort). */
export async function scoreCandidatesAgainstJob(
  job: JobForSearchQuery & { description?: string | null },
  hits: LinkedInSearchHit[],
  locale: WorkspaceLanguage,
): Promise<LinkedInSearchHit[]> {
  if (hits.length === 0) return hits;

  const ai = await callGatewayMatch(buildMatchPrompt(job, hits, locale));
  if (!ai.ok || !ai.content) {
    return hits.map((h) => ({ ...h, matchScore: null, matchSummary: null }));
  }

  const rows = parseCandidateMatchResponse(ai.content);
  const byUrl = new Map(rows.map((r) => [r.profile_url, r]));

  return hits.map((h) => {
    const m = byUrl.get(h.profile_url);
    return {
      ...h,
      matchScore: m?.score ?? null,
      matchSummary: m?.summary ?? null,
    };
  });
}
