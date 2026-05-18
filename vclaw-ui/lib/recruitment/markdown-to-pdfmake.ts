/** Chuyển markdown CV (heading, list, bold…) sang node pdfmake — không phụ thuộc server. */

export type PdfmakeText = string | PdfmakeTextSpan | PdfmakeTextSpan[];

export type PdfmakeTextSpan = {
  text: string;
  bold?: boolean;
  italics?: boolean;
  fontSize?: number;
  color?: string;
};

export type PdfmakeContentNode = Record<string, unknown>;

const CV_STYLES = {
  cvH1: { fontSize: 13, bold: true, color: "#0a66c2", margin: [0, 8, 0, 4] as [number, number, number, number] },
  cvH2: { fontSize: 11.5, bold: true, color: "#1e293b", margin: [0, 8, 0, 3] as [number, number, number, number] },
  cvH3: { fontSize: 10.5, bold: true, color: "#334155", margin: [0, 6, 0, 2] as [number, number, number, number] },
  cvH4: { fontSize: 10, bold: true, color: "#475569", margin: [0, 4, 0, 2] as [number, number, number, number] },
  cvBody: { fontSize: 9.5, lineHeight: 1.35, color: "#1e293b", margin: [0, 0, 0, 5] as [number, number, number, number] },
  cvBullet: { fontSize: 9.5, lineHeight: 1.3, margin: [0, 0, 0, 4] as [number, number, number, number] },
  cvQuote: {
    fontSize: 9.5,
    italics: true,
    color: "#475569",
    fillColor: "#f1f5f9",
    margin: [0, 0, 0, 6] as [number, number, number, number],
  },
};

export const CV_MARKDOWN_PDF_STYLES = CV_STYLES;

function stripImages(raw: string): string {
  return raw.replace(/!\[[^\]]*]\([^)]+\)/g, "");
}

/** Inline **bold**, *italic*, `code` → pdfmake text array. */
export function parseMarkdownInline(text: string): PdfmakeText {
  const src = text.trim();
  if (!src) return "";

  const parts: PdfmakeTextSpan[] = [];
  const re = /(\*\*[^*]+\*\*|\*[^*]+\*|_[^_]+_|`[^`]+`)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src)) !== null) {
    if (m.index > last) {
      parts.push({ text: src.slice(last, m.index) });
    }
    const token = m[0];
    if (token.startsWith("**")) {
      parts.push({ text: token.slice(2, -2), bold: true });
    } else if (token.startsWith("`")) {
      parts.push({ text: token.slice(1, -1), fontSize: 9, color: "#334155" });
    } else {
      parts.push({ text: token.replace(/^[*_]|[*_]$/g, ""), italics: true });
    }
    last = m.index + token.length;
  }
  if (last < src.length) parts.push({ text: src.slice(last) });
  if (parts.length === 0) return src;
  if (parts.length === 1 && !parts[0].bold && !parts[0].italics) return parts[0].text;
  return parts;
}

function linkToLabel(line: string): string {
  return line.replace(/\[([^\]]+)]\(([^)]+)\)/g, "$1 ($2)");
}

function isBullet(line: string): boolean {
  return /^[-*+]\s+/.test(line);
}

function isOrdered(line: string): boolean {
  return /^\d+[.)]\s+/.test(line);
}

function isHeading(line: string): RegExpMatchArray | null {
  return line.match(/^(#{1,4})\s+(.+)$/);
}

function isBlockquote(line: string): boolean {
  return /^>\s?/.test(line);
}

function headingStyle(depth: number): string {
  if (depth <= 1) return "cvH1";
  if (depth === 2) return "cvH2";
  if (depth === 3) return "cvH3";
  return "cvH4";
}

function collectBulletList(lines: string[], start: number): { items: string[]; next: number } {
  const items: string[] = [];
  let i = start;
  while (i < lines.length && isBullet(lines[i])) {
    items.push(lines[i].replace(/^[-*+]\s+/, "").trim());
    i += 1;
  }
  return { items, next: i };
}

function collectOrderedList(lines: string[], start: number): { items: string[]; next: number } {
  const items: string[] = [];
  let i = start;
  while (i < lines.length && isOrdered(lines[i])) {
    items.push(lines[i].replace(/^\d+[.)]\s+/, "").trim());
    i += 1;
  }
  return { items, next: i };
}

function collectParagraph(lines: string[], start: number): { text: string; next: number } {
  const chunk: string[] = [];
  let i = start;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) break;
    if (isHeading(line) || isBullet(line) || isOrdered(line) || isBlockquote(line)) break;
    chunk.push(line.trim());
    i += 1;
  }
  return { text: chunk.join(" "), next: i };
}

/** Markdown → mảng content pdfmake (dùng trong stack/card). */
export function markdownToPdfmakeContent(markdown: string): PdfmakeContentNode[] {
  const normalized = stripImages(markdown.replace(/\r\n/g, "\n")).trim();
  if (!normalized) return [];

  const lines = normalized.split("\n");
  const nodes: PdfmakeContentNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      i += 1;
      continue;
    }

    const heading = isHeading(line);
    if (heading) {
      const depth = heading[1].length;
      nodes.push({
        text: parseMarkdownInline(linkToLabel(heading[2])),
        style: headingStyle(depth),
      });
      i += 1;
      continue;
    }

    if (isBlockquote(line)) {
      const quotes: string[] = [];
      while (i < lines.length && isBlockquote(lines[i])) {
        quotes.push(lines[i].replace(/^>\s?/, "").trim());
        i += 1;
      }
      nodes.push({
        text: parseMarkdownInline(linkToLabel(quotes.join(" "))),
        style: "cvQuote",
      });
      continue;
    }

    if (isBullet(line)) {
      const { items, next } = collectBulletList(lines, i);
      nodes.push({
        ul: items.map((item) => parseMarkdownInline(linkToLabel(item)) as string | PdfmakeTextSpan[]),
        style: "cvBullet",
      });
      i = next;
      continue;
    }

    if (isOrdered(line)) {
      const { items, next } = collectOrderedList(lines, i);
      nodes.push({
        ol: items.map((item) => parseMarkdownInline(linkToLabel(item)) as string | PdfmakeTextSpan[]),
        style: "cvBullet",
      });
      i = next;
      continue;
    }

    const { text, next } = collectParagraph(lines, i);
    if (text) {
      nodes.push({
        text: parseMarkdownInline(linkToLabel(text)),
        style: "cvBody",
      });
    }
    i = next > i ? next : i + 1;
  }

  return nodes;
}
