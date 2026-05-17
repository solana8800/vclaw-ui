import { describe, expect, it } from "vitest";
import {
  buildExtractedInfoJson,
  hasExtractedProfileContent,
  mergeExtractedInfoJson,
  parseExtractedProfileInfo,
} from "./candidate-profile";

describe("parseExtractedProfileInfo", () => {
  it("đọc about, experience, education, skills", () => {
    const raw = buildExtractedInfoJson({
      success: true,
      about: "Dev",
      experiences: ["Co A · Dev · 2020–Now"],
      education: ["Uni X · CS"],
      skills: ["TypeScript", "Node.js"],
    });
    const info = parseExtractedProfileInfo(raw);
    expect(info.about).toBe("Dev");
    expect(info.experiences).toHaveLength(1);
    expect(info.education).toHaveLength(1);
    expect(info.skills).toEqual(["TypeScript", "Node.js"]);
  });
});

describe("hasExtractedProfileContent", () => {
  it("false khi rỗng", () => {
    expect(hasExtractedProfileContent({})).toBe(false);
  });

  it("true khi có experience", () => {
    expect(hasExtractedProfileContent({ experiences: ["A · Dev"] })).toBe(true);
  });
});

describe("mergeExtractedInfoJson", () => {
  it("giữ dữ liệu cũ khi scrape mới thiếu field", () => {
    const existing = buildExtractedInfoJson({
      success: true,
      about: "About cũ",
      experiences: ["Exp cũ"],
      skills: ["Go"],
    });
    const merged = mergeExtractedInfoJson(existing, {
      success: true,
      about: "N/A",
      education: ["Uni mới"],
      skills: ["TypeScript"],
    });
    const info = parseExtractedProfileInfo(merged);
    expect(info.about).toBe("About cũ");
    expect(info.experiences).toContain("Exp cũ");
    expect(info.education).toContain("Uni mới");
    expect(info.skills).toEqual(expect.arrayContaining(["Go", "TypeScript"]));
  });
});
