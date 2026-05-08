import { describe, expect, it, vi } from "vitest";

const findFirstMock = vi.fn();
const executeToolMock = vi.fn();

vi.mock("@/lib/db", () => ({
  prisma: {
    customer: {
      findFirst: findFirstMock,
    },
    order: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("@/lib/ai/tools", () => ({
  executeVclawAgentTool: executeToolMock,
}));

describe("executeOrderAction", () => {
  it("lấy đúng địa chỉ có dấu và không bắt nhầm chữ o trong tên sản phẩm", async () => {
    const { executeOrderAction } = await import("@/lib/ai/enrichment-actions");
    findFirstMock.mockResolvedValue(null);
    executeToolMock.mockResolvedValue({
      ok: true,
      result: { orderNumber: "VESU050700001", orderId: "order_1", qrUrl: "https://img.vietqr.io/test.png" },
    });

    await executeOrderAction({
      items: [{ name: "Vé vào cổng Khu du lịch Núi Bà Đen (Tây Ninh)", qty: 2, price: 10000 }],
      totalAmount: 20000,
      phone: "0987654305",
      currentCustomer: null,
      userMessage:
        "Tôi muốn mua 2 vé Vé vào cổng Khu du lịch Núi Bà Đen (Tây Ninh), sdt 0987654305, địa chỉ test VClaw quận 1",
      source: "zalo",
    });

    expect(executeToolMock).toHaveBeenCalledWith(
      "vclaw.order.create",
      expect.objectContaining({
        shippingNote: "test VClaw quận 1",
      })
    );
  });
});

describe("executePaymentAction", () => {
  it("không tự xác nhận thanh toán khi cổng tự động duyệt đang tắt", async () => {
    const { executePaymentAction } = await import("@/lib/ai/enrichment-actions");
    const prisma = await import("@/lib/db");

    (prisma.prisma.order.findFirst as any).mockResolvedValue({
      id: "order_1",
      orderNumber: "ORD-1",
      amount: 120000,
      status: "PENDING",
    });

    const results = await executePaymentAction(
      {
        id: "customer_1",
        name: "Anh Test",
        phone: "0987654321",
        orders: [],
      } as any,
      { paymentAutoApprove: false },
    );

    expect(prisma.prisma.order.update).not.toHaveBeenCalled();
    expect(results.join("\n")).toContain("chờ shop kiểm tra");
  });
});
