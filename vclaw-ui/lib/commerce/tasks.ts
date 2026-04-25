"use server";

import { prisma } from "@/lib/db";
import { revalidateAdminPaths } from "@/lib/admin/revalidate";
import type { Task } from "@prisma/client";

export async function getTasks(): Promise<Task[]> {
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

export async function ignoreTask(id: string) {
  const task = await prisma.task.update({
    where: { id },
    data: { status: "IGNORED" },
  });
  revalidateAdminPaths();
  return task;
}
