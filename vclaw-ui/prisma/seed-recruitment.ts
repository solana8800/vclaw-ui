import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("--- Seeding Recruitment data ---");

  // Tạo workspace Tuyển dụng
  const workspace = await prisma.workspace.upsert({
    where: { id: "hh_workspace_1" },
    update: {},
    create: {
      id: "hh_workspace_1",
      name: "Phòng Tuyển dụng VClaw",
      industry: "HEAD_HUNTER",
      description: "Quản lý tuyển dụng nhân sự công nghệ",
    },
  });

  // Khởi tạo cài đặt mặc định cho Tuyển dụng
  await prisma.shopSettings.upsert({
    where: { id: "default" },
    update: {},
    create: {
      id: "default",
      language: "vi",
      linxaToken: process.env.LINXA_TOKEN || "linxa_925177e5d0e74d9cb5aae3e7e4e8648288d36e08723d42af82fbad38f52f38cd",
      firecrawlToken: process.env.FIRECRAWL_API_KEY || "fc-ecf5ee4071974cbba2119840274c54de",
      automationRulesJson: JSON.stringify({ rec_autoCollect: true }),
    },
  });

  // Tạo vị trí tuyển dụng mẫu
  await prisma.jobPosition.create({
    data: {
      title: "Senior React Developer",
      description: "Xây dựng giao diện cho nền tảng VClaw AI",
      requirements: "5+ years experience, expert in React & Next.js",
      status: "OPEN",
    },
  });

  console.log("Seeding hoàn tất.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
