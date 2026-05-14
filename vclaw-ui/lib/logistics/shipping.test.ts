import { beforeEach, describe, expect, it, vi } from "vitest";

const gatewayPostMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/gateway/server", () => ({
  gateway: {
    post: gatewayPostMock,
  },
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    shopSettings: {
      findFirst: vi.fn(),
    },
  },
}));

vi.mock("@/lib/logistics/ghn-quote", () => ({
  tryGhnShippingFee: vi.fn(),
}));

vi.mock("@/lib/logistics/ghn-resolve", () => ({
  resolveGhnLocationForFee: vi.fn(),
}));

describe("standardizeAddress", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("dùng OpenClaw chat completions thay vì endpoint text-processing legacy", async () => {
    gatewayPostMock.mockResolvedValueOnce({
      choices: [
        {
          message: {
            content: JSON.stringify({
              province: "Hà Nội",
              district: "Gia Lâm",
              ward: "Đa Tốn",
              street: "Tòa S101, Vinhomes Ocean Park",
            }),
          },
        },
      ],
    });

    const { standardizeAddress } = await import("@/lib/logistics/shipping");

    const result = await standardizeAddress(
      "Tòa S101, Vinhomes Ocean Park, xã Đa Tốn, huyện Gia Lâm, Hà Nội",
    );

    expect(result).toEqual({
      success: true,
      data: {
        province: "Hà Nội",
        district: "Gia Lâm",
        ward: "Đa Tốn",
        street: "Tòa S101, Vinhomes Ocean Park",
      },
    });
    expect(gatewayPostMock).toHaveBeenCalledTimes(1);
    expect(gatewayPostMock).toHaveBeenCalledWith(
      "/v1/chat/completions",
      expect.objectContaining({
        model: "openclaw",
        temperature: 0,
      }),
      expect.objectContaining({
        headers: expect.objectContaining({
          "x-openclaw-model": "deepseek-web/deepseek-chat",
        }),
      }),
    );
  });
});
