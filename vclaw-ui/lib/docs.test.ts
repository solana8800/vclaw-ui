import { describe, expect, it } from "vitest";

import {
  getAllDocs,
  getDocBySlug,
  getDocCategories,
  getNextPreviousDocs,
  slugFromFileName,
} from "@/lib/docs";

describe("docs utilities", () => {
  it("creates slugs from localized markdown filenames", () => {
    expect(slugFromFileName("00-Business-Requirements.vi.md")).toEqual([
      "00-Business-Requirements",
    ]);
  });

  it("lists the repo docs as localized navigation entries", () => {
    const docs = getAllDocs("vi");

    expect(docs.length).toBeGreaterThanOrEqual(5);
    expect(docs[0]).toMatchObject({
      href: "/vi/docs/00-Business-Requirements",
      title: "Yêu cầu nghiệp vụ",
      category: "Tài liệu cốt lõi",
    });
  });

  it("lists english docs with /en-prefixed hrefs", () => {
    const docs = getAllDocs("en");

    expect(docs[0]).toMatchObject({
      href: "/en/docs/00-Business-Requirements",
      title: "Business requirements",
      category: "Core docs",
    });
  });

  it("groups docs into localized categories", () => {
    const categories = getDocCategories("vi");

    expect(categories).toHaveLength(2);
    expect(categories[0].items.length).toBeGreaterThan(0);
  });

  it("reads a Vietnamese document by locale", () => {
    const doc = getDocBySlug(["00-Business-Requirements"], "vi");

    expect(doc.title).toBe("Yêu cầu nghiệp vụ");
    expect(doc.requestedLocale).toBe("vi");
    expect(doc.resolvedLocale).toBe("vi");
    expect(doc.didFallback).toBe(false);
    expect(doc.content).toContain("VClaw");
  });

  it("does not serve private docs that were moved out of vclaw-ui/docs", () => {
    expect(getAllDocs("vi").some((d) => d.slug[0] === "CRITIQUE")).toBe(false);
    expect(() => getDocBySlug(["CRITIQUE"], "en")).toThrow();
  });

  it("rejects path traversal", () => {
    expect(() => getDocBySlug(["..", "secrets"], "vi")).toThrow(
      "Invalid documentation slug",
    );
  });

  it("returns previous and next docs for a localized document", () => {
    const nav = getNextPreviousDocs(["01-System-Architecture"], "en");

    expect(nav.previous?.href).toBe("/en/docs/00-Business-Requirements");
    expect(nav.next?.href).toBe("/en/docs/02-Product-Requirements-Document");
  });
});
