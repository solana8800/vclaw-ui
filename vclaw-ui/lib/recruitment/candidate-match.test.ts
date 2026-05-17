import { describe, expect, it } from "vitest";
import { parseCandidateMatchResponse } from "./candidate-match";

describe("parseCandidateMatchResponse", () => {
  it("parse mảng matches", () => {
    const raw = JSON.stringify({
      matches: [
        {
          profile_url: "https://www.linkedin.com/in/foo",
          score: 88,
          summary: "Phù hợp React.",
        },
      ],
    });
    const rows = parseCandidateMatchResponse(raw);
    expect(rows).toHaveLength(1);
    expect(rows[0].score).toBe(88);
  });

  it("clamp score 0-100", () => {
    const raw = JSON.stringify({
      matches: [{ profile_url: "https://linkedin.com/in/x", score: 150, summary: "ok" }],
    });
    expect(parseCandidateMatchResponse(raw)[0].score).toBe(100);
  });

  it("trả rỗng khi JSON lỗi", () => {
    expect(parseCandidateMatchResponse("not json")).toEqual([]);
  });
});
