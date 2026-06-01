import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("--- Seeding Recruitment data ---");

  await prisma.workspace.upsert({
    where: { id: "hh_workspace_1" },
    update: {},
    create: {
      id: "hh_workspace_1",
      name: "Phòng Tuyển dụng VClaw",
      industry: "HEAD_HUNTER",
      description: "Quản lý tuyển dụng nhân sự công nghệ",
    },
  });

  await prisma.recruitmentSettings.upsert({
    where: { id: "default" },
    update: {},
    create: {
      id: "default",
      linkedinCompanyUrl:
        process.env.LINKEDIN_COMPANY_URL || "https://www.linkedin.com/company/117543969/",
    },
  });

  const existingJob = await prisma.jobPosition.findFirst({
    where: { title: "Senior React Developer" },
  });
  if (!existingJob) {
    await prisma.jobPosition.create({
      data: {
        title: "Senior React Developer",
        description: "Xây dựng giao diện cho nền tảng VClaw AI",
        requirements: "5+ years experience, expert in React & Next.js",
        status: "OPEN",
      },
    });
  }

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
