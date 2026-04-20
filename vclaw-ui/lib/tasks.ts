"use server";

import { prisma } from "@/lib/prisma";
import { revalidateAdminPaths } from "@/lib/revalidate-admin";

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
  const task = await prisma.task.create({
    data: {
      ...data,
      status: "NEW",
    },
  });
  revalidateAdminPaths();
  return task;
}

export async function completeTask(id: string) {
  const task = await prisma.task.update({
    where: { id },
    data: { status: "DONE" },
  });
  revalidateAdminPaths();
  return task;
}
