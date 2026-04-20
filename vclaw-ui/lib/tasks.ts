"use server";

import { prisma } from "@/lib/prisma";

export async function getTasks() {
  return await prisma.task.findMany({
    where: {
      status: "NEW",
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}

export async function createTask(data: {
  type: string;
  title: string;
  subtitle?: string;
  amount?: string;
  isUrgent?: boolean;
}) {
  return await prisma.task.create({
    data: {
      ...data,
      status: "NEW",
    },
  });
}

export async function completeTask(id: string) {
  return await prisma.task.update({
    where: { id },
    data: { status: "DONE" },
  });
}
