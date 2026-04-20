"use server";

import { prisma } from "@/lib/prisma";
import { revalidateAdminPaths } from "@/lib/revalidate-admin";

export async function getAutomationJobs() {
  return prisma.automationJob.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
  });
}

export async function enqueueAutomationJob(title: string, channel?: string) {
  await prisma.automationJob.create({
    data: {
      title,
      channel: channel ?? null,
      status: "QUEUED",
    },
  });
  revalidateAdminPaths();
}

export async function updateAutomationJobStatus(
  id: string,
  status: "QUEUED" | "DONE" | "CANCELLED",
) {
  await prisma.automationJob.update({ where: { id }, data: { status } });
  revalidateAdminPaths();
}
