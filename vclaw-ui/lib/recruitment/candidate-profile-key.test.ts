import { describe, expect, it } from "vitest";
import {
  linxaChatStorageKey,
  normalizeLinkedInProfileUrl,
  profileUrlStorageKey,
  resolveStoredProfileUrl,
} from "./candidate-profile-key";

describe("candidate-profile-key", () => {
  it("chuẩn hóa URL LinkedIn", () => {
    expect(
      normalizeLinkedInProfileUrl("https://www.linkedin.com/in/Foo-Bar/?trk=x"),
    ).toBe("https://www.linkedin.com/in/Foo-Bar");
  });

  it("cùng slug → cùng key", () => {
    const a = profileUrlStorageKey("https://www.linkedin.com/in/john-doe");
    const b = profileUrlStorageKey("https://linkedin.com/in/john-doe/");
    expect(a).toBe(b);
  });

  it("linxa chat key", () => {
    expect(profileUrlStorageKey("linxa://chat/abc-123")).toBe("linxa:chat:abc-123");
    expect(linxaChatStorageKey("abc-123")).toBe("linxa:chat:abc-123");
  });

  it("ưu tiên URL LinkedIn khi lưu", () => {
    expect(
      resolveStoredProfileUrl("https://www.linkedin.com/in/jane", "chat-1"),
    ).toBe("https://www.linkedin.com/in/jane");
    expect(resolveStoredProfileUrl("linxa://chat/x", "x")).toBe("linxa://chat/x");
  });
});
