import { describe, expect, it } from "vitest";

import {
  inferLinxaDirectionFromText,
  messageDirectionFromLinxaId,
  refineLinxaMessageDirections,
} from "@/lib/recruitment/linxa-message-direction";
import { extractLinxaChatMessages } from "@/lib/recruitment/linxa-message-map";

describe("messageDirectionFromLinxaId", () => {
  it("đọc suffix 001/003 là outbound, 002/004 là inbound", () => {
    const outboundId =
      "2-" +
      Buffer.from("1776323216329b44413-001&8a7cc2dd-8738-4741-8477-a4f3dbbfbbc1_100", "utf8").toString(
        "base64",
      );
    const inboundId =
      "2-" +
      Buffer.from("1776323216329b44413-004&8a7cc2dd-8738-4741-8477-a4f3dbbfbbc1_100", "utf8").toString(
        "base64",
      );
    expect(messageDirectionFromLinxaId(outboundId)).toBe("outbound");
    expect(messageDirectionFromLinxaId(inboundId)).toBe("inbound");
  });
});

describe("extractLinxaChatMessages + refine", () => {
  it("gán hướng từ id Linxa thật", () => {
    const outboundId =
      "2-" +
      Buffer.from("1776323216329b44413-003&chat", "utf8").toString("base64");
    const inboundId =
      "2-" + Buffer.from("1776323216329b44413-002&chat", "utf8").toString("base64");
    const list = extractLinxaChatMessages([
      { id: outboundId, text: "Hi JD", createdAt: "2026-01-01T00:00:00Z", type: "MEMBER_TO_MEMBER" },
      { id: inboundId, text: "có nha", createdAt: "2026-01-01T00:01:00Z", type: "MEMBER_TO_MEMBER" },
    ]);
    expect(list[0]?.direction).toBe("outbound");
    expect(list[1]?.direction).toBe("inbound");
  });

  it("suffix 100 dùng heuristic văn bản", () => {
    const id =
      "2-" +
      Buffer.from("1776323216329b44413-100&chat", "utf8").toString("base64");
    const list = refineLinxaMessageDirections(
      extractLinxaChatMessages([
        { id, text: "gì thế anh zai ơi", createdAt: null, type: "MEMBER_TO_MEMBER" },
      ]),
      "Que Le",
    );
    expect(list[0]?.direction).toBe("inbound");
  });
});

describe("inferLinxaDirectionFromText", () => {
  it("nhận diện tin recruiter gửi", () => {
    expect(inferLinxaDirectionFromText("em gửi anh jd")).toBe("outbound");
  });

  it("phân loại hội thoại suffix-100 (API Linxa thực tế)", () => {
    const id =
      "2-" + Buffer.from("1776323216329b44413-100&chat", "utf8").toString("base64");
    const msgs = refineLinxaMessageDirections(
      extractLinxaChatMessages([
        { id, text: "em gui anh jd", createdAt: null, type: "MEMBER_TO_MEMBER" },
        { id, text: "gì thế anh zai ơi ^^", createdAt: null, type: "MEMBER_TO_MEMBER" },
        { id, text: "app này anh code mà", createdAt: null, type: "MEMBER_TO_MEMBER" },
        { id, text: "hii em làm gì có xiền mua premium", createdAt: null, type: "MEMBER_TO_MEMBER" },
      ]),
      "Que Le",
    );
    expect(msgs.filter((m) => m.direction === "outbound").length).toBeGreaterThan(0);
    expect(msgs.filter((m) => m.direction === "inbound").length).toBeGreaterThan(0);
  });
});
