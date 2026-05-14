import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  order: {
    update: vi.fn(),
  },
  shopSettings: {
    findFirst: vi.fn(),
  },
}));

const getOrderWithOptionalProductsMock = vi.hoisted(() => vi.fn());
const normalizeAddressMock = vi.hoisted(() => vi.fn());
const resolveGhnLocationForFeeMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/db", () => ({ prisma: prismaMock }));
vi.mock("@/lib/commerce/orders", () => ({
  getOrderWithOptionalProducts: getOrderWithOptionalProductsMock,
}));
vi.mock("@/lib/logistics/shipping", () => ({
  normalizeAddress: normalizeAddressMock,
}));
vi.mock("@/lib/logistics/ghn-resolve", () => ({
  resolveGhnLocationForFee: resolveGhnLocationForFeeMock,
}));

describe("createGhnOrder", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.shopSettings.findFirst.mockResolvedValue({
      ghnToken: "token",
      ghnShopId: "shop-1",
    });
    getOrderWithOptionalProductsMock.mockResolvedValue({
      id: "order_1",
      orderNumber: "VCLA051400001",
      shippingAddress: "Tòa S101, Vinhomes Ocean Park, Gia Lâm, Hà Nội",
      shippingNote: "Giao giờ hành chính",
      customer: { name: "Anh Nam", phone: "0900000000" },
      items: [
        {
          quantity: 1,
          price: 90000,
          product: { name: "Set móc khóa", productCode: "SOUV-SW-KEYCHAIN-SET" },
        },
      ],
    });
    normalizeAddressMock.mockResolvedValue({
      normalized: "Tòa S101, Vinhomes Ocean Park, xã Đa Tốn, huyện Gia Lâm, Hà Nội",
      province: "Hà Nội",
      district: "Gia Lâm",
      ward: "Đa Tốn",
      street: "Tòa S101, Vinhomes Ocean Park",
    });
    resolveGhnLocationForFeeMock.mockResolvedValue({
      toDistrictId: 1542,
      toWardCode: "1A0907",
    });
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        json: async () => ({
          code: 200,
          data: {
            order_code: "LX7BBV",
            total_fee: 64900,
            expected_delivery_time: "2026-05-15T16:59:59Z",
          },
        }),
      })),
    );
  });

  it("lưu mã vận đơn và phí ship vào order khi tạo GHN thành công", async () => {
    const { createGhnOrder } = await import("@/lib/logistics/ghn-order");

    const result = await createGhnOrder("order_1");

    expect(result).toMatchObject({
      success: true,
      orderCode: "LX7BBV",
      trackingUrl: "https://tracking.ghn.dev/?order_code=LX7BBV",
      totalFee: 64900,
    });
    expect(prismaMock.order.update).toHaveBeenCalledWith({
      where: { id: "order_1" },
      data: {
        trackingNumber: "LX7BBV",
        shippingEstimate: 64900,
        fulfillmentStatus: "SHIPPING",
      },
    });
  });
});
