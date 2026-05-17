import "server-only";

import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import mammoth from "mammoth";
import WordExtractor from "word-extractor";

import { extractTextFromPdfBuffer } from "@/lib/recruitment/parse-pdf-text";

import { gateway } from "@/lib/gateway/server";
import {
  CV_STORE_MAX_CHARS,
  hardTruncateForStorage,
  normalizeResumeMarkdown,
} from "@/lib/recruitment/candidate-resume-text";

export { CV_PROMPT_MAX_CHARS, CV_STORE_MAX_CHARS, normalizeResumeMarkdown, prepareCvTextForPrompt } from "@/lib/recruitment/candidate-resume-text";

export const CV_MAX_FILE_BYTES = 10 * 1024 * 1024;

const RESUME_DIR = path.join(os.homedir(), ".openclaw", "workspace", "candidate-resumes");

const ALLOWED_EXT = new Set(["pdf", "doc", "docx"]);

export function getCandidateResumeDir(): string {
  return RESUME_DIR;
}

export function resumeExtFromFilename(filename: string): string | null {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  return ALLOWED_EXT.has(ext) ? ext : null;
}

async function summarizeCvViaGateway(raw: string): Promise<string | null> {
  const excerpt = raw.slice(0, 24_000);
  const prompt = `Tóm tắt CV sau thành markdown ngắn (tối đa ~3000 ký tự). Giữ: kinh nghiệm, học vấn, kỹ năng, dự án, chứng chỉ, liên hệ nếu có. Không bịa. Chỉ trả nội dung markdown, không bọc \`\`\`.

=== CV ===
${excerpt}`;

  try {
    const res = await gateway.post<{ choices: { message: { content: string } }[] }>(
      "/v1/chat/completions",
      {
        model: "openclaw",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.2,
      },
      {
        headers: { "x-openclaw-model": "deepseek-web/deepseek-chat" },
      },
    );
    const content = res.choices?.[0]?.message?.content?.trim();
    if (!content) return null;
    return normalizeResumeMarkdown(
      content.replace(/^```(?:markdown)?\s*/i, "").replace(/\s*```$/i, ""),
    );
  } catch {
    return null;
  }
}

/** Chuẩn bị nội dung lưu DB — tóm tắt AI nếu quá dài. */
export async function prepareCvTextForStorage(rawMarkdown: string): Promise<string> {
  const normalized = normalizeResumeMarkdown(rawMarkdown);
  if (!normalized) return "";
  if (normalized.length <= CV_STORE_MAX_CHARS) return normalized;

  const summarized = await summarizeCvViaGateway(normalized);
  if (summarized) return hardTruncateForStorage(summarized);
  return hardTruncateForStorage(normalized);
}

export async function parseResumeToMarkdown(
  buffer: Buffer,
  filename: string,
): Promise<{ ok: true; markdown: string } | { ok: false; error: string }> {
  const ext = resumeExtFromFilename(filename);
  if (!ext) {
    return { ok: false, error: "Chỉ hỗ trợ PDF, DOC hoặc DOCX." };
  }

  try {
    let raw = "";
    if (ext === "pdf") {
      raw = await extractTextFromPdfBuffer(buffer);
    } else if (ext === "docx") {
      const result = await mammoth.extractRawText({ buffer });
      raw = result.value ?? "";
    } else {
      const extractor = new WordExtractor();
      const doc = await extractor.extract(buffer);
      raw = doc.getBody() ?? "";
    }

    const markdown = normalizeResumeMarkdown(raw);
    if (!markdown) {
      return { ok: false, error: "Không đọc được nội dung CV (file trống hoặc scan ảnh)." };
    }
    return { ok: true, markdown };
  } catch (e) {
    console.error("[parseResumeToMarkdown]", e);
    return { ok: false, error: "Không parse được file CV." };
  }
}

/** Slug tên ứng viên cho tên file CV trên disk. */
export function slugifyCandidateName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/gi, "d")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "ung-vien";
}

export function buildCandidateResumeFileName(
  candidateId: string,
  ext: string,
  candidateName?: string | null,
): string {
  const safeId = candidateId.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 64) || "candidate";
  const slug = candidateName?.trim() ? slugifyCandidateName(candidateName) : "";
  const shortId = safeId.slice(-8);
  if (slug) return `cv-${slug}-${shortId}.${ext}`;
  return `cv-${safeId}.${ext}`;
}

export function resumeContentTypeFromExt(ext: string): string {
  switch (ext.toLowerCase()) {
    case "pdf":
      return "application/pdf";
    case "docx":
      return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    case "doc":
      return "application/msword";
    default:
      return "application/octet-stream";
  }
}

export function resumeExtFromPath(filePath: string): string | null {
  return resumeExtFromFilename(path.basename(filePath));
}

/** Đọc file CV đã lưu — chỉ path trong thư mục candidate-resumes. */
export function readCandidateResumeFile(
  cvFileUrl: string,
):
  | { ok: true; buffer: Buffer; ext: string; fileName: string }
  | { ok: false; error: string } {
  const check = assertCandidateResumePath(cvFileUrl);
  if (!check.ok) return { ok: false, error: check.error };
  if (!fs.existsSync(cvFileUrl)) {
    return { ok: false, error: "Không tìm thấy file CV." };
  }
  const ext = resumeExtFromPath(cvFileUrl);
  if (!ext) return { ok: false, error: "Định dạng CV không hỗ trợ." };
  const buffer = fs.readFileSync(cvFileUrl);
  return { ok: true, buffer, ext, fileName: path.basename(cvFileUrl) };
}

export function assertCandidateResumePath(filePath: string): { ok: true } | { ok: false; error: string } {
  const dir = getCandidateResumeDir();
  const resolved = path.resolve(filePath);
  if (!resolved.startsWith(dir + path.sep) && resolved !== dir) {
    return { ok: false, error: "Đường dẫn CV không hợp lệ." };
  }
  return { ok: true };
}

export async function saveCandidateResumeUpload(
  candidateId: string,
  file: File,
  candidateName?: string | null,
): Promise<{ ok: true; cvText: string; cvFileUrl: string } | { ok: false; error: string }> {
  const ext = resumeExtFromFilename(file.name);
  if (!ext) return { ok: false, error: "Chỉ hỗ trợ PDF, DOC hoặc DOCX." };
  if (file.size > CV_MAX_FILE_BYTES) {
    return { ok: false, error: "CV tối đa 10MB." };
  }
  if (file.size === 0) return { ok: false, error: "File trống." };

  const buffer = Buffer.from(await file.arrayBuffer());
  const parsed = await parseResumeToMarkdown(buffer, file.name);
  if (!parsed.ok) return parsed;

  const cvText = await prepareCvTextForStorage(parsed.markdown);
  if (!cvText) return { ok: false, error: "Không có nội dung CV sau khi xử lý." };

  fs.mkdirSync(RESUME_DIR, { recursive: true });
  const outPath = path.join(
    RESUME_DIR,
    buildCandidateResumeFileName(candidateId, ext, candidateName),
  );
  fs.writeFileSync(outPath, buffer);

  return { ok: true, cvText, cvFileUrl: outPath };
}

export function deleteCandidateResumeFile(cvFileUrl: string | null | undefined): void {
  if (!cvFileUrl?.trim()) return;
  const check = assertCandidateResumePath(cvFileUrl);
  if (!check.ok) return;
  try {
    if (fs.existsSync(cvFileUrl)) fs.unlinkSync(cvFileUrl);
  } catch (e) {
    console.warn("[deleteCandidateResumeFile]", e);
  }
}
