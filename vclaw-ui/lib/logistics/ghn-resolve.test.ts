import { describe, it, expect } from "vitest";
import { normalizeAddressKey } from "./ghn-resolve";

describe("normalizeAddressKey", () => {
  it("chuẩn hóa tiếng Việt có dấu", () => {
    expect(normalizeAddressKey("Hồ Chí Minh")).toBe("ho chi minh");
    expect(normalizeAddressKey("Quận 1")).toBe("1");
  });

  it("bỏ tiền tố thường gặp", () => {
    expect(normalizeAddressKey("Thành phố Hồ Chí Minh")).toContain("ho chi minh");
    expect(normalizeAddressKey("Phường Bến Nghé")).toContain("ben nghe");
  });
});
