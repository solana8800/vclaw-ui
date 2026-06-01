function titleCaseFilename(filename: string): string {
  const basename = filename.replace(/\.[^.]+$/, "");
  const words = basename
    .split(/[\s_-]+/)
    .map((word) => word.trim())
    .filter((word) => word && !/^(?:cv|resume|profile|20\d{2})$/i.test(word))
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());
  return words.join(" ") || "Ứng viên";
}

function candidateNameFromLine(line: string): string | null {
  const cleaned = line.replace(/^#+\s*/, "").replace(/^[-*]\s*/, "").trim();
  if (!cleaned || cleaned.length > 80) return null;
  if (/https?:\/\/|@|^(?:email|phone|tel|linkedin|github|portfolio)\s*:/i.test(cleaned)) {
    return null;
  }
  const words = cleaned.split(/\s+/);
  if (words.length < 2 || words.length > 6) return null;
  return cleaned;
}

/** Đoán tên ứng viên từ dòng đầu phù hợp; fallback về tên file đã làm sạch. */
export function guessCandidateNameFromCv(cvText: string, filename: string): string {
  for (const line of cvText.split(/\r?\n/)) {
    const name = candidateNameFromLine(line);
    if (name) return name;
  }
  return titleCaseFilename(filename);
}

/** Metadata import CV không tự gắn LinkedIn vì URL trong CV có thể là của người tham chiếu. */
export function buildCandidateCvImportMetadata(
  cvText: string,
  filename: string,
): { name: string } {
  return { name: guessCandidateNameFromCv(cvText, filename) };
}
