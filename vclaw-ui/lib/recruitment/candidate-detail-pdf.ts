import {
  applyVclawBrandingToPdfDocument,
  loadVclawLogoForPdf,
} from "@/lib/recruitment/candidate-detail-pdf-branding";
import type { CandidateDetailPdfDocument } from "@/lib/recruitment/candidate-detail-pdf-document";

/** Tải PDF nội dung chữ (pdfmake) — chỉ gọi phía client. */
export async function downloadCandidateDetailPdf(
  docDefinition: CandidateDetailPdfDocument,
  fileName: string,
): Promise<void> {
  const pdfMakeModule = await import("pdfmake/build/pdfmake");
  const vfsModule = await import("pdfmake/build/vfs_fonts");
  const pdfMake = pdfMakeModule.default ?? pdfMakeModule;
  const vfs = vfsModule.default ?? vfsModule;
  pdfMake.addVirtualFileSystem(vfs);

  let doc = docDefinition;
  try {
    const logoDataUrl = await loadVclawLogoForPdf();
    doc = applyVclawBrandingToPdfDocument(docDefinition, logoDataUrl);
  } catch (err) {
    console.warn("Không gắn logo/watermark VClaw vào PDF:", err);
  }

  pdfMake.createPdf(doc).download(fileName);
}
