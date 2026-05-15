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
