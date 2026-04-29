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
