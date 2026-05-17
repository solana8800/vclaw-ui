import { describe, expect, it } from "vitest";
import { resolveLinkedInOutreachMode } from "@/lib/recruitment/candidate-badge-styles";

const isLi = (url?: string | null) => Boolean(url?.includes("/in/"));

describe("resolveLinkedInOutreachMode", () => {
  it("returns message when connected", () => {
    expect(
      resolveLinkedInOutreachMode("CONNECTED", "https://linkedin.com/in/foo", isLi),
    ).toBe("message");
  });

  it("returns connect when not connected", () => {
    expect(
      resolveLinkedInOutreachMode("NOT_CONNECTED", "https://linkedin.com/in/foo", isLi),
    ).toBe("connect");
  });

  it("returns pending when invitation sent", () => {
    expect(resolveLinkedInOutreachMode("PENDING", "https://linkedin.com/in/foo", isLi)).toBe(
      "pending",
    );
  });

  it("returns none without linkedin url", () => {
    expect(resolveLinkedInOutreachMode("CONNECTED", null, isLi)).toBe("none");
  });
});
