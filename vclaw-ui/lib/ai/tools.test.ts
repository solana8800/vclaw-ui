import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  agentToolLog: { create: vi.fn() },
  product: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
  },
  customer: {
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  conversation: {
    findFirst: vi.fn(),
    updateMany: vi.fn(),
  },
  order: {
    create: vi.fn(),
  },
  shopSettings: {
    findFirst: vi.fn(),
  },
}));

vi.mock("@/lib/db", () => ({ prisma: prismaMock }));
vi.mock("@/lib/admin/revalidate", () => ({ revalidateAdminPaths: vi.fn() }));
vi.mock("@/lib/commerce/orders", () => ({
  getOrderWithOptionalProducts: vi.fn(),
  newOrderNumber: vi.fn(async () => "VCLA051300001"),
}));
vi.mock("@/lib/vietqr", () => ({
  generateVietQRUrl: vi.fn(() => "https://img.vietqr.io/image/tcb-123-print.png?amount=150000&addInfo=VCLA051300001+0900000000+CODTEST+x1"),
}));
vi.mock("@/lib/actions/payment-actions", () => ({
  verifyPaymentBill: vi.fn(),
}));
vi.mock("@/lib/logistics/ghn-order", () => ({
  createGhnOrder: vi.fn(),
}));
vi.mock("@/lib/logistics/shipping", () => ({
  getShippingEstimates: vi.fn(),
  normalizeAddress: vi.fn(),
}));
vi.mock("@/lib/automation/approval-config", () => ({
  getApprovalConfig: vi.fn(),
}));

describe("executeVclawAgentTool order.create", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.agentToolLog.create.mockResolvedValue({});
    prismaMock.customer.findFirst.mockResolvedValue(null);
    prismaMock.customer.findUnique.mockResolvedValue(null);
    prismaMock.conversation.findFirst.mockResolvedValue(null);
    prismaMock.conversation.updateMany.mockResolvedValue({ count: 0 });
    prismaMock.customer.create.mockResolvedValue({
      id: "customer_1",
      name: "Anh Nam",
      phone: "0900000000",
      email: null,
      shippingAddress: "Quận 1, TP.HCM",
      channel: "Zalo",
    });
    prismaMock.order.create.mockResolvedValue({
      id: "order_1",
      orderNumber: "VCLA051300001",
    });
    prismaMock.shopSettings.findFirst.mockResolvedValue({
      bankName: "TCB",
      accountNumber: "123",
      accountHolder: "VCLAW",
    });
  });

  it("chốt sản phẩm COD bằng đơn cần follow-up và QR chuyển khoản khi có địa chỉ", async () => {
    const { executeVclawAgentTool } = await import("@/lib/ai/tools");
    prismaMock.product.findUnique.mockResolvedValue({
      id: "product_cod",
      name: "Áo lưu niệm COD",
      price: 150000,
      type: "GOODS",
      productCode: "COD-TEST",
      metadata: null,
      commercePolicyJson: JSON.stringify({
        paymentMode: "COD",
        fulfillmentMode: "GHN_SHIPPING",
        shipping: { carrier: "GHN", allowCod: true },
      }),
    });

    const response = await executeVclawAgentTool("vclaw.order.create", {
      customerName: "Anh Nam",
      phone: "0900000000",
      amount: 150000,
      shippingAddress: "Quận 1, TP.HCM",
      items: JSON.stringify([{ productId: "product_cod", productCode: "COD-TEST", qty: 1 }]),
      channel: "Zalo",
    });

    expect(response.ok).toBe(true);
    expect(prismaMock.order.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        status: "FOLLOW_UP",
        fulfillmentStatus: "SHIPPING_REVIEW",
        payments: {
          create: {
            amount: 150000,
            status: "PENDING",
            method: "BANK_TRANSFER",
          },
        },
      }),
    }));
    expect(response.result).toMatchObject({
      orderNumber: "VCLA051300001",
      transferNote: "VCLA051300001",
      paymentMode: "COD",
      status: "FOLLOW_UP",
      fulfillmentStatus: "SHIPPING_REVIEW",
    });
    expect(String((response.result as { instruction?: string }).instruction)).toContain("Cần Follow-up");
  });

  it("vẫn tạo đơn PENDING để đối soát khi khách chốt nhưng còn thiếu địa chỉ giao hàng", async () => {
    const { executeVclawAgentTool } = await import("@/lib/ai/tools");
    prismaMock.product.findUnique.mockResolvedValue({
      id: "product_prepaid",
      name: "Áo thun Bà Nà Hills",
      price: 220000,
      type: "GOODS",
      productCode: "TS-BANA",
      metadata: null,
      commercePolicyJson: JSON.stringify({
        productKind: "PHYSICAL",
        paymentMode: "PREPAID",
        fulfillmentMode: "GHN_SHIPPING",
        requiredCustomerFields: ["name", "phone", "address"],
      }),
    });

    const response = await executeVclawAgentTool("vclaw.order.create", {
      customerName: "Anh Nam",
      phone: "0900000000",
      items: JSON.stringify([{ productId: "product_prepaid", productCode: "TS-BANA", qty: 1 }]),
      channel: "Zalo",
    });

    expect(response.ok).toBe(true);
    expect(prismaMock.order.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        amount: 220000,
        status: "PENDING",
        fulfillmentStatus: "PENDING_CUSTOMER_INFO",
        payments: {
          create: {
            amount: 220000,
            status: "PENDING",
            method: "BANK_TRANSFER",
          },
        },
      }),
    }));
    expect(response.result).toMatchObject({
      orderNumber: "VCLA051300001",
      amount: 220000,
      status: "PENDING",
      fulfillmentStatus: "PENDING_CUSTOMER_INFO",
      missingFields: ["address"],
      canCreateOrder: false,
    });
    expect(String((response.result as { instruction?: string }).instruction)).toContain("Đơn pending đã được tạo");
  });

  it("liên kết khách với externalId và lưu phone/email để chăm sóc về sau", async () => {
    const { executeVclawAgentTool } = await import("@/lib/ai/tools");
    prismaMock.product.findUnique.mockResolvedValue({
      id: "product_digital",
      name: "Vé vào cổng Núi Bà Đen",
      price: 10000,
      type: "DIGITAL",
      productCode: "NBD-GATE",
      metadata: null,
      commercePolicyJson: JSON.stringify({
        productKind: "DIGITAL",
        paymentMode: "PREPAID",
        fulfillmentMode: "EMAIL_DELIVERY",
        requiredCustomerFields: ["name", "phone", "email"],
      }),
    });

    const response = await executeVclawAgentTool("vclaw.order.create", {
      customerName: "Trần Danh Tuấn",
      phone: "0977555115",
      email: "solana8800@gmail.com",
      externalId: "user:6537277786325078937",
      items: JSON.stringify([{ productId: "product_digital", productCode: "NBD-GATE", qty: 1 }]),
      channel: "Zalo",
    });

    expect(response.ok).toBe(true);
    expect(prismaMock.customer.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        name: "Trần Danh Tuấn",
        phone: "0977555115",
        email: "solana8800@gmail.com",
      }),
    }));
    expect(prismaMock.conversation.updateMany).toHaveBeenCalledWith({
      where: { externalThreadId: "user:6537277786325078937", customerId: null },
      data: { customerId: "customer_1" },
    });
    expect(response.result).toMatchObject({
      transferNote: "VCLA051300001",
      missingFields: [],
      canCreateOrder: true,
    });
  });
});

describe("VCLAW_AGENT_TOOLS_METADATA", () => {
  it("ưu tiên tạo đơn theo items catalog thay vì bắt model tự bịa amount", async () => {
    const { VCLAW_AGENT_TOOLS_METADATA } = await import("@/lib/ai/tools");

    const orderCreate = VCLAW_AGENT_TOOLS_METADATA["vclaw.order.create"];

    expect(orderCreate.parameters.required).toEqual(["items"]);
    expect(orderCreate.description).toContain("Tạo order pending thật trong database");
    expect(orderCreate.description).toContain("server tự tính giá/policy");
    expect(orderCreate.parameters.properties.items.description).toContain("catalog");
    expect(orderCreate.parameters.properties.amount.description).toContain("legacy");
  });
});
