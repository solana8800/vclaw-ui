"use server";

import { prisma } from "@/lib/db";
import { gateway, GatewayHttpError } from "@/lib/gateway/server";
import { buildLinkedInJobPostPrompt } from "@/lib/ai/prompts/recruitment-prompts";
import { getRecruitmentSettings } from "@/lib/actions/recruitment-settings-actions";
import {
  jobRecordToLinkedInFacts,
  sanitizeLinkedInPostCopy,
  stripAiWrappers,
  validateLinkedInJobCopy,
} from "@/lib/recruitment/linkedin-job-copy";
import { resolveLinkedInCompanyUrl } from "@/lib/recruitment/company-url";
import { saveRecruitmentPostImageUpload } from "@/lib/recruitment/linkedin-post-image";
import {
  defaultRecruitmentLocation,
  getWorkspaceLanguage,
} from "@/lib/recruitment/workspace-language";

async function callGatewayForJobCopy(
  prompt: string,
  temperature: number,
): Promise<{ ok: boolean; content?: string; error?: string }> {
  try {
    const res = await gateway.post<{ choices?: { message: { content: string } }[] }>(
      "/v1/chat/completions",
      {
        model: "openclaw",
        messages: [{ role: "user", content: prompt }],
        temperature,
      },
      {
        headers: {
          "x-openclaw-model": "deepseek-web/deepseek-chat",
        },
      },
    );
    const raw = res.choices?.[0]?.message?.content?.trim();
    if (!raw) {
      return {
        ok: false,
        error: "AI gateway không trả về nội dung (response thiếu trường choices). Kiểm tra worker upstream của OpenClaw.",
      };
    }
    return { ok: true, content: stripAiWrappers(raw) };
  } catch (error) {
    if (error instanceof GatewayHttpError) {
      console.error("[generateLinkedInJobPostCopy] Gateway lỗi", error.status, error.upstreamMessage ?? error.body);
      const detail = error.upstreamMessage ?? `HTTP ${error.status}`;
      return {
        ok: false,
        error: `AI gateway lỗi: ${detail}. Kiểm tra OpenClaw worker upstream (CDP/LLM provider).`,
      };
    }
    console.error("[generateLinkedInJobPostCopy] Không kết nối được gateway:", error);
    return {
      ok: false,
      error: `Không kết nối được AI gateway tại ${process.env.OPENCLAW_GATEWAY_URL ?? "http://127.0.0.1:18789"}.`,
    };
  }
}

/**
 * Tạo mô tả marketing cho bài đăng LinkedIn — mỗi lần gọi có biến thể khác nhau.
 */
export async function generateLinkedInJobPostCopy(
  jobPositionId: string,
  location?: string,
): Promise<{ ok: boolean; description?: string; error?: string }> {
  const job = await prisma.jobPosition.findUnique({ where: { id: jobPositionId } });
  if (!job) return { ok: false, error: "Không tìm thấy vị trí tuyển dụng." };

  const [recruitmentSettings, workspaceLang] = await Promise.all([
    getRecruitmentSettings(),
    getWorkspaceLanguage(),
  ]);
  const resolvedLocation = location?.trim() || defaultRecruitmentLocation(workspaceLang);

  const facts = jobRecordToLinkedInFacts(
    {
      ...job,
      publicInstructions: null,
      companyUrl:
        resolveLinkedInCompanyUrl(recruitmentSettings?.linkedinCompanyUrl, job.companyUrl) || null,
    },
    resolvedLocation,
  );
  const seed = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  for (let attempt = 0; attempt < 2; attempt++) {
    const prompt = buildLinkedInJobPostPrompt(facts, {
      variationSeed: `${seed}-${attempt}`,
      strictRetry: attempt > 0,
      locale: workspaceLang,
    });
    const ai = await callGatewayForJobCopy(prompt, attempt === 0 ? 0.75 : 0.55);
    if (!ai.ok || !ai.content) {
      return { ok: false, error: ai.error ?? "Không tạo được nội dung." };
    }

    const description = sanitizeLinkedInPostCopy(stripAiWrappers(ai.content));
    const validation = validateLinkedInJobCopy(description);
    if (validation.ok) {
      return { ok: true, description };
    }

    if (attempt === 1) {
      return {
        ok: false,
        error: `Nội dung AI không đạt chuẩn: ${validation.issues.join(" ")}`,
      };
    }
  }

  return { ok: false, error: "Không tạo được nội dung phù hợp." };
}

/** Lưu ảnh người dùng chọn (tùy chọn) để đính kèm bài feed LinkedIn. */
export async function uploadLinkedInPostImage(
  jobPositionId: string,
  formData: FormData,
): Promise<{ ok: boolean; imagePath?: string; error?: string }> {
  const job = await prisma.jobPosition.findUnique({ where: { id: jobPositionId } });
  if (!job) return { ok: false, error: "Không tìm thấy vị trí tuyển dụng." };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Chưa chọn file ảnh." };
  }

  return saveRecruitmentPostImageUpload(jobPositionId, file);
}
