import fs from "node:fs";
import path from "node:path";

import { getLocaleHref, type AppLocale } from "@/i18n/routing";

export type DocEntry = {
  slug: string[];
  href: string;
  fileName: string;
  title: string;
  category: string;
  isPublic: boolean;
};

export type DocRecord = DocEntry & {
  content: string;
  requestedLocale: AppLocale;
  resolvedLocale: AppLocale;
  didFallback: boolean;
};

type DocCategory = {
  title: string;
  items: DocEntry[];
};

const DOCS_ROOT = path.join(process.cwd(), "docs");
const MARKDOWN_FILE_PATTERN = /(?:\.(vi|en))?\.md$/i;
const DOC_TITLES: Record<string, Record<AppLocale, string>> = {
  "00-VClaw-Platform-Vision": {
    vi: "Tầm nhìn nền tảng VClaw",
    en: "VClaw Platform Vision",
  },
  "00-Business-Requirements": {
    vi: "Yêu cầu nghiệp vụ",
    en: "Business requirements",
  },
  "01-System-Architecture": {
    vi: "Kiến trúc hệ thống",
    en: "System architecture",
  },
  "02-Product-Requirements-Document": {
    vi: "Tài liệu yêu cầu sản phẩm",
    en: "Product requirements document",
  },
  "03-Commerce-Admin-and-Omnichannel-Usecases": {
    vi: "Use case quản trị thương mại và đa kênh",
    en: "Commerce admin and omnichannel use cases",
  },
  "04-UI-Design-And-Screen-Specs": {
    vi: "Thiết kế UI và đặc tả màn hình",
    en: "UI design and screen specs",
  },
  "09-Business-Financial-Evaluation": {
    vi: "Đánh giá tài chính doanh nghiệp",
    en: "Business financial evaluation",
  },
  "11-User-Manual-And-Installation": {
    vi: "Hướng dẫn sử dụng và cài đặt",
    en: "User manual and installation",
  },
};
const PUBLIC_DOCS_SLUGS = [
  "00-VClaw-Platform-Vision",
  "00-Business-Requirements",
  "02-Product-Requirements-Document",
  "03-Commerce-Admin-and-Omnichannel-Usecases",
  "04-UI-Design-And-Screen-Specs",
  "09-Business-Financial-Evaluation",
  "11-User-Manual-And-Installation",
];
const DOC_CATEGORY_LABELS: Record<AppLocale, Record<"core" | "extended", string>> = {
  vi: {
    core: "Tài liệu cốt lõi",
    extended: "Tài liệu mở rộng",
  },
  en: {
    core: "Core docs",
    extended: "Extended docs",
  },
};

function getDocsRoot(): string | null {
  return fs.existsSync(DOCS_ROOT) ? DOCS_ROOT : null;
}

function getBaseName(fileName: string): string {
  return fileName.replace(MARKDOWN_FILE_PATTERN, "");
}

function normalizeTitle(baseName: string, locale: AppLocale): string {
  const configured = DOC_TITLES[baseName]?.[locale];

  if (configured) {
    return configured;
  }

  return baseName
    .replace(/^\d+-/, "")
    .replace(/-/g, " ")
    .trim();
}

function classifyDoc(baseName: string, locale: AppLocale): string {
  const order = Number.parseInt(baseName.split("-")[0] ?? "0", 10);
  const category = order <= 5 ? "core" : "extended";

  return DOC_CATEGORY_LABELS[locale][category];
}

function readDocBaseNames(): string[] {
  const docsRoot = getDocsRoot();
  if (!docsRoot) {
    return [];
  }
  const names = new Set<string>();

  for (const entry of fs.readdirSync(docsRoot, { withFileTypes: true })) {
    if (!entry.isFile() || !MARKDOWN_FILE_PATTERN.test(entry.name)) {
      continue;
    }

    names.add(getBaseName(entry.name));
  }

  return Array.from(names).sort((left, right) => left.localeCompare(right));
}

function resolveDocFile(baseName: string, locale: AppLocale) {
  const docsRoot = getDocsRoot();
  if (!docsRoot) {
    throw new Error("Documentation root is not available");
  }
  const preferred =
    locale === "vi" ? `${baseName}.vi.md` : `${baseName}.en.md`;
  const fallback = `${baseName}.vi.md`;
  const legacy = `${baseName}.md`;

  if (fs.existsSync(path.join(docsRoot, preferred))) {
    return {
      fileName: preferred,
      resolvedLocale: locale,
      didFallback: false,
    } as const;
  }

  if (locale === "en" && fs.existsSync(path.join(docsRoot, fallback))) {
    return {
      fileName: fallback,
      resolvedLocale: "vi" as const,
      didFallback: true,
    };
  }

  if (locale === "vi" && fs.existsSync(path.join(docsRoot, legacy))) {
    return {
      fileName: legacy,
      resolvedLocale: "vi" as const,
      didFallback: false,
    };
  }

  if (locale === "en" && fs.existsSync(path.join(docsRoot, legacy))) {
    return {
      fileName: legacy,
      resolvedLocale: "vi" as const,
      didFallback: true,
    };
  }

  throw new Error(`Documentation file not found for ${baseName} (${locale})`);
}

export function slugFromFileName(fileName: string): string[] {
  return [getBaseName(fileName)];
}

export function getAllDocs(locale: AppLocale = "vi"): DocEntry[] {
  return readDocBaseNames()
    .map((baseName) => {
      try {
        const { fileName } = resolveDocFile(baseName, locale);
        const slug = [baseName];

        return {
          slug,
          href: getLocaleHref(locale, `/docs/${slug.join("/")}`),
          fileName,
          title: normalizeTitle(baseName, locale),
          category: classifyDoc(baseName, locale),
          isPublic: PUBLIC_DOCS_SLUGS.includes(baseName),
        };
      } catch (error) {
        console.error(`[Docs] Skipping invalid doc "${baseName}":`, error);
        return null;
      }
    })
    .filter((doc): doc is DocEntry => doc !== null);
}

export function getDocCategories(locale: AppLocale = "vi"): DocCategory[] {
  const grouped = new Map<string, DocEntry[]>();

  for (const doc of getAllDocs(locale)) {
    const current = grouped.get(doc.category) ?? [];
    current.push(doc);
    grouped.set(doc.category, current);
  }

  return Array.from(grouped.entries()).map(([title, items]) => ({
    title,
    items,
  }));
}

function validateSlug(slug: string[]): string[] {
  if (slug.some((segment) => !segment || segment.includes("..") || segment.includes("/"))) {
    throw new Error("Invalid documentation slug");
  }

  return slug;
}

export function getDocBySlug(
  slug: string[] = ["00-Business-Requirements"],
  locale: AppLocale = "vi",
): DocRecord {
  const safeSlug = validateSlug(slug);
  const baseName = safeSlug.join("/");
  const docsRoot = getDocsRoot();
  if (!docsRoot) {
    throw new Error("Documentation root is not available");
  }
  const { fileName, resolvedLocale, didFallback } = resolveDocFile(
    baseName,
    locale,
  );
  const fullPath = path.join(docsRoot, fileName);
  const content = fs.readFileSync(fullPath, "utf-8");
  const [entry] = getAllDocs(locale).filter((doc) => doc.fileName === fileName);

  if (!entry) {
    throw new Error(`Documentation metadata missing for ${fileName}`);
  }

  return {
    ...entry,
    content,
    requestedLocale: locale,
    resolvedLocale,
    didFallback,
  };
}

export function getNextPreviousDocs(
  slug: string[],
  locale: AppLocale = "vi",
): {
  previous?: DocEntry;
  next?: DocEntry;
} {
  const docs = getAllDocs(locale);
  const href = getLocaleHref(locale, `/docs/${validateSlug(slug).join("/")}`);
  const currentIndex = docs.findIndex((doc) => doc.href === href);

  if (currentIndex === -1) {
    return {};
  }

  return {
    previous: docs[currentIndex - 1],
    next: docs[currentIndex + 1],
  };
}

export function getDailyPassword(): string {
  const now = new Date();
  const day = now.getDate();
  const month = now.getMonth() + 1;
  const ddmm = day * 100 + month;
  const pass = Math.floor((ddmm * 3) / 2);
  // Lấy 4 số cuối: pass % 10000
  return (pass % 10000).toString().padStart(4, "0");
}
