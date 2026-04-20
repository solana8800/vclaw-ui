import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Đang nạp dữ liệu mồi...");

  // Tạo khách hàng mẫu
  const customer1 = await prisma.customer.upsert({
    where: { id: "cust-1" },
    update: {},
    create: {
      id: "cust-1",
      name: "Chị Lan (Spa)",
      channel: "Zalo",
      labels: JSON.stringify(["vip", "spa-owner"]),
    },
  });

  const customer2 = await prisma.customer.upsert({
    where: { id: "cust-2" },
    update: {},
    create: {
      id: "cust-2",
      name: "Anh Long",
      channel: "Messenger",
      labels: JSON.stringify(["new-lead"]),
    },
  });

  // Tạo Đơn hàng mẫu
  await prisma.order.upsert({
    where: { orderNumber: "DH1234" },
    update: {},
    create: {
      orderNumber: "DH1234",
      customerId: customer1.id,
      amount: 4500000,
      status: "PAID",
    },
  });

  // Tạo Tasks mẫu cho Inbox
  await prisma.task.createMany({
    data: [
      {
        type: "payment_review",
        title: "Duyệt chuyển khoản NH",
        subtitle: "Mã ĐH: #DH1234",
        amount: "4.500.000 đ",
        isUrgent: true,
        status: "NEW",
        timeAgo: "2 phút trước",
      },
      {
        type: "booking_confirm",
        title: "Xác nhận Đặt lịch",
        subtitle: "Chị Lan, Spa (Gội đầu dưỡng sinh)",
        isUrgent: false,
        status: "NEW",
        timeAgo: "1 giờ trước",
      },
      {
        type: "shipping_update",
        title: "Giao hàng ĐH #DH1230",
        subtitle: "A. Long (Đã nhận thông tin địa chỉ)",
        isUrgent: false,
        status: "NEW",
        timeAgo: "Hôm nay",
      },
    ],
  });

  console.log("Đã nạp dữ liệu thành công!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
