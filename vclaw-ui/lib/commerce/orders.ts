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

function newOrderNumber() {
  return `ORD-${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
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
      orderNumber: newOrderNumber(),
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
