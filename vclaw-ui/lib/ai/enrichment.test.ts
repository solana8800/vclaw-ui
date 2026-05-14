// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const buildRoleContextMock = vi.fn();
const buildShopContextMock = vi.fn();
const buildBusinessMetricsMock = vi.fn();
const buildCustomerContextMock = vi.fn();
const buildProductCatalogMock = vi.fn();
const fetchRecentInMessagesMock = vi.fn();
const executeOrderActionMock = vi.fn();

vi.mock("@/lib/ai/enrichment-context", () => ({
  buildRoleContext: buildRoleContextMock,
  buildShopContext: buildShopContextMock,
  buildBusinessMetrics: buildBusinessMetricsMock,
  buildCustomerContext: buildCustomerContextMock,
  buildProductCatalog: buildProductCatalogMock,
  fetchRecentInMessages: fetchRecentInMessagesMock,
}));

vi.mock("@/lib/ai/enrichment-actions", async () => {
  const actual = await vi.importActual<typeof import("@/lib/ai/enrichment-actions")>(
    "@/lib/ai/enrichment-actions",
  );
  return {
    ...actual,
    executeOrderAction: executeOrderActionMock,
  };
});

describe("getEnrichedContext", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    buildRoleContextMock.mockReturnValue("[role]");
    buildShopContextMock.mockResolvedValue({
      block: "[shop]",
      settings: {
        shopName: "VClaw Shop",
        website: "",
        approvalConfigJson: JSON.stringify({ automationEnabled: true, paymentAutoApprove: true }),
      },
    });
    buildBusinessMetricsMock.mockResolvedValue("");
    buildCustomerContextMock.mockResolvedValue({ block: "", customer: null });
    buildProductCatalogMock.mockResolvedValue({
      block: "[catalog]",
      products: [
        {
          id: "product_1",
          productCode: "AO-VCLAW",
          name: "Áo VClaw",
          price: 150000,
          status: "ACTIVE",
          category: "Thời trang",
          description: "",
          imageUrl: null,
          images: null,
          type: "GOODS",
          metadata: null,
          commercePolicyJson: JSON.stringify({
            productKind: "PHYSICAL",
            paymentMode: "PREPAID",
            fulfillmentMode: "GHN_SHIPPING",
            requiredCustomerFields: ["name", "phone", "address"],
          }),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
    });
    fetchRecentInMessagesMock.mockResolvedValue("Em lấy 1 Áo VClaw");
    executeOrderActionMock.mockResolvedValue(["[HỆ_THỐNG_TỰ_ĐỘNG] Đã tạo đơn hàng #VCLA051400001 giá trị 150.000đ."]);
  });

  it("dùng lịch sử hội thoại để tạo đơn khi khách gửi SĐT và địa chỉ ở tin nhắn sau", async () => {
    const { getEnrichedContext } = await import("@/lib/ai/enrichment");

    await getEnrichedContext(
      "/zalouser",
      "SĐT 0900000000, địa chỉ 12 Nguyễn Huệ, Quận 1",
      "zalo:user-1",
      "zalo",
    );

    expect(fetchRecentInMessagesMock).toHaveBeenCalledWith("zalo:user-1");
    expect(executeOrderActionMock).toHaveBeenCalledWith(expect.objectContaining({
      phone: "0900000000",
      items: [expect.objectContaining({ productId: "product_1", productCode: "AO-VCLAW", qty: 1 })],
      totalAmount: 150000,
      source: "zalo",
      userMessage: expect.stringContaining("Áo VClaw"),
    }));
  });
});
