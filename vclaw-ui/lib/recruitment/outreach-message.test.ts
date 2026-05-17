import { describe, expect, it } from "vitest";
import { buildJdOutreachDraft } from "./outreach-message";

describe("buildJdOutreachDraft", () => {
  it("soạn mẫu tiếng Việt có tên và JD", () => {
    const text = buildJdOutreachDraft({
      candidateName: "Nguyen Van A",
      jobTitle: "Senior NodeJS Developer",
      jobRequirements: "Node.js, TypeScript",
      locale: "vi",
    });
    expect(text).toContain("Chào Nguyen");
    expect(text).toContain("Senior NodeJS Developer");
    expect(text).toContain("Node.js");
  });
});
