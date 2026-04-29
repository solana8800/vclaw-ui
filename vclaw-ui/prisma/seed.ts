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
  console.log("Đang nạp dữ liệu mồi (sản phẩm, khách, đơn, thanh toán, task)...");

  // --- Seed Products ---
  const products = [
    {
      name: "Áo sơ mi nam Oxford Premium",
      productCode: "SHIRT-OXFORD-001",
      price: 450000,
      category: "FASHION_MEN",
      description: "Chất liệu vải Oxford cao cấp, thoáng mát, phong cách lịch lãm.",
      imageUrl: "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=800&q=80",
      status: "ACTIVE",
    },
    {
      name: "iPhone 16 Pro Max 256GB",
      productCode: "IPHONE-16-PM-256",
      price: 34990000,
      category: "PHONES",
      description: "Siêu phẩm Apple 2024 với chip A18 Pro mạnh mẽ.",
      imageUrl: "https://images.unsplash.com/photo-1616348436168-de43ad0db179?w=800&q=80",
      status: "ACTIVE",
    },
    {
      name: "Kem dưỡng ẩm Neutrogena Hydro Boost",
      productCode: "SKIN-NEUTRO-HB",
      price: 350000,
      category: "BEAUTY",
      description: "Dưỡng ẩm sâu, thẩm thấu nhanh, phù hợp cho mọi loại da.",
      imageUrl: "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=800&q=80",
      status: "ACTIVE",
    },
    {
      name: "Cà phê hạt Arabica Cầu Đất (500g)",
      productCode: "COFFEE-ARABICA-500",
      price: 220000,
      category: "FOOD",
      description: "Hương thơm dịu nhẹ, vị chua thanh, đặc sản Đà Lạt.",
      imageUrl: "https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=800&q=80",
      status: "ACTIVE",
    },
    {
      name: "Khóa học React & Next.js Pro (Fullstack)",
      productCode: "COURSE-NEXTJS-001",
      price: 2500000,
      category: "DIGITAL_COURSE",
      description: "Học lập trình Next.js từ cơ bản đến nâng cao, xây dựng dự án thực tế.",
      imageUrl: "https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=800&q=80",
      status: "ACTIVE",
    },
    {
      name: "Kaspersky Internet Security - 1 PC / 1 Year",
      productCode: "SOFT-KASP-001",
      price: 180000,
      category: "DIGITAL_SOFTWARE",
      description: "Phần mềm diệt virus bản quyền, bảo vệ máy tính toàn diện.",
      imageUrl: "https://images.unsplash.com/photo-1563986768609-322da13575f3?w=800&q=80",
      status: "ACTIVE",
    },
    // --- Sun World & VinWonders ---
    {
      name: "Vé Cáp Treo Bà Nà Hills - Người Lớn",
      productCode: "SW-BANA-ADULT",
      price: 950000,
      category: "DIGITAL_TICKET",
      description: "Vé vào cổng & cáp treo khứ hồi Bà Nà Hills dành cho người lớn (trên 1.4m), bao gồm Fantasy Park và Cầu Vàng.",
      imageUrl: "https://images.unsplash.com/photo-1559592442-741eaf739780?w=1200&q=80",
      status: "ACTIVE",
    },
    {
      name: "Vé VinWonders Phú Quốc - Người Lớn",
      productCode: "VW-PQ-ADULT",
      price: 1050000,
      category: "DIGITAL_TICKET",
      description: "Công viên chủ đề lớn nhất Việt Nam. Dành cho người lớn (cao trên 1.4m).",
      imageUrl: "https://images.unsplash.com/photo-1534430480872-3498386e7a56?w=1200&q=80",
      status: "ACTIVE",
    },
    {
      name: "Combo VinWonders & Safari Phú Quốc - Người Lớn",
      productCode: "VW-PQ-COMBO-ADULT",
      price: 1450000,
      category: "DIGITAL_TICKET",
      description: "Vé vào cổng 2 khu VinWonders và Vinpearl Safari Phú Quốc trong 1 ngày cho người lớn.",
      imageUrl: "https://images.unsplash.com/photo-1517513006860-26ed464b5ae2?w=1200&q=80",
      status: "ACTIVE",
    },
    {
      name: "Vé Cáp Treo Fansipan Legend - Người Lớn",
      productCode: "SW-FAN-ADULT",
      price: 850000,
      category: "DIGITAL_TICKET",
      description: "Vé cáp treo khứ hồi chinh phục Nóc nhà Đông Dương dành cho người lớn.",
      imageUrl: "https://images.unsplash.com/photo-1596131397999-bb015822904d?w=1200&q=80",
      status: "ACTIVE",
    },
  ];

  for (const p of products) {
    await prisma.product.upsert({
      where: { productCode: p.productCode },
      update: p,
      create: p,
    });
  }

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

  // --- Seed Recent Orders for Revenue Chart (72h) ---
  console.log("Đang tạo dữ liệu đơn hàng gần đây cho biểu đồ doanh thu (72h)...");
  const now = new Date();
  for (let i = 0; i < 30; i++) {
    // Phân bổ đều hơn trong 72h
    const minutesAgo = Math.floor(Math.random() * (72 * 60));
    const orderDate = new Date(now.getTime() - minutesAgo * 60 * 1000);
    
    // Giá trị đơn hàng đa dạng
    const basePrice = [150000, 250000, 450000, 850000, 1200000, 2200000];
    const amount = basePrice[Math.floor(Math.random() * basePrice.length)];
    
    // Trạng thái ngẫu nhiên để biểu đồ phân bổ đơn hàng có dữ liệu
    const statuses = ["DONE", "PAID", "PROCESSING", "PENDING", "CANCELLED"];
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    const isPaid = ["DONE", "PAID", "PROCESSING"].includes(status);

    await prisma.order.create({
      data: {
        orderNumber: `ORD-SEED-${i}-${Math.floor(Math.random() * 1000)}`,
        customerId: Math.random() > 0.5 ? customer1.id : customer2.id,
        amount: amount,
        status: status as any,
        createdAt: orderDate,
        updatedAt: orderDate,
        payments: isPaid ? {
          create: {
            amount: amount,
            status: "COMPLETED",
            method: i % 2 === 0 ? "VietQR" : "Chuyển khoản",
            createdAt: orderDate,
          }
        } : undefined
      }
    });
  }

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
