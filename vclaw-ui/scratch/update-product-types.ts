
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const result = await prisma.product.updateMany({
    where: {
      category: {
        contains: 'Vé'
      }
    },
    data: {
      type: 'VIRTUAL'
    }
  });
  console.log(`Updated ${result.count} products to VIRTUAL.`);
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
