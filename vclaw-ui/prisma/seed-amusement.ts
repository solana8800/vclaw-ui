import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Đang nạp dữ liệu sản phẩm kèm hình ảnh...");

  const products = [
    {
      name: "Vé Cáp Treo Bà Nà Hills (Sun World)",
      price: 900000,
      category: "Vé du lịch",
      description: "Vé vào cổng & cáp treo khứ hồi Bà Nà Hills, bao gồm Fantasy Park và Cầu Vàng.",
      imageUrl: "https://images.unsplash.com/photo-1559592442-741eaf739780?w=1200&q=80",
      status: "ACTIVE",
    },
    {
      name: "Vé Cáp Treo Hòn Thơm (Sun World Phu Quoc)",
      price: 600000,
      category: "Vé du lịch",
      description: "Trải nghiệm cáp treo vượt biển dài nhất thế giới và công viên nước Aquatopia.",
      imageUrl: "https://images.unsplash.com/photo-1616484173745-07f25fd0547f?w=1200&q=80",
      status: "ACTIVE",
    },
    {
      name: "Vé Fansipan Legend (Sun World)",
      price: 850000,
      category: "Vé du lịch",
      description: "Vé cáp treo chinh phục đỉnh Fansipan - Nóc nhà Đông Dương.",
      imageUrl: "https://images.unsplash.com/photo-1596131397999-bb015822904d?w=1200&q=80",
      status: "ACTIVE",
    },
    {
      name: "Vé VinWonders Phú Quốc",
      price: 950000,
      category: "Vé du lịch",
      description: "Công viên chủ đề lớn nhất Việt Nam với nhiều trò chơi cảm giác mạnh và thủy cung.",
      imageUrl: "https://images.unsplash.com/photo-1534430480872-3498386e7a56?w=1200&q=80",
      status: "ACTIVE",
    },
    {
      name: "Vé VinWonders Nha Trang",
      price: 800000,
      category: "Vé du lịch",
      description: "Công viên giải trí trên đảo với cáp treo vượt biển và vịnh phao nổi.",
      imageUrl: "https://images.unsplash.com/photo-1534346505051-51203b573531?w=1200&q=80",
      status: "ACTIVE",
    },
    {
      name: "Vé VinWonders Nam Hội An",
      price: 600000,
      category: "Vé du lịch",
      description: "Trải nghiệm văn hóa di sản và các trò chơi hiện đại.",
      imageUrl: "https://images.unsplash.com/photo-1583417319070-4a69db38a482?w=1200&q=80",
      status: "ACTIVE",
    },
    {
      name: "Combo Buffet Trưa Bà Nà Hills",
      price: 350000,
      category: "Ẩm thực",
      description: "Thưởng thức hơn 70 món ăn Á - Âu tại nhà hàng Arapang hoặc Lavender.",
      imageUrl: "https://banahills.sunworld.vn/wp-content/uploads/2020/07/nha-hang-arapang-1.jpg",
      status: "ACTIVE",
    },
    {
      name: "Combo Fastfood (Burger + Pepsi)",
      price: 120000,
      category: "Ẩm thực",
      description: "Bữa trưa nhanh tiện lợi tại các quầy thực phẩm trong khu vui chơi.",
      imageUrl: "https://images.unsplash.com/photo-1561758033-d89a9ad46330?w=800&q=80",
      status: "ACTIVE",
    },
    {
      name: "Xúc Xích Nướng Đức",
      price: 45000,
      category: "Ẩm thực",
      description: "Xúc xích nướng thơm ngon, món ăn nhẹ phổ biến tại Sun World.",
      imageUrl: "https://images.unsplash.com/photo-1532246420286-127bcd803104?w=800&q=80",
      status: "ACTIVE",
    },
    {
      name: "Nước Suối 500ml",
      price: 20000,
      category: "Ẩm thực",
      description: "Nước uống đóng chai mát lạnh.",
      imageUrl: "https://images.unsplash.com/photo-1548839140-29a749e1cf4d?w=800&q=80",
      status: "ACTIVE",
    },
    {
      name: "Bắp Rang Bơ (Popcorn)",
      price: 55000,
      category: "Ẩm thực",
      description: "Bắp rang bơ giòn rụm, thơm phức.",
      imageUrl: "https://images.unsplash.com/photo-1585647347483-22b66260dfff?w=800&q=80",
      status: "ACTIVE",
    },
  ];

  for (const product of products) {
    const existing = await prisma.product.findFirst({
      where: { name: product.name }
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

  console.log(`Đã cập nhật xong ${products.length} sản phẩm với hình ảnh.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
