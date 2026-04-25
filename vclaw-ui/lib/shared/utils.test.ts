import { describe, expect, it } from "vitest";
import { foldLocaleSearchString } from "./utils";

describe("foldLocaleSearchString", () => {
  it("bỏ dấu tiếng Việt và không phân biệt hoa thường", () => {
    expect(foldLocaleSearchString("Nguyễn")).toBe("nguyen");
    expect(foldLocaleSearchString("  Hà Nội  ")).toBe("ha noi");
  });

  it("chuẩn hoá chữ đ/Đ thành d để khớp gõ không dấu", () => {
    expect(foldLocaleSearchString("Đồng Nai")).toBe("dong nai");
    expect(foldLocaleSearchString("đồng")).toBe("dong");
  });
});
