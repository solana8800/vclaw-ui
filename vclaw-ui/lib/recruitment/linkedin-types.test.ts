import { describe, expect, it } from "vitest";
import {
  hasLinkedInSession,
  isLinkedInProfileLoggedIn,
  profileDisplayName,
  profileInitials,
} from "./linkedin-types";

describe("linkedin-types", () => {
  it("isLinkedInProfileLoggedIn detects li_at cookie", () => {
    expect(isLinkedInProfileLoggedIn({ sessionCookie: "abc" })).toBe(true);
  });

  it("isLinkedInProfileLoggedIn rejects failed profile", () => {
    expect(isLinkedInProfileLoggedIn({ success: false, name: "Test" })).toBe(false);
  });

  it("profileDisplayName skips N/A", () => {
    expect(profileDisplayName({ name: "N/A" })).toBe("");
    expect(profileDisplayName({ name: "Nguyen Van A" })).toBe("Nguyen Van A");
  });

  it("profileInitials", () => {
    expect(profileInitials("Nguyen Van A")).toBe("NA");
  });

  it("hasLinkedInSession", () => {
    expect(hasLinkedInSession(JSON.stringify({ cookie: "li_at=xyz" }))).toBe(true);
    expect(hasLinkedInSession("{}")).toBe(false);
  });
});
