import type { CandidateDetailPdfDocument } from "@/lib/recruitment/candidate-detail-pdf-document";

const LOGO_PUBLIC_PATH = "/vclaw-logo.png";
const HEADER_LOGO_WIDTH = 20;

/** Tải logo VClaw, thu nhỏ qua canvas để PDF không phình, nhưng giữ độ sắc nét. */
export async function loadVclawLogoForPdf(maxWidthPx = 400): Promise<string> {
  if (typeof document === "undefined") {
    throw new Error("loadVclawLogoForPdf chỉ chạy trên trình duyệt.");
  }
  const res = await fetch(LOGO_PUBLIC_PATH);
  if (!res.ok) {
    throw new Error(`Không tải được logo: ${res.status}`);
  }
  const blob = await res.blob();
  const bitmap = await createImageBitmap(blob);
  
  // Không thu nhỏ quá mức để giữ độ nét khi in (PDF cần DPI cao)
  const scale = Math.min(1, maxWidthPx / bitmap.width);
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas không khả dụng.");
  
  // Tối ưu hóa chất lượng render
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();
  return canvas.toDataURL("image/png");
}

type PageSize = { width: number; height: number };

/** Logo góc phải mỗi trang. */
export function applyVclawBrandingToPdfDocument(
  doc: CandidateDetailPdfDocument,
  logoDataUrl: string,
): CandidateDetailPdfDocument {
  const footer = doc.footer;
  const pageMargins = (doc.pageMargins as number[] | undefined) ?? [42, 52, 42, 58];
  const [ml, , mr, mb] = pageMargins;

  return {
    ...doc,
    pageMargins: [ml, 64, mr, mb],
    header: (_currentPage: number, _pageCount: number, _pageSize: PageSize) => ({
      margin: [ml, 18, mr, 0],
      columns: [
        { width: "*", text: "" },
        {
          image: logoDataUrl,
          width: HEADER_LOGO_WIDTH,
          alignment: "right",
        },
      ],
    }),
    footer,
  };
}
