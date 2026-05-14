"use server";

import { prisma } from "@/lib/db";
import { revalidateAdminPaths } from "@/lib/admin/revalidate";
import { attachProductsToOrders, collectOrderItemProductIds } from "@/lib/commerce/order-products";
import type { Customer, Prisma, Product } from "@prisma/client";

type OrderWithBaseRelations = Prisma.OrderGetPayload<{
  include: {
    payments: true;
    items: true;
  };
}>;

type OrderItemWithOptionalProduct = OrderWithBaseRelations["items"][number] & {
  product: Product | null;
};

export type OrderWithCustomer = Omit<OrderWithBaseRelations, "items"> & {
  customer: Customer | null;
  items: OrderItemWithOptionalProduct[];
};

async function hydrateOrdersWithOptionalProducts(
  orders: OrderWithBaseRelations[],
): Promise<OrderWithCustomer[]> {
  const customerIds = Array.from(new Set(orders.map((order) => order.customerId)));
  const customers = customerIds.length
    ? await prisma.customer.findMany({ where: { id: { in: customerIds } } })
    : [];
  const customerById = new Map(customers.map((customer) => [customer.id, customer]));
  const missingCustomerIds = customerIds.filter((customerId) => !customerById.has(customerId));

  if (missingCustomerIds.length > 0) {
    console.warn(
      "[orders] Phát hiện Order trỏ tới Customer không tồn tại:",
      missingCustomerIds.join(", "),
    );
  }

  const productIds = collectOrderItemProductIds(orders);
  const products = productIds.length
    ? await prisma.product.findMany({ where: { id: { in: productIds } } })
    : [];
  const foundProductIds = new Set(products.map((product) => product.id));
  const missingProductIds = productIds.filter((productId) => !foundProductIds.has(productId));

  if (missingProductIds.length > 0) {
    console.warn(
      "[orders] Phát hiện OrderItem trỏ tới Product không tồn tại:",
      missingProductIds.join(", "),
    );
  }

  const ordersWithCustomers = orders.map((order) => ({
    ...order,
    customer: customerById.get(order.customerId) ?? null,
  }));

  return attachProductsToOrders(ordersWithCustomers, products) as OrderWithCustomer[];
}

export type OrdersResponse = {
  data: OrderWithCustomer[];
  total: number;
  totalPages: number;
};

export async function getOrders(page = 1, pageSize = 50): Promise<OrdersResponse> {
  const skip = (page - 1) * pageSize;

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      include: {
        payments: true,
        items: true,
      },
      orderBy: {
        updatedAt: "desc",
      },
      skip,
      take: pageSize,
    }),
    prisma.order.count(),
  ]);

  const data = await hydrateOrdersWithOptionalProducts(orders);
  return {
    data,
    total,
    totalPages: Math.ceil(total / pageSize),
  };
}

export async function getOrderWithOptionalProducts(id: string): Promise<OrderWithCustomer | null> {
  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      payments: true,
      items: true,
    },
  });

  if (!order) return null;
  const [hydratedOrder] = await hydrateOrdersWithOptionalProducts([order]);
  return hydratedOrder;
}

export async function updateOrderStatus(id: string, status: string) {
  const currentOrder = await prisma.order.findUnique({
    where: { id },
    select: { status: true }
  });

  if (!currentOrder) throw new Error("Không tìm thấy đơn hàng.");

  // 1. Chỉ cho phép hủy đơn nếu đang ở trạng thái PENDING
  if (status === "CANCELLED" && currentOrder.status !== "PENDING") {
    throw new Error("Chỉ đơn hàng đang 'Chờ thanh toán' mới có thể hủy.");
  }

  // 2. Không cho phép chuyển quay lại PENDING một khi đã rời khỏi đó
  if (status === "PENDING" && currentOrder.status !== "PENDING") {
    throw new Error("Không thể chuyển đơn hàng quay lại trạng thái 'Chờ thanh toán'.");
  }

  const order = await prisma.order.update({
    where: { id },
    data: { status },
  });
  revalidateAdminPaths();
  return order;
}

export async function newOrderNumber() {
  const now = new Date();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const dateStr = `${mm}${dd}`;

  // 1. Lấy Prefix từ tên shop
  const settings = await prisma.shopSettings.findFirst();
  let prefix = "VCLAW";
  if (settings?.shopName) {
    prefix = settings.shopName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Bỏ dấu tiếng Việt
    .replace(/[^\w]/g, "")          // Bỏ ký tự đặc biệt
    .toUpperCase()
    .substring(0, 4)
    .padEnd(4, "X");                // Đảm bảo đủ 4 ký tự
  }

  // 2. Lấy số thứ tự đơn trong ngày
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const countToday = await prisma.order.count({
    where: {
      createdAt: {
        gte: startOfDay,
      },
    },
  });

  const sequence = String(countToday + 1).padStart(5, "0");

  // Định dạng: SHOPCODEMMDD00001 (Ví dụ: VCLW043000001)
  return `${prefix}${dateStr}${sequence}`;
}

export async function createOrder(data: {
  customerId: string;
  amount: number;
  status?: string;
  fulfillmentType?: string;
  shippingAddress?: string;
  items?: Array<{ productId: string; quantity: number; price: number }>;
}) {
  const orderNumber = await newOrderNumber();
  const order = await prisma.order.create({
    data: {
      orderNumber,
      customerId: data.customerId,
      amount: data.amount,
      status: data.status ?? "PENDING",
      fulfillmentType: data.fulfillmentType ?? "PHYSICAL",
      shippingAddress: data.shippingAddress,
      items: data.items ? {
        create: data.items.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
          price: item.price,
        }))
      } : undefined,
    },
    include: {
      items: true
    }
  });
  revalidateAdminPaths();
  return order;
}

export async function updateOrderShipping(
  id: string,
  data: { 
    shippingNote?: string | null; 
    shippingEstimate?: number | null;
    shippingAddress?: string | null;
    trackingNumber?: string | null;
  },
) {
  await prisma.order.update({
    where: { id },
    data: {
      ...(data.shippingNote !== undefined ? { shippingNote: data.shippingNote } : {}),
      ...(data.shippingEstimate !== undefined
        ? { shippingEstimate: data.shippingEstimate }
        : {}),
      ...(data.shippingAddress !== undefined ? { shippingAddress: data.shippingAddress } : {}),
      ...(data.trackingNumber !== undefined ? { trackingNumber: data.trackingNumber } : {}),
    },
  });
  revalidateAdminPaths();
}

export async function updateOrderFulfillment(id: string, status: string) {
  await prisma.order.update({
    where: { id },
    data: { fulfillmentStatus: status },
  });
  revalidateAdminPaths();
}
