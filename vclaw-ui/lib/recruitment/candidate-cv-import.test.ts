import { describe, expect, it } from "vitest";
import {
  buildCandidateCvImportMetadata,
  guessCandidateNameFromCv,
} from "@/lib/recruitment/candidate-cv-import";

describe("candidate-cv-import", () => {
  it("does not attach LinkedIn URLs found inside a CV", () => {
    expect(
      buildCandidateCvImportMetadata(
        "LinkedIn: https://www.linkedin.com/in/nguyen-van-a/?trk=resume.\nWebsite: https://example.com",
        "CV_Nguyen-Van-A.pdf",
      ),
    ).toEqual({ name: "Nguyen Van A" });
  });

  it("uses the first suitable CV line as candidate name", () => {
    expect(
      guessCandidateNameFromCv(
        "# Nguyen Van A\nSenior Backend Engineer\nEmail: a@example.com",
        "cv-nguyen-van-a.pdf",
      ),
    ).toBe("Nguyen Van A");
  });

  it("falls back to a cleaned filename when CV text has no suitable name", () => {
    expect(
      guessCandidateNameFromCv(
        "Email: a@example.com\nhttps://www.linkedin.com/in/nguyen-van-a",
        "CV_Nguyen-Van-A_2026.pdf",
      ),
    ).toBe("Nguyen Van A");
  });
});
