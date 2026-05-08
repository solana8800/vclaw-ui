import { describe, expect, it } from "vitest";

import { prepareZalouserOutgoingMessage } from "@/lib/zalouser/zalouser-outgoing-media";

describe("prepareZalouserOutgoingMessage", () => {
  it("turns VietQR image links into media payloads and removes the raw link from the caption", () => {
    const result = prepareZalouserOutgoingMessage(
      "Chuyen khoan don hang 125k https://img.vietqr.io/image/970422-123456789-compact2.png?amount=125000&addInfo=DH001",
    );

    expect(result).toEqual({
      message: "Chuyen khoan don hang 125k",
      mediaUrl:
        "https://img.vietqr.io/image/970422-123456789-compact2.png?amount=125000&addInfo=DH001",
    });
  });

  it("keeps reply-to-current directives while extracting media links", () => {
    const result = prepareZalouserOutgoingMessage(
      "[[reply_to_current]] Em gui ma QR thanh toan nha https://img.vietqr.io/image/970422-123456789-print.png?amount=99000.",
    );

    expect(result).toEqual({
      message: "[[reply_to_current]] Em gui ma QR thanh toan nha",
      mediaUrl: "https://img.vietqr.io/image/970422-123456789-print.png?amount=99000",
    });
  });

  it("detects regular image URLs with query strings", () => {
    const result = prepareZalouserOutgoingMessage(
      "Anh xem mau nay https://cdn.example.com/product/photo.jpg?version=2",
    );

    expect(result).toEqual({
      message: "Anh xem mau nay",
      mediaUrl: "https://cdn.example.com/product/photo.jpg?version=2",
    });
  });

  it("does not turn arbitrary Unsplash URLs without file extensions into media payloads", () => {
    const result = prepareZalouserOutgoingMessage(
      "Ve cap treo Ba Na Hills https://images.unsplash.com/photo-1559592442-741eaf739780?w=1200&q=80",
    );

    expect(result).toEqual({
      message:
        "Ve cap treo Ba Na Hills https://images.unsplash.com/photo-1559592442-741eaf739780?w=1200&q=80",
    });
  });
});
