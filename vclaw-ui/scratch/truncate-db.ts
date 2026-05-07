import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("--- Bắt đầu xóa sạch dữ liệu (Truncate) ---");

  // Lấy danh sách tất cả các bảng trừ bảng hệ thống của SQLite và Prisma
  const tablenames = await prisma.$queryRaw<Array<{ name: string }>>`
    SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_prisma_migrations';
  `;

  // Tắt ràng buộc khóa ngoại để xóa dễ dàng hơn trong SQLite
  await prisma.$executeRawUnsafe(`PRAGMA foreign_keys = OFF;`);

  for (const { name } of tablenames) {
    try {
      console.log(`Đang xóa bảng: ${name}...`);
      await prisma.$executeRawUnsafe(`DELETE FROM "${name}";`);
    } catch (error) {
      console.error(`Lỗi khi xóa bảng ${name}:`, error);
    }
  }

  // Bật lại ràng buộc khóa ngoại
  await prisma.$executeRawUnsafe(`PRAGMA foreign_keys = ON;`);

  console.log("--- Hoàn tất! Database đã trống rỗng ---");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
