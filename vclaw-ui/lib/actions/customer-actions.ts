"use server";

import { prisma } from "@/lib/prisma";
import { revalidateAdminPaths } from "@/lib/revalidate-admin";

export type CustomerInput = {
  id?: string;
  name: string;
  phone?: string;
  channel: string;
  labels?: string;
};

export async function getCustomers() {
  return prisma.customer.findMany({
    orderBy: { updatedAt: "desc" },
  });
}

export async function saveCustomer(data: CustomerInput) {
  try {
    if (data.id) {
      const customer = await prisma.customer.update({
        where: { id: data.id },
        data: {
          name: data.name,
          phone: data.phone || null,
          channel: data.channel,
          labels: data.labels || null,
        },
      });
      revalidateAdminPaths();
      return { success: true, customer };
    }
    const customer = await prisma.customer.create({
      data: {
        name: data.name,
        phone: data.phone || null,
        channel: data.channel,
        labels: data.labels || null,
      },
    });
    revalidateAdminPaths();
    return { success: true, customer };
  } catch (error) {
    console.error("saveCustomer", error);
    return { success: false, error: "Không thể lưu khách hàng." };
  }
}

export async function deleteCustomer(id: string) {
  try {
    await prisma.customer.delete({ where: { id } });
    revalidateAdminPaths();
    return { success: true };
  } catch (error) {
    console.error("deleteCustomer", error);
    return { success: false, error: "Không thể xóa (có thể còn đơn/ lịch liên kết)." };
  }
}
