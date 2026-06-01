import { describe, expect, it } from "vitest";
import { parseRecruitmentAutomation, DEFAULT_RECRUITMENT_AUTOMATION } from "./automation-settings";

describe("parseRecruitmentAutomation", () => {
  it("mặc định tắt khi chưa có settings", () => {
    expect(parseRecruitmentAutomation(null)).toEqual(DEFAULT_RECRUITMENT_AUTOMATION);
  });

  it("đọc cờ từ RecruitmentSettings", () => {
    expect(
      parseRecruitmentAutomation({
        id: "default",
        linkedinCompanyUrl: null,
        autoInviteOnMatch: true,
        autoIntroOnAccept: false,
        autoCollectOnPositive: true,
        autoRemindInterview: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    ).toEqual({
      autoInviteOnMatch: true,
      autoIntroOnAccept: false,
      autoCollectOnPositive: true,
      autoRemindInterview: false,
    });
  });
});
