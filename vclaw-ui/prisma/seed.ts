import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Đang làm sạch cơ sở dữ liệu...");
  await prisma.orderItem.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.order.deleteMany();
  await prisma.task.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.product.deleteMany();

  console.log("Đang nạp dữ liệu mồi (Danh sách sản phẩm vé du lịch)...");

  // --- Seed Products (5 Sun World, 5 VinWonders) ---
  const products = [
    // --- Sun World ---
    {
      name: "Vé Cáp Treo Bà Nà Hills - Người Lớn",
      productCode: "SW-BANA-ADULT",
      price: 950000,
      category: "SERVICE",
      description: "Vé vào cổng & cáp treo khứ hồi Bà Nà Hills dành cho người lớn (trên 1.4m), bao gồm Fantasy Park và Cầu Vàng.",
      imageUrl: "https://images.unsplash.com/photo-1559592442-741eaf739780?w=1200&q=80",
      metadata: JSON.stringify({ park: "Sun World Ba Na Hills", ticketType: "Người Lớn", height: ">1.4m", validDays: "Mọi ngày" }),
      status: "ACTIVE",
    },
    {
      name: "Vé Cáp Treo Bà Nà Hills - Trẻ Em",
      productCode: "SW-BANA-CHILD",
      price: 750000,
      category: "SERVICE",
      description: "Vé vào cổng & cáp treo khứ hồi Bà Nà Hills dành cho trẻ em (1.0m - 1.4m).",
      imageUrl: "https://images.unsplash.com/photo-1559592442-741eaf739780?w=1200&q=80",
      metadata: JSON.stringify({ park: "Sun World Ba Na Hills", ticketType: "Trẻ Em", height: "1.0m - 1.4m", validDays: "Mọi ngày" }),
      status: "ACTIVE",
    },
    {
      name: "Combo Cáp Treo + Buffet Bà Nà Hills - Người Lớn",
      productCode: "SW-BANA-COMBO-ADULT",
      price: 1250000,
      category: "SERVICE",
      description: "Combo cáp treo và vé buffet trưa dành cho người lớn.",
      imageUrl: "https://banahills.sunworld.vn/wp-content/uploads/2020/07/nha-hang-arapang-1.jpg",
      metadata: JSON.stringify({ park: "Sun World Ba Na Hills", ticketType: "Người Lớn", height: ">1.4m", includes: "Buffet trưa" }),
      status: "ACTIVE",
    },
    {
      name: "Vé Cáp Treo Fansipan Legend - Người Lớn",
      productCode: "SW-FAN-ADULT",
      price: 850000,
      category: "SERVICE",
      description: "Vé cáp treo khứ hồi chinh phục Nóc nhà Đông Dương dành cho người lớn.",
      imageUrl: "https://images.unsplash.com/photo-1596131397999-bb015822904d?w=1200&q=80",
      metadata: JSON.stringify({ park: "Sun World Fansipan Legend", ticketType: "Người Lớn" }),
      status: "ACTIVE",
    },
    {
      name: "Vé Cáp Treo Hòn Thơm (Sun World Phu Quoc) - Người Lớn",
      productCode: "SW-HON-ADULT",
      price: 650000,
      category: "SERVICE",
      description: "Trải nghiệm cáp treo vượt biển dài nhất thế giới và công viên nước Aquatopia dành cho người lớn.",
      imageUrl: "https://images.unsplash.com/photo-1616484173745-07f25fd0547f?w=1200&q=80",
      metadata: JSON.stringify({ park: "Sun World Phu Quoc", ticketType: "Người Lớn" }),
      status: "ACTIVE",
    },

    // --- VinWonders ---
    {
      name: "Vé VinWonders Phú Quốc - Người Lớn",
      productCode: "VW-PQ-ADULT",
      price: 1050000,
      category: "SERVICE",
      description: "Công viên chủ đề lớn nhất Việt Nam. Dành cho người lớn (cao trên 1.4m).",
      imageUrl: "https://images.unsplash.com/photo-1534430480872-3498386e7a56?w=1200&q=80",
      metadata: JSON.stringify({ park: "VinWonders Phú Quốc", ticketType: "Người Lớn", height: ">=1.4m", validDays: "Mọi ngày" }),
      status: "ACTIVE",
    },
    {
      name: "Vé VinWonders Nha Trang (Gồm cáp treo) - Người Lớn",
      productCode: "VW-NT-ADULT",
      price: 1050000,
      category: "SERVICE",
      description: "Trọn gói vui chơi & cáp treo khứ hồi cho người lớn.",
      imageUrl: "https://images.unsplash.com/photo-1534346505051-51203b573531?w=1200&q=80",
      metadata: JSON.stringify({ park: "VinWonders Nha Trang", ticketType: "Người Lớn", height: ">=1.4m", includes: "Cáp treo khứ hồi" }),
      status: "ACTIVE",
    },
    {
      name: "Combo VinWonders & Safari Phú Quốc - Người Lớn",
      productCode: "VW-PQ-COMBO-ADULT",
      price: 1450000,
      category: "SERVICE",
      description: "Vé vào cổng 2 khu VinWonders và Vinpearl Safari Phú Quốc trong 1 ngày cho người lớn.",
      imageUrl: "https://images.unsplash.com/photo-1517513006860-26ed464b5ae2?w=1200&q=80",
      metadata: JSON.stringify({ park: "VinWonders Phú Quốc", ticketType: "Người Lớn", height: ">=1.4m", includes: "Safari" }),
      status: "ACTIVE",
    },
    {
      name: "Vé VinWonders Nam Hội An - Người Lớn",
      productCode: "VW-NHA-ADULT",
      price: 600000,
      category: "SERVICE",
      description: "Trải nghiệm văn hóa di sản và các trò chơi hiện đại. Dành cho người lớn.",
      imageUrl: "https://images.unsplash.com/photo-1583417319070-4a69db38a482?w=1200&q=80",
      metadata: JSON.stringify({ park: "VinWonders Nam Hội An", ticketType: "Người Lớn" }),
      status: "ACTIVE",
    },
    {
      name: "Vé VinWonders Nha Trang Sau 16:00 - Người Lớn",
      productCode: "VW-NT-AFTER4-ADULT",
      price: 700000,
      category: "SERVICE",
      description: "Vé vào cổng sau 16:00, xem show Tata và vui chơi buổi tối.",
      imageUrl: "https://images.unsplash.com/photo-1534346505051-51203b573531?w=1200&q=80",
      metadata: JSON.stringify({ park: "VinWonders Nha Trang", ticketType: "Người Lớn", time: "Sau 16:00" }),
      status: "ACTIVE",
    },

    // --- Khác ---
    {
      name: "Vé vào cổng Khu du lịch Núi Bà Đen (Tây Ninh)",
      productCode: "BADEN-MOUNTAIN-ADULT",
      price: 10000,
      category: "SERVICE",
      description: "Vé vào cổng Khu du lịch Núi Bà Đen. Giá vé có thể thay đổi tùy thuộc vào quy định từng thời điểm.",
      imageUrl: "https://images.unsplash.com/photo-1621252179027-94459d278660?w=1200&q=80",
      metadata: JSON.stringify({ park: "Núi Bà Đen", ticketType: "Người Lớn" }),
      status: "ACTIVE",
    },
  ];

  for (const p of products) {
    await prisma.product.upsert({
      where: { productCode: p.productCode },
      update: {
        ...p,
        metadata: p.metadata ?? null,
      },
      create: {
        ...p,
        metadata: p.metadata ?? null,
      },
    });
  }

  console.log("Xong. Đã làm sạch và nạp danh sách sản phẩm vé.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
