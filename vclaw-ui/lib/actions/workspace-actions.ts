"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function getWorkspaces() {
  // Nếu chưa có workspace nào, tạo một cái mặc định (RETAIL)
  const count = await prisma.workspace.count();
  if (count === 0) {
    await prisma.workspace.create({
      data: {
        name: "Cửa hàng mặc định",
        industry: "RETAIL",
        description: "Workspace bán hàng mặc định",
      },
    });
  }
  
  return await prisma.workspace.findMany({
    orderBy: { createdAt: "asc" },
  });
}

export async function createWorkspace(data: { name: string; industry: string; description?: string }) {
  const ws = await prisma.workspace.create({
    data,
  });
  revalidatePath("/", "layout");
  return ws;
}
