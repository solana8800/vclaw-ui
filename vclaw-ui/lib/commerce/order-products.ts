type ProductLike = {
  id: string;
  [key: string]: unknown;
};

type OrderItemLike = {
  productId?: string | null;
  product?: ProductLike | null;
  [key: string]: unknown;
};

type OrderLike = {
  items?: OrderItemLike[] | null;
  [key: string]: unknown;
};

export function collectOrderItemProductIds(orders: OrderLike[]) {
  return Array.from(
    new Set(
      orders
        .flatMap((order) => order.items ?? [])
        .map((item) => item.productId)
        .filter((productId): productId is string => Boolean(productId)),
    ),
  );
}

export function attachProductsToOrders<TOrder extends OrderLike, TProduct extends ProductLike>(
  orders: TOrder[],
  products: TProduct[],
) {
  const productById = new Map(products.map((product) => [product.id, product]));

  return orders.map((order) => ({
    ...order,
    items: (order.items ?? []).map((item) => ({
      ...item,
      product: item.productId ? productById.get(item.productId) ?? null : null,
    })),
  }));
}
