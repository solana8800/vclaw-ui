"use server";

import { prisma } from "@/lib/prisma";

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
  return await prisma.order.update({
    where: { id },
    data: { status },
  });
}

export async function createOrder(data: {
  orderNumber: string;
  customerId: string;
  amount: number;
  status: string;
}) {
  return await prisma.order.create({
    data,
  });
}
