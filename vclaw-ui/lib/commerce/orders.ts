"use server";

import { prisma } from "@/lib/db";
import { revalidateAdminPaths } from "@/lib/admin/revalidate";

export type OrderWithCustomer = any;

export async function getOrders(): Promise<OrderWithCustomer[]> {
  return await prisma.order.findMany({
    include: {
      customer: true,
      items: {
        include: {
          product: true,
        },
      },
    },
    orderBy: {
      updatedAt: "desc",
    },
  }) as any;
}

export async function updateOrderStatus(id: string, status: string) {
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
  let shopCode = "VCLAW";
  if (settings?.shopName) {
    shopCode = settings.shopName
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
  return `${shopCode}${dateStr}${sequence}`;
}

export async function createOrder(data: {
  customerId: string;
  amount: number;
  status?: string;
  fulfillmentType?: string;
  shippingAddress?: string;
  items?: Array<{ productId: string; quantity: number; price: number }>;
}) {
  const order = await prisma.order.create({
    data: {
      orderNumber: await newOrderNumber(),
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
