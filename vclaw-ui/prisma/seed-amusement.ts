import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Đang nạp dữ liệu vé vui chơi giải trí...");

  const products = [
    // --- Sun World Ba Na Hills ---
    {
      name: "Vé Cáp Treo Bà Nà Hills - Người Lớn",
      productCode: "SW-BANA-ADULT",
      price: 950000,
      category: "Vé du lịch",
      description: "Vé vào cổng & cáp treo khứ hồi Bà Nà Hills dành cho người lớn (trên 1.4m), bao gồm Fantasy Park và Cầu Vàng.",
      imageUrl: "https://images.unsplash.com/photo-1559592442-741eaf739780?w=1200&q=80",
      metadata: JSON.stringify({ park: "Sun World Ba Na Hills", ticketType: "Người Lớn", height: ">1.4m", validDays: "Mọi ngày" }),
      status: "ACTIVE",
    },
    {
      name: "Vé Cáp Treo Bà Nà Hills - Trẻ Em",
      productCode: "SW-BANA-CHILD",
      price: 750000,
      category: "Vé du lịch",
      description: "Vé vào cổng & cáp treo khứ hồi Bà Nà Hills dành cho trẻ em (1.0m - 1.4m).",
      imageUrl: "https://images.unsplash.com/photo-1559592442-741eaf739780?w=1200&q=80",
      metadata: JSON.stringify({ park: "Sun World Ba Na Hills", ticketType: "Trẻ Em", height: "1.0m - 1.4m", validDays: "Mọi ngày" }),
      status: "ACTIVE",
    },
    {
      name: "Combo Cáp Treo + Buffet Bà Nà Hills - Người Lớn",
      productCode: "SW-BANA-COMBO-ADULT",
      price: 1250000,
      category: "Vé du lịch",
      description: "Combo cáp treo và vé buffet trưa dành cho người lớn.",
      imageUrl: "https://banahills.sunworld.vn/wp-content/uploads/2020/07/nha-hang-arapang-1.jpg",
      metadata: JSON.stringify({ park: "Sun World Ba Na Hills", ticketType: "Người Lớn", height: ">1.4m", includes: "Buffet trưa" }),
      status: "ACTIVE",
    },

    // --- VinWonders Phu Quoc ---
    {
      name: "Vé VinWonders Phú Quốc - Người Lớn",
      productCode: "VW-PQ-ADULT",
      price: 1050000,
      category: "Vé du lịch",
      description: "Công viên chủ đề lớn nhất Việt Nam. Dành cho người lớn (cao trên 1.4m).",
      imageUrl: "https://images.unsplash.com/photo-1534430480872-3498386e7a56?w=1200&q=80",
      metadata: JSON.stringify({ park: "VinWonders Phú Quốc", ticketType: "Người Lớn", height: ">=1.4m", validDays: "Mọi ngày" }),
      status: "ACTIVE",
    },
    {
      name: "Vé VinWonders Phú Quốc - Trẻ Em & Người Cao Tuổi",
      productCode: "VW-PQ-CHILD-SENIOR",
      price: 750000,
      category: "Vé du lịch",
      description: "Vé VinWonders dành cho trẻ em (1.0m - 1.39m) hoặc người cao tuổi (từ 60 tuổi).",
      imageUrl: "https://images.unsplash.com/photo-1534430480872-3498386e7a56?w=1200&q=80",
      metadata: JSON.stringify({ park: "VinWonders Phú Quốc", ticketType: "Trẻ Em / Người Cao Tuổi", height: "1.0m - 1.39m hoặc >=60 tuổi" }),
      status: "ACTIVE",
    },
    {
      name: "Combo VinWonders & Safari Phú Quốc - Người Lớn",
      productCode: "VW-PQ-COMBO-ADULT",
      price: 1450000,
      category: "Vé du lịch",
      description: "Vé vào cổng 2 khu VinWonders và Vinpearl Safari Phú Quốc trong 1 ngày cho người lớn.",
      imageUrl: "https://images.unsplash.com/photo-1517513006860-26ed464b5ae2?w=1200&q=80",
      metadata: JSON.stringify({ park: "VinWonders Phú Quốc", ticketType: "Người Lớn", height: ">=1.4m", includes: "Safari" }),
      status: "ACTIVE",
    },

    // --- VinWonders Nha Trang ---
    {
      name: "Vé VinWonders Nha Trang (Gồm cáp treo) - Người Lớn",
      productCode: "VW-NT-ADULT",
      price: 1050000,
      category: "Vé du lịch",
      description: "Trọn gói vui chơi & cáp treo khứ hồi cho người lớn.",
      imageUrl: "https://images.unsplash.com/photo-1534346505051-51203b573531?w=1200&q=80",
      metadata: JSON.stringify({ park: "VinWonders Nha Trang", ticketType: "Người Lớn", height: ">=1.4m", includes: "Cáp treo khứ hồi" }),
      status: "ACTIVE",
    },
    {
      name: "Vé VinWonders Nha Trang (Gồm cáp treo) - Trẻ Em & Người Cao Tuổi",
      productCode: "VW-NT-CHILD",
      price: 800000,
      category: "Vé du lịch",
      description: "Trọn gói vui chơi & cáp treo khứ hồi cho trẻ em hoặc NCT.",
      imageUrl: "https://images.unsplash.com/photo-1534346505051-51203b573531?w=1200&q=80",
      metadata: JSON.stringify({ park: "VinWonders Nha Trang", ticketType: "Trẻ Em / Người Cao Tuổi", height: "1.0m - 1.39m hoặc >=60 tuổi" }),
      status: "ACTIVE",
    },
    {
      name: "Vé VinWonders Nha Trang Sau 16:00 - Người Lớn",
      productCode: "VW-NT-AFTER4-ADULT",
      price: 700000,
      category: "Vé du lịch",
      description: "Vé vào cổng sau 16:00, xem show Tata và vui chơi buổi tối.",
      imageUrl: "https://images.unsplash.com/photo-1534346505051-51203b573531?w=1200&q=80",
      metadata: JSON.stringify({ park: "VinWonders Nha Trang", ticketType: "Người Lớn", time: "Sau 16:00" }),
      status: "ACTIVE",
    },

    // --- VinWonders Nam Hoi An ---
    {
      name: "Vé VinWonders Nam Hội An - Người Lớn",
      productCode: "VW-NHA-ADULT",
      price: 600000,
      category: "Vé du lịch",
      description: "Trải nghiệm văn hóa di sản và các trò chơi hiện đại. Dành cho người lớn.",
      imageUrl: "https://images.unsplash.com/photo-1583417319070-4a69db38a482?w=1200&q=80",
      metadata: JSON.stringify({ park: "VinWonders Nam Hội An", ticketType: "Người Lớn" }),
      status: "ACTIVE",
    },
    {
      name: "Vé VinWonders Nam Hội An - Trẻ Em",
      productCode: "VW-NHA-CHILD",
      price: 450000,
      category: "Vé du lịch",
      description: "Trải nghiệm văn hóa di sản và các trò chơi hiện đại. Dành cho trẻ em.",
      imageUrl: "https://images.unsplash.com/photo-1583417319070-4a69db38a482?w=1200&q=80",
      metadata: JSON.stringify({ park: "VinWonders Nam Hội An", ticketType: "Trẻ Em / Người Cao Tuổi" }),
      status: "ACTIVE",
    },

    // --- Sun World Fansipan Legend ---
    {
      name: "Vé Cáp Treo Fansipan Legend - Người Lớn",
      productCode: "SW-FAN-ADULT",
      price: 850000,
      category: "Vé du lịch",
      description: "Vé cáp treo khứ hồi chinh phục Nóc nhà Đông Dương dành cho người lớn.",
      imageUrl: "https://images.unsplash.com/photo-1596131397999-bb015822904d?w=1200&q=80",
      metadata: JSON.stringify({ park: "Sun World Fansipan Legend", ticketType: "Người Lớn" }),
      status: "ACTIVE",
    },
    {
      name: "Vé Cáp Treo Fansipan Legend - Trẻ Em",
      productCode: "SW-FAN-CHILD",
      price: 650000,
      category: "Vé du lịch",
      description: "Vé cáp treo khứ hồi chinh phục Nóc nhà Đông Dương dành cho trẻ em (1.0m - 1.4m).",
      imageUrl: "https://images.unsplash.com/photo-1596131397999-bb015822904d?w=1200&q=80",
      metadata: JSON.stringify({ park: "Sun World Fansipan Legend", ticketType: "Trẻ Em" }),
      status: "ACTIVE",
    },

    // --- Sun World Hon Thom ---
    {
      name: "Vé Cáp Treo Hòn Thơm (Sun World Phu Quoc) - Người Lớn",
      productCode: "SW-HON-ADULT",
      price: 650000,
      category: "Vé du lịch",
      description: "Trải nghiệm cáp treo vượt biển dài nhất thế giới và công viên nước Aquatopia dành cho người lớn.",
      imageUrl: "https://images.unsplash.com/photo-1616484173745-07f25fd0547f?w=1200&q=80",
      metadata: JSON.stringify({ park: "Sun World Phu Quoc", ticketType: "Người Lớn" }),
      status: "ACTIVE",
    },
    {
      name: "Vé Cáp Treo Hòn Thơm - Trẻ Em",
      productCode: "SW-HON-CHILD",
      price: 500000,
      category: "Vé du lịch",
      description: "Vé cáp treo Hòn Thơm dành cho trẻ em (1.0m - 1.4m).",
      imageUrl: "https://images.unsplash.com/photo-1616484173745-07f25fd0547f?w=1200&q=80",
      metadata: JSON.stringify({ park: "Sun World Phu Quoc", ticketType: "Trẻ Em" }),
      status: "ACTIVE",
    },
  ];

  for (const product of products) {
    const existing = await prisma.product.findFirst({
      where: { 
        OR: [
          { productCode: product.productCode },
          { name: product.name }
        ]
      }
    });

    if (existing) {
      await prisma.product.update({
        where: { id: existing.id },
        data: product,
      });
    } else {
      await prisma.product.create({
        data: product,
      });
    }
  }

  console.log(`Đã cập nhật xong ${products.length} sản phẩm (VinWonders & Sun World).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
