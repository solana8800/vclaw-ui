
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const customer = await prisma.customer.findFirst();
  if (!customer) {
    console.log('No customer found.');
    return;
  }

  const virtualProduct = await prisma.product.findFirst({
    where: { type: 'VIRTUAL' }
  });
  const physicalProduct = await prisma.product.findFirst({
    where: { type: 'GOODS' }
  });

  if (virtualProduct) {
    const order1 = await prisma.order.create({
      data: {
        orderNumber: 'TEST-VIRTUAL-' + Date.now().toString(36).toUpperCase(),
        customerId: customer.id,
        amount: virtualProduct.price,
        status: 'PAID',
        fulfillmentType: 'DIGITAL_EMAIL',
        items: {
          create: {
            productId: virtualProduct.id,
            quantity: 1,
            price: virtualProduct.price
          }
        }
      }
    });
    console.log('Created virtual order:', order1.orderNumber);
  }

  if (physicalProduct) {
    const order2 = await prisma.order.create({
      data: {
        orderNumber: 'TEST-PHYSICAL-' + Date.now().toString(36).toUpperCase(),
        customerId: customer.id,
        amount: physicalProduct.price,
        status: 'PENDING',
        fulfillmentType: 'PHYSICAL',
        shippingAddress: '123 Đường ABC, Quận 1, TP.HCM',
        items: {
          create: {
            productId: physicalProduct.id,
            quantity: 1,
            price: physicalProduct.price
          }
        }
      }
    });
    console.log('Created physical order:', order2.orderNumber);
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
