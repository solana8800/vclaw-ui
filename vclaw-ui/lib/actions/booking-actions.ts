"use server";

import { prisma } from "@/lib/prisma";
import { revalidateAdminPaths } from "@/lib/admin/revalidate";

function combineLocalDateTime(dateStr: string, timeStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  const [hh, mm] = timeStr.split(":").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1, hh ?? 0, mm ?? 0, 0, 0);
}

export async function getBookingsForDate(dateStr: string) {
  const start = new Date(`${dateStr}T00:00:00`);
  const end = new Date(`${dateStr}T23:59:59.999`);
  return prisma.booking.findMany({
    where: {
      startTime: { gte: start, lte: end },
    },
    include: { customer: true },
    orderBy: { startTime: "asc" },
  });
}

export async function createBooking(data: {
  customerId: string;
  serviceName: string;
  dateStr: string;
  timeStr: string;
  status?: string;
}) {
  const startTime = combineLocalDateTime(data.dateStr, data.timeStr);
  const booking = await prisma.booking.create({
    data: {
      customerId: data.customerId,
      serviceName: data.serviceName,
      startTime,
      status: data.status ?? "PENDING",
    },
  });
  revalidateAdminPaths();
  return booking;
}

export async function updateBookingStatus(id: string, status: string) {
  await prisma.booking.update({ where: { id }, data: { status } });
  revalidateAdminPaths();
}

export async function deleteBooking(id: string) {
  await prisma.booking.delete({ where: { id } });
  revalidateAdminPaths();
}
