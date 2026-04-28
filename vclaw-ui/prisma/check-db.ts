import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const shop = await prisma.shopSettings.findFirst({
    where: { id: "default" }
  });
  
  if (!shop) {
    console.log("KHÔNG TÌM THẤY bản ghi shop mặc định (id: default)");
    // Thử tìm bản ghi đầu tiên nếu không có default
    const firstShop = await prisma.shopSettings.findFirst();
    if (firstShop) {
      console.log("Bản ghi đầu tiên tìm được:", JSON.stringify(firstShop, null, 2));
    } else {
      console.log("Database hoàn toàn rỗng trong bảng ShopSettings");
    }
  } else {
    console.log("Dữ liệu Shop mặc định:", JSON.stringify(shop, null, 2));
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
