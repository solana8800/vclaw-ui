import { beforeEach, describe, expect, it, vi } from "vitest";

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
  beforeEach(() => {
    findFirstMock.mockReset();
    executeToolMock.mockReset();
  });

  it("lấy đúng địa chỉ có dấu và không bắt nhầm chữ o trong tên sản phẩm", async () => {
    const { executeOrderAction } = await import("@/lib/ai/enrichment-actions");
    findFirstMock.mockResolvedValue(null);
    executeToolMock
      .mockResolvedValueOnce({
        ok: true,
        result: { canCreateOrder: true, missingFields: [], totalAmount: 20000 },
      })
      .mockResolvedValueOnce({
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

  it("chuẩn bị checkout trước, truyền email vào order và trả transferNote để bot nhắn đúng nội dung CK", async () => {
    const { executeOrderAction } = await import("@/lib/ai/enrichment-actions");
    findFirstMock.mockResolvedValue(null);
    executeToolMock
      .mockResolvedValueOnce({
        ok: true,
        result: { canCreateOrder: true, missingFields: [], totalAmount: 950000 },
      })
      .mockResolvedValueOnce({
        ok: true,
        result: {
          orderNumber: "ORD-TEST",
          orderId: "order_1",
          qrUrl: "https://img.vietqr.io/image/TCB-123-print.png?amount=950000&addInfo=ORD-TEST+0900000124+SWBANAADUL+x1",
          transferNote: "ORD-TEST 0900000124 SWBANAADUL x1",
        },
      });

    const results = await executeOrderAction({
      items: [{ name: "Vé Cáp Treo Bà Nà Hills - Người Lớn", qty: 1, price: 950000 }],
      totalAmount: 950000,
      phone: "0900000124",
      email: "codex-test@example.com",
      currentCustomer: null,
      userMessage: "Chốt 1 vé Bà Nà người lớn, sdt 0900000124, email codex-test@example.com",
      source: "zalo",
    });

    expect(executeToolMock).toHaveBeenNthCalledWith(
      1,
      "vclaw.checkout.prepare",
      expect.objectContaining({
        email: "codex-test@example.com",
        items: expect.stringContaining("Vé Cáp Treo Bà Nà Hills - Người Lớn"),
      }),
    );
    expect(executeToolMock).toHaveBeenNthCalledWith(
      2,
      "vclaw.order.create",
      expect.objectContaining({
        email: "codex-test@example.com",
      }),
    );
    expect(results.join("\n")).toContain("Nội dung CK BẮT BUỘC: ORD-TEST 0900000124 SWBANAADUL x1");
    expect(results.join("\n")).toContain("https://img.vietqr.io/image/TCB-123-print.png");
  });

  it("không tạo đơn khi checkout.prepare báo thiếu dữ liệu", async () => {
    const { executeOrderAction } = await import("@/lib/ai/enrichment-actions");
    findFirstMock.mockResolvedValue(null);
    executeToolMock.mockResolvedValueOnce({
      ok: true,
      result: { canCreateOrder: false, missingFields: ["email"], totalAmount: 950000 },
    });

    const results = await executeOrderAction({
      items: [{ name: "Vé Cáp Treo Bà Nà Hills - Người Lớn", qty: 1, price: 950000 }],
      totalAmount: 950000,
      phone: "0900000125",
      currentCustomer: null,
      userMessage: "Chốt 1 vé Bà Nà người lớn, sdt 0900000125",
      source: "zalo",
    });

    expect(executeToolMock).toHaveBeenCalledTimes(1);
    expect(executeToolMock).toHaveBeenCalledWith("vclaw.checkout.prepare", expect.any(Object));
    expect(results.join("\n")).toContain("Còn thiếu: email");
    expect(results.join("\n")).toContain("không nói chờ");
  });
});

describe("detectProducts", () => {
  it("giữ productCode để nội dung chuyển khoản không rơi về tên sản phẩm có dấu", async () => {
    const { detectProducts, removeAccents } = await import("@/lib/ai/enrichment-actions");

    const result = detectProducts(
      removeAccents("Chốt 1 vé Bà Nà người lớn"),
      "Chốt 1 vé Bà Nà người lớn",
      [
        {
          id: "product_1",
          productCode: "SW-BANA-ADULT",
          name: "Vé Cáp Treo Bà Nà Hills - Người Lớn",
          price: 950000,
          status: "ACTIVE",
          category: "Vé Sun World",
          description: "",
          imageUrl: null,
          images: null,
          type: "DIGITAL",
          metadata: null,
          commercePolicyJson: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        } as any,
      ],
    );

    expect(result.items[0]).toMatchObject({
      productId: "product_1",
      productCode: "SW-BANA-ADULT",
    });
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
