import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/** Gắn (hoặc thay) đúng một Payment cho đơn — idempotent khi chạy lại seed. */
async function seedOrderWithPayment(args: {
  orderNumber: string;
  customerId: string;
  orderAmount: number;
  orderStatus: string;
  shippingNote?: string | null;
  shippingEstimate?: number | null;
  payment: {
    amount: number;
    status: string;
    method: string;
    evidenceImage?: string | null;
  };
}) {
  const order = await prisma.order.upsert({
    where: { orderNumber: args.orderNumber },
    update: {
      customerId: args.customerId,
      amount: args.orderAmount,
      status: args.orderStatus,
      shippingNote: args.shippingNote ?? undefined,
      shippingEstimate: args.shippingEstimate ?? undefined,
    },
    create: {
      orderNumber: args.orderNumber,
      customerId: args.customerId,
      amount: args.orderAmount,
      status: args.orderStatus,
      shippingNote: args.shippingNote ?? null,
      shippingEstimate: args.shippingEstimate ?? null,
    },
  });

  await prisma.payment.deleteMany({ where: { orderId: order.id } });
  await prisma.payment.create({
    data: {
      orderId: order.id,
      amount: args.payment.amount,
      status: args.payment.status,
      method: args.payment.method,
      evidenceImage: args.payment.evidenceImage ?? null,
    },
  });

  return order;
}

async function main() {
  console.log("Đang nạp dữ liệu mồi (khách, đơn, thanh toán, task)...");

  const customer1 = await prisma.customer.upsert({
    where: { id: "cust-1" },
    update: {
      name: "Chị Lan (Spa)",
      phone: "0901234567",
      channel: "Zalo",
      labels: JSON.stringify(["vip", "spa-owner"]),
    },
    create: {
      id: "cust-1",
      name: "Chị Lan (Spa)",
      phone: "0901234567",
      channel: "Zalo",
      labels: JSON.stringify(["vip", "spa-owner"]),
    },
  });

  const customer2 = await prisma.customer.upsert({
    where: { id: "cust-2" },
    update: {
      name: "Anh Long",
      phone: "0918888999",
      channel: "Messenger",
      labels: JSON.stringify(["new-lead"]),
    },
    create: {
      id: "cust-2",
      name: "Anh Long",
      phone: "0918888999",
      channel: "Messenger",
      labels: JSON.stringify(["new-lead"]),
    },
  });

  await seedOrderWithPayment({
    orderNumber: "DH1234",
    customerId: customer1.id,
    orderAmount: 4_500_000,
    orderStatus: "PAID",
    shippingNote: "Giao Q1 — gọi khách trước 30 phút",
    shippingEstimate: 35_000,
    payment: {
      amount: 4_500_000,
      status: "COMPLETED",
      method: "Transfer",
      evidenceImage: "https://placehold.co/400x300/png?text=Bill+DH1234",
    },
  });

  // Đảm bảo đơn này luôn PENDING để test
  await prisma.order.update({
    where: { orderNumber: "DH1234" },
    data: { fulfillmentStatus: "PENDING", fulfillmentType: "PHYSICAL" }
  });

  await seedOrderWithPayment({
    orderNumber: "SEED-ORD-PENDING",
    customerId: customer2.id,
    orderAmount: 1_200_000,
    orderStatus: "PENDING",
    shippingNote: "Chưa có địa chỉ đầy đủ — nhắn Zalo lấy địa chỉ",
    shippingEstimate: 40_000,
    payment: {
      amount: 1_200_000,
      status: "PENDING",
      method: "VietQR",
      evidenceImage: null,
    },
  });

  await seedOrderWithPayment({
    orderNumber: "TEST-EMAIL-001",
    customerId: customer1.id,
    orderAmount: 250_000,
    orderStatus: "PAID",
    shippingNote: "Vé Sunworld Hạ Long",
    payment: {
      amount: 250_000,
      status: "COMPLETED",
      method: "Transfer",
      evidenceImage: "https://placehold.co/400x300/png?text=Bill+TEST-EMAIL",
    },
  });

  await prisma.order.update({
    where: { orderNumber: "TEST-EMAIL-001" },
    data: { 
      fulfillmentStatus: "PENDING", 
      fulfillmentType: "DIGITAL_EMAIL",
      shippingAddress: "khachhang@example.com" 
    }
  });

  await seedOrderWithPayment({
    orderNumber: "TEST-SHIP-002",
    customerId: customer2.id,
    orderAmount: 850_000,
    orderStatus: "PAID",
    shippingNote: "COD",
    payment: {
      amount: 0,
      status: "PENDING",
      method: "COD",
      evidenceImage: null,
    },
  });

  await prisma.order.update({
    where: { orderNumber: "TEST-SHIP-002" },
    data: { 
      fulfillmentStatus: "PENDING", 
      fulfillmentType: "PHYSICAL",
      shippingAddress: "123 Đường ABC, Quận 1, TP.HCM" 
    }
  });

  await prisma.task.upsert({
    where: { id: "seed-inbox-payment" },
    update: {
      type: "PAYMENT_REVIEW",
      title: "Duyệt chuyển khoản NH",
      subtitle: "Mã ĐH: #DH1234",
      amount: "4.500.000 đ",
      isUrgent: true,
      status: "NEW",
      timeAgo: "2 phút trước",
    },
    create: {
      id: "seed-inbox-payment",
      type: "PAYMENT_REVIEW",
      title: "Duyệt chuyển khoản NH",
      subtitle: "Mã ĐH: #DH1234",
      amount: "4.500.000 đ",
      isUrgent: true,
      status: "NEW",
      timeAgo: "2 phút trước",
    },
  });

  await prisma.task.upsert({
    where: { id: "seed-inbox-booking" },
    update: {
      type: "BOOKING_CONFIRM",
      title: "Xác nhận Đặt lịch",
      subtitle: "Chị Lan, Spa (Gội đầu dưỡng sinh)",
      isUrgent: false,
      status: "NEW",
      timeAgo: "1 giờ trước",
    },
    create: {
      id: "seed-inbox-booking",
      type: "BOOKING_CONFIRM",
      title: "Xác nhận Đặt lịch",
      subtitle: "Chị Lan, Spa (Gội đầu dưỡng sinh)",
      isUrgent: false,
      status: "NEW",
      timeAgo: "1 giờ trước",
    },
  });

  await prisma.task.upsert({
    where: { id: "seed-inbox-shipping" },
    update: {
      type: "SHIPPING_UPDATE",
      title: "Giao hàng ĐH #SEED-ORD-PENDING",
      subtitle: "A. Long (đang chờ địa chỉ đầy đủ)",
      isUrgent: false,
      status: "NEW",
      timeAgo: "Hôm nay",
    },
    create: {
      id: "seed-inbox-shipping",
      type: "SHIPPING_UPDATE",
      title: "Giao hàng ĐH #SEED-ORD-PENDING",
      subtitle: "A. Long (đang chờ địa chỉ đầy đủ)",
      isUrgent: false,
      status: "NEW",
      timeAgo: "Hôm nay",
    },
  });

  console.log("Xong. Chạy lại an toàn: prisma db seed");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
