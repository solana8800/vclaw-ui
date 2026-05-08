import { afterEach, describe, expect, it, vi } from "vitest";

const findFirstMock = vi.fn();
const getEnrichedContextMock = vi.fn();

vi.mock("@/lib/db", () => ({
  prisma: {
    shopSettings: {
      findFirst: findFirstMock,
    },
  },
}));

vi.mock("@/lib/ai/enrichment", () => ({
  getEnrichedContext: getEnrichedContextMock,
}));

describe("POST /api/vclaw/enrich", () => {
  afterEach(() => {
    vi.resetModules();
    findFirstMock.mockReset();
    getEnrichedContextMock.mockReset();
  });

  it("trả tín hiệu bỏ qua auto-reply khi Automation đang tắt", async () => {
    findFirstMock.mockResolvedValue({
      approvalConfigJson: JSON.stringify({
        paymentAutoApprove: false,
        automationEnabled: false,
      }),
    });

    const { POST } = await import("@/app/api/vclaw/enrich/route");
    const res = await POST(
      new Request("http://vclaw.test/api/vclaw/enrich", {
        method: "POST",
        body: JSON.stringify({ message: "alo shop", externalId: "user:1" }),
      }) as any,
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toMatchObject({
      ok: true,
      prompt: "",
      metadata: {
        enriched: false,
        automationEnabled: false,
        skipAutoReply: true,
        reason: "automation_disabled",
      },
    });
    expect(getEnrichedContextMock).not.toHaveBeenCalled();
  });
});
