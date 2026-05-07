import { describe, expect, it } from "vitest";
import { attachProductsToOrders, collectOrderItemProductIds } from "@/lib/commerce/order-products";

describe("order product hydration", () => {
  it("collects unique product ids from order items", () => {
    expect(collectOrderItemProductIds([
      { id: "order_1", items: [{ productId: "prod_1" }, { productId: "prod_1" }] },
      { id: "order_2", items: [{ productId: "prod_2" }, { productId: null }] },
    ])).toEqual(["prod_1", "prod_2"]);
  });

  it("keeps orders renderable when an item points to a missing product", () => {
    const [order] = attachProductsToOrders(
      [{
        id: "order_1",
        items: [
          { id: "item_1", productId: "prod_ok", quantity: 1 },
          { id: "item_2", productId: "prod_missing", quantity: 2 },
        ],
      }],
      [{ id: "prod_ok", name: "Sản phẩm còn tồn tại" }],
    );

    expect(order.items[0].product).toMatchObject({ id: "prod_ok" });
    expect(order.items[1].product).toBeNull();
  });
});
