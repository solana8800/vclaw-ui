import { describe, expect, it } from "vitest";
import { scoreTone } from "@/lib/recruitment/candidate-detail-pdf-layout";

describe("scoreTone", () => {
  it("maps high scores to strong fit", () => {
    expect(scoreTone(82).labelVi).toBe("Phù hợp cao");
  });

  it("maps low scores to needs review", () => {
    expect(scoreTone(40).labelEn).toBe("Needs review");
  });
});
