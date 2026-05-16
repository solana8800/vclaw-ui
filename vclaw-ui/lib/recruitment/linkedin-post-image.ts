import "server-only";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const IMAGE_DIR = path.join(os.homedir(), ".openclaw", "workspace", "recruitment-post-images");
const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME = new Set(["image/png", "image/jpeg", "image/webp"]);

export function getRecruitmentImageDir() {
  return IMAGE_DIR;
}

function mimeToExt(mime: string) {
  if (mime === "image/png") return "png";
  if (mime === "image/jpeg") return "jpg";
  if (mime === "image/webp") return "webp";
  return null;
}

export function buildRecruitmentImageFileName(jobPositionId: string, ext: string) {
  const safeId = jobPositionId.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 64) || "job";
  return `upload-${safeId}-${Date.now()}.${ext}`;
}

/** Chỉ chấp nhận file trong thư mục recruitment-post-images. */
export function assertRecruitmentPostImagePath(imagePath: string): { ok: true } | { ok: false; error: string } {
  const dir = getRecruitmentImageDir();
  const resolved = path.resolve(imagePath);
  if (!resolved.startsWith(dir + path.sep) && resolved !== dir) {
    return { ok: false, error: "Đường dẫn ảnh không hợp lệ." };
  }
  if (!fs.existsSync(resolved)) {
    return { ok: false, error: "Không tìm thấy file ảnh." };
  }
  return { ok: true };
}

export async function saveRecruitmentPostImageUpload(
  jobPositionId: string,
  file: File,
): Promise<{ ok: boolean; imagePath?: string; error?: string }> {
  if (!ALLOWED_MIME.has(file.type)) {
    return { ok: false, error: "Chỉ hỗ trợ PNG, JPEG hoặc WebP." };
  }
  if (file.size > MAX_BYTES) {
    return { ok: false, error: "Ảnh tối đa 5MB." };
  }

  const ext = mimeToExt(file.type);
  if (!ext) return { ok: false, error: "Định dạng ảnh không hỗ trợ." };

  fs.mkdirSync(IMAGE_DIR, { recursive: true });
  const outPath = path.join(IMAGE_DIR, buildRecruitmentImageFileName(jobPositionId, ext));
  const buf = Buffer.from(await file.arrayBuffer());
  fs.writeFileSync(outPath, buf);
  return { ok: true, imagePath: outPath };
}
