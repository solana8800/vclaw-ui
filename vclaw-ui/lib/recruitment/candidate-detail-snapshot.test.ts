import { describe, expect, it } from "vitest";
import { mapRowToDetailSnapshot } from "@/lib/recruitment/candidate-types";

describe("mapRowToDetailSnapshot", () => {
  it("map đủ field hiển thị sheet", () => {
    const snap = mapRowToDetailSnapshot({
      id: "c1",
      name: "An",
      headline: "Dev",
      matchScore: 80,
      jobPositionId: "j1",
      jobPosition: { id: "j1", title: "React" },
      updatedAt: "2026-05-16T00:00:00.000Z",
    });
    expect(snap.id).toBe("c1");
    expect(snap.name).toBe("An");
    expect(snap.matchScore).toBe(80);
    expect(snap.jobPosition?.title).toBe("React");
  });
});
