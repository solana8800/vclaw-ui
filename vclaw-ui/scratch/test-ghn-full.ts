import { prisma } from "../lib/db";
import { createGhnOrder, getGhnOrderDetail } from "../lib/logistics/ghn-order";

async function main() {
  const orderId = "cmolfjx6f000mwp8tsks8by6n";
  
  console.log("1. Cập nhật địa chỉ ship cho đơn test...");
  await prisma.order.update({
    where: { id: orderId },
    data: { shippingAddress: "123 Lê Lợi, Phường Bến Thành, Quận 1, TP. Hồ Chí Minh" }
  });

  console.log("2. Thử tạo vận đơn GHN (với Gateway cổng 3001)...");
  const res = await createGhnOrder(orderId);
  console.log("Kết quả:", JSON.stringify(res, null, 2));

  if (res.success && res.orderCode) {
    console.log("\n3. Thử lấy chi tiết vận đơn vừa tạo...");
    const detail = await getGhnOrderDetail(res.orderCode);
    console.log("Chi tiết:", JSON.stringify(detail, null, 2));
  }
}

main().catch(console.error);
