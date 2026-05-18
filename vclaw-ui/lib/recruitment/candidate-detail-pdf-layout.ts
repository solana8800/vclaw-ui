import { JD_BONUS_CRITERION_KEYS } from "@/lib/recruitment/candidate-jd-evaluation";
import type { CandidateJdEvaluation } from "@/lib/recruitment/candidate-jd-evaluation";
import type { LinxaChatMessage } from "@/lib/recruitment/linxa-message-map";

type PdfNode = Record<string, unknown>;

const C = {
  brand: "#0a66c2",
  brandSoft: "#e8f1fb",
  surface: "#f8fafc",
  line: "#e2e8f0",
  text: "#1e293b",
  muted: "#64748b",
  success: "#059669",
  successBg: "#d1fae5",
  warn: "#d97706",
  warnBg: "#fef3c7",
  danger: "#dc2626",
  dangerBg: "#fee2e2",
  inboundBg: "#ffffff",
  inboundBorder: "#cbd5e1",
  outboundBg: "#dbeafe",
  outboundBorder: "#93c5fd",
};

export function scoreTone(score: number): {
  bar: string;
  bg: string;
  text: string;
  labelVi: string;
  labelEn: string;
} {
  if (score >= 75) {
    return {
      bar: C.success,
      bg: C.successBg,
      text: C.success,
      labelVi: "Phù hợp cao",
      labelEn: "Strong fit",
    };
  }
  if (score >= 50) {
    return { bar: C.warn, bg: C.warnBg, text: C.warn, labelVi: "Khá phù hợp", labelEn: "Moderate fit" };
  }
  return {
    bar: C.danger,
    bg: C.dangerBg,
    text: C.danger,
    labelVi: "Cần xem xét",
    labelEn: "Needs review",
  };
}

export function pdfBadge(text: string, bg: string, color: string): PdfNode {
  return {
    text,
    fontSize: 8,
    bold: true,
    color,
    fillColor: bg,
    margin: [0, 1, 6, 1] as [number, number, number, number],
  };
}

export function pdfBadgeRow(badges: PdfNode[]): PdfNode {
  if (badges.length === 0) return { text: "" };
  return {
    table: {
      widths: badges.map(() => "auto"),
      body: [badges],
    },
    layout: "noBorders",
    margin: [0, 6, 0, 0] as [number, number, number, number],
  };
}

export function pdfSectionBanner(title: string): PdfNode {
  return {
    table: {
      widths: ["*"],
      body: [[{ text: title.toUpperCase(), style: "sectionBanner" }]],
    },
    layout: {
      hLineWidth: (i: number, node: { table: { body: unknown[] } }) =>
        i === node.table.body.length ? 1.5 : 0,
      vLineWidth: () => 0,
      hLineColor: () => C.brandSoft,
      paddingLeft: () => 0,
      paddingRight: () => 0,
      paddingTop: () => 0,
      paddingBottom: () => 4,
    },
    margin: [0, 16, 0, 10] as [number, number, number, number],
  };
}

export function pdfCard(inner: PdfNode[], marginBottom = 0): PdfNode {
  return {
    table: {
      widths: ["*"],
      body: [[{ stack: inner, margin: [10, 8, 10, 8] as [number, number, number, number] }]],
    },
    layout: {
      hLineWidth: () => 1,
      vLineWidth: () => 1,
      hLineColor: () => C.line,
      vLineColor: () => C.line,
    },
    fillColor: C.surface,
    margin: [0, 0, 0, marginBottom] as [number, number, number, number],
  };
}

export function pdfKeyValueGrid(
  rows: { label: string; value: string }[],
): PdfNode | null {
  const valid = rows.filter((r) => r.value.trim());
  if (valid.length === 0) return null;
  return {
    table: {
      widths: [110, "*"],
      body: valid.map((r) => [
        { text: r.label, style: "kvLabel" },
        { text: r.value, style: "kvValue" },
      ]),
    },
    layout: {
      hLineWidth: (i: number, node: { table: { body: unknown[] } }) =>
        i === 0 || i === node.table.body.length ? 0 : 0.5,
      vLineWidth: () => 0,
      hLineColor: () => C.line,
      paddingLeft: () => 0,
      paddingRight: () => 0,
      paddingTop: () => 4,
      paddingBottom: () => 4,
    },
  };
}

export function pdfScoreBar(score: number, barWidth = 150): PdfNode {
  const fill = Math.max(0, Math.min(barWidth, Math.round((score / 100) * barWidth)));
  const color = scoreTone(score).bar;
  return {
    columns: [
      {
        width: barWidth,
        canvas: [
          { type: "rect", x: 0, y: 0, w: barWidth, h: 6, r: 3, color: C.line },
          { type: "rect", x: 0, y: 0, w: fill, h: 6, r: 3, color },
        ],
      },
      {
        width: 36,
        text: `${score}%`,
        alignment: "right",
        fontSize: 9,
        bold: true,
        color: C.text,
        margin: [6, -1, 0, 0] as [number, number, number, number],
      },
    ],
    margin: [0, 0, 0, 6] as [number, number, number, number],
  };
}

export function pdfBulletList(items: string[], color = C.text): PdfNode {
  return {
    ul: items.map((s) => s.trim()).filter(Boolean),
    style: "bullet",
    color,
    margin: [4, 0, 0, 0] as [number, number, number, number],
  };
}

export function pdfSubBlock(title: string, body: string | string[]): PdfNode | null {
  if (Array.isArray(body)) {
    const items = body.map((s) => s.trim()).filter(Boolean);
    if (items.length === 0) return null;
    return {
      stack: [
        { text: title, style: "subSectionTitle" },
        ...items.map((item) => ({
          columns: [
            { width: 10, text: "•", color: C.brand, style: "body", alignment: "right" },
            { width: "*", text: item, style: "body" }
          ],
          columnGap: 6,
          margin: [0, 0, 0, 6] as [number, number, number, number],
        })),
      ],
      margin: [0, 0, 0, 8] as [number, number, number, number],
    };
  }
  const text = body.trim();
  if (!text || text === "N/A") return null;
  return {
    stack: [
      { text: title, style: "subSectionTitle" },
      {
        text,
        style: "body",
        margin: [0, 0, 0, 8] as [number, number, number, number],
      },
    ],
  };
}

export function pdfJdEvaluationBlock(
  evaluation: CandidateJdEvaluation,
  labels: {
    matchScore: string;
    aiCriteria: string;
    aiBonusCriterion: string;
    aiStrengths: string;
    aiConcerns: string;
    aiConclusion: string;
    locale: string;
  },
): PdfNode[] {
  const nodes: PdfNode[] = [];
  const tone = scoreTone(evaluation.overallScore);
  const verdict =
    labels.locale === "vi" ? tone.labelVi : tone.labelEn;

  nodes.push({
    columns: [
      {
        width: "*",
        stack: [
          {
            text: labels.matchScore,
            fontSize: 9,
            color: C.muted,
            margin: [0, 0, 0, 2] as [number, number, number, number],
          },
          pdfBadge(verdict, tone.bg, tone.text),
        ],
      },
      {
        width: 72,
        table: {
          body: [[
            {
              text: `${evaluation.overallScore}%`,
              fontSize: 22,
              bold: true,
              color: tone.text,
              alignment: "center",
              fillColor: tone.bg,
              margin: [0, 8, 0, 8] as [number, number, number, number],
            },
          ]],
        },
        layout: "noBorders",
      },
    ],
    margin: [0, 0, 0, 10] as [number, number, number, number],
  });

  if (evaluation.criteria.length > 0) {
    nodes.push({ text: labels.aiCriteria, style: "subSectionTitle" });
    for (const c of evaluation.criteria) {
      const isBonus = JD_BONUS_CRITERION_KEYS.includes(
        c.key as (typeof JD_BONUS_CRITERION_KEYS)[number],
      );
      const label = isBonus ? `${c.label} (${labels.aiBonusCriterion})` : c.label;
      nodes.push(
        {
          columns: [
            { width: 118, text: label, fontSize: 9, color: C.text },
            { width: "*", stack: [pdfScoreBar(c.score)] },
          ],
          columnGap: 6,
        },
        ...(c.note
          ? [{ text: c.note, style: "muted", margin: [118, 0, 0, 6] as [number, number, number, number] }]
          : []),
      );
    }
  }

  if (evaluation.strengths.length > 0 || evaluation.concerns.length > 0) {
    const cols: PdfNode[] = [];
    if (evaluation.strengths.length > 0) {
      cols.push({
        width: "*",
        stack: [
          {
            text: labels.aiStrengths,
            style: "calloutTitle",
            fillColor: C.successBg,
            color: C.success,
            margin: [6, 4, 6, 2] as [number, number, number, number],
          },
          pdfBulletList(evaluation.strengths, C.success),
        ],
        margin: [0, 0, 4, 0] as [number, number, number, number],
      });
    }
    if (evaluation.concerns.length > 0) {
      cols.push({
        width: "*",
        stack: [
          {
            text: labels.aiConcerns,
            style: "calloutTitle",
            fillColor: C.warnBg,
            color: C.warn,
            margin: [6, 4, 6, 2] as [number, number, number, number],
          },
          pdfBulletList(evaluation.concerns, C.warn),
        ],
        margin: [4, 0, 0, 0] as [number, number, number, number],
      });
    }
    nodes.push({ columns: cols, margin: [0, 4, 0, 8] as [number, number, number, number] });
  }

  if (evaluation.conclusion.trim()) {
    nodes.push(
      { text: labels.aiConclusion, style: "subSectionTitle" },
      {
        text: evaluation.conclusion.trim(),
        style: "body",
        fillColor: C.brandSoft,
        margin: [0, 0, 0, 0] as [number, number, number, number],
      },
    );
  }

  return nodes;
}

export function countLinxaDirections(messages: LinxaChatMessage[]): {
  total: number;
  inbound: number;
  outbound: number;
  unknown: number;
} {
  let inbound = 0;
  let outbound = 0;
  let unknown = 0;
  for (const m of messages) {
    if (m.direction === "inbound") inbound += 1;
    else if (m.direction === "outbound") outbound += 1;
    else unknown += 1;
  }
  return { total: messages.length, inbound, outbound, unknown };
}

export function pdfLinxaThread(
  messages: LinxaChatMessage[],
  opts: {
    locale: string;
    fromCandidate: string;
    fromMe: string;
    unknownSender: string;
    statsLine: string;
  },
): PdfNode[] {
  const nodes: PdfNode[] = [];
  nodes.push({
    text: opts.statsLine,
    style: "muted",
    margin: [0, 0, 0, 8] as [number, number, number, number],
  });

  for (const msg of messages) {
    const isOutbound = msg.direction === "outbound";
    const isInbound = msg.direction === "inbound";
    const sender = isInbound
      ? opts.fromCandidate
      : isOutbound
        ? opts.fromMe
        : opts.unknownSender;
    const time = formatMsgTime(msg.sentAt, opts.locale);
    const header = time ? `${sender} · ${time}` : sender;

    const bubble: PdfNode = {
      table: {
        widths: ["*"],
        body: [[
          {
            stack: [
              { text: header, style: "chatMeta" },
              { text: msg.text.trim(), style: "chatBody" },
            ],
            margin: [8, 6, 8, 6] as [number, number, number, number],
          },
        ]],
      },
      layout: {
        hLineWidth: () => 1,
        vLineWidth: () => 1,
        hLineColor: () => (isOutbound ? C.outboundBorder : C.inboundBorder),
        vLineColor: () => (isOutbound ? C.outboundBorder : C.inboundBorder),
      },
      fillColor: isOutbound ? C.outboundBg : C.inboundBg,
    };

    nodes.push({
      columns: isOutbound
        ? [{ width: "22%", text: "" }, { width: "*", stack: [bubble] }]
        : [{ width: "*", stack: [bubble] }, { width: "22%", text: "" }],
      margin: [0, 0, 0, 6] as [number, number, number, number],
    });
  }

  return nodes;
}

function formatMsgTime(sentAt: string | null, locale: string): string {
  if (!sentAt) return "";
  const d = new Date(sentAt);
  if (Number.isNaN(d.getTime())) return "";
  const loc = locale === "vi" ? "vi-VN" : "en-US";
  return d.toLocaleString(loc, { dateStyle: "short", timeStyle: "short" });
}

export const PDF_DOC_STYLES = {
  docTitle: { fontSize: 22, bold: true, color: C.text, margin: [0, 0, 0, 4] as [number, number, number, number] },
  subtitle: { fontSize: 12, color: C.muted, margin: [0, 2, 0, 0] as [number, number, number, number] },
  sectionBanner: {
    fontSize: 11,
    bold: true,
    color: C.brand,
    letterSpacing: 0.5,
  },
  subSectionTitle: {
    fontSize: 9.5,
    bold: true,
    color: C.brand,
    margin: [0, 6, 0, 4] as [number, number, number, number],
  },
  body: { fontSize: 9.5, lineHeight: 1.4, color: C.text },
  bullet: { fontSize: 9.5, lineHeight: 1.4 },
  muted: { fontSize: 8.5, italics: true, color: C.muted },
  kvLabel: { fontSize: 8.5, color: C.muted },
  kvValue: { fontSize: 9.5, color: C.text, bold: true },
  calloutTitle: { fontSize: 8.5, bold: true },
  chatMeta: { fontSize: 7.5, bold: true, color: C.muted, margin: [0, 0, 0, 3] as [number, number, number, number] },
  chatBody: { fontSize: 9.5, color: C.text, lineHeight: 1.4 },
};
