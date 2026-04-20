"use server";

import { prisma } from "@/lib/prisma";
import { revalidateAdminPaths } from "@/lib/revalidate-admin";

export async function getOrders() {
  return await prisma.order.findMany({
    include: {
      customer: true,
    },
    orderBy: {
      updatedAt: "desc",
    },
  });
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
  status: string;
}) {
  const order = await prisma.order.create({
    data: {
      orderNumber: newOrderNumber(),
      customerId: data.customerId,
      amount: data.amount,
      status: data.status,
    },
  });
  revalidateAdminPaths();
  return order;
}

export async function updateOrderShipping(
  id: string,
  data: { shippingNote?: string | null; shippingEstimate?: number | null },
) {
  await prisma.order.update({
    where: { id },
    data: {
      ...(data.shippingNote !== undefined ? { shippingNote: data.shippingNote } : {}),
      ...(data.shippingEstimate !== undefined
        ? { shippingEstimate: data.shippingEstimate }
        : {}),
    },
  });
  revalidateAdminPaths();
}
