
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function checkSettings() {
  const settings = await prisma.shopSettings.findFirst();
  console.log("Shop Settings:", JSON.stringify(settings, null, 2));
  await prisma.$disconnect();
}

checkSettings();
