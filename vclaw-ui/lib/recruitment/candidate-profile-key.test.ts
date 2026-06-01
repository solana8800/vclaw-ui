import { describe, expect, it } from "vitest";
import {
  guessNameFromLinkedInUrl,
  isValidLinkedInProfileInput,
  linkedinChatStorageKey,
  normalizeLinkedInProfileUrl,
  profileUrlStorageKey,
  resolveStoredProfileUrl,
} from "./candidate-profile-key";

describe("candidate-profile-key", () => {
  it("chuẩn hóa URL LinkedIn", () => {
    expect(
      normalizeLinkedInProfileUrl("https://www.linkedin.com/in/Foo-Bar/?trk=x"),
    ).toBe("https://www.linkedin.com/in/Foo-Bar");
    expect(normalizeLinkedInProfileUrl("nguyen-van-a")).toBe(
      "https://www.linkedin.com/in/nguyen-van-a",
    );
  });

  it("xác thực và đoán tên từ URL", () => {
    expect(isValidLinkedInProfileInput("https://linkedin.com/in/jane-doe")).toBe(true);
    expect(isValidLinkedInProfileInput("https://facebook.com/x")).toBe(false);
    expect(isValidLinkedInProfileInput("https://example.com/linkedin.com/in/jane-doe")).toBe(false);
    expect(isValidLinkedInProfileInput("https://www.linkedin.com/company/vclaw")).toBe(false);
    expect(guessNameFromLinkedInUrl("https://www.linkedin.com/in/nguyen-van-a")).toBe(
      "Nguyen Van A",
    );
  });

  it("cùng slug → cùng key", () => {
    const a = profileUrlStorageKey("https://www.linkedin.com/in/john-doe");
    const b = profileUrlStorageKey("https://linkedin.com/in/john-doe/");
    expect(a).toBe(b);
  });

  it("linkedin chat key", () => {
    expect(profileUrlStorageKey("linkedin://chat/abc-123")).toBe("linkedin:chat:abc-123");
    expect(linkedinChatStorageKey("abc-123")).toBe("linkedin:chat:abc-123");
  });

  it("ưu tiên URL LinkedIn khi lưu", () => {
    expect(
      resolveStoredProfileUrl("https://www.linkedin.com/in/jane", "chat-1"),
    ).toBe("https://www.linkedin.com/in/jane");
    expect(resolveStoredProfileUrl("linkedin://chat/x", "x")).toBe("linkedin://chat/x");
  });
});
