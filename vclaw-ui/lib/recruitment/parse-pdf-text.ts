import "server-only";

/** Trích text từ PDF — pdf-parse v1, không dùng pdf.js worker (tương thích Next.js server). */
export async function extractTextFromPdfBuffer(buffer: Buffer): Promise<string> {
  const pdfParse = (await import("pdf-parse")).default as (
    data: Buffer,
  ) => Promise<{ text?: string }>;
  const result = await pdfParse(buffer);
  return result.text ?? "";
}
