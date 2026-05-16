import { describe, expect, it } from "vitest";
import {
  defaultRecruitmentLocation,
  normalizeWorkspaceLanguage,
} from "./workspace-language";

describe("normalizeWorkspaceLanguage", () => {
  it("mặc định vi", () => {
    expect(normalizeWorkspaceLanguage(null)).toBe("vi");
    expect(normalizeWorkspaceLanguage("")).toBe("vi");
  });

  it("nhận en", () => {
    expect(normalizeWorkspaceLanguage("en")).toBe("en");
    expect(normalizeWorkspaceLanguage("en-US")).toBe("en");
  });
});

describe("defaultRecruitmentLocation", () => {
  it("theo ngôn ngữ workspace", () => {
    expect(defaultRecruitmentLocation("vi")).toBe("Việt Nam");
    expect(defaultRecruitmentLocation("en")).toBe("Vietnam");
  });
});
