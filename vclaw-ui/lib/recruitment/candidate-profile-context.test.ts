import { describe, expect, it } from "vitest";

import { buildCandidateProfileContext } from "@/lib/recruitment/candidate-profile-context";

describe("buildCandidateProfileContext", () => {
  it("includes contact, recruiter notes and cv when provided", () => {
    const ctx = buildCandidateProfileContext({
      name: "Bình",
      recruiterNotes: "PV tốt",
      email: "an@example.com",
      phone: "0901234567",
      cvText: "Senior engineer",
    });
    expect(ctx).toContain("LIÊN HỆ");
    expect(ctx).toContain("an@example.com");
    expect(ctx).toContain("0901234567");
    expect(ctx).toContain("GHI CHÚ HR");
    expect(ctx).toContain("PV tốt");
    expect(ctx).toContain("CV / RESUME");
    expect(ctx).toContain("Senior engineer");
  });
});
