
import { createGhnOrderDirect, getGhnOrderDetail } from "../lib/logistics/ghn-order";
import { prisma } from "../lib/db";

async function test() {
  console.log("--- TEST GHN DIRECT CREATE ---");
  
  // Giả sử ta muốn tạo một đơn hàng mẫu
  // Bạn cần thay thế thông tin này bằng thông tin thật hoặc cấu hình Token/ShopId trong DB
  const mockPayload = {
    payment_type_id: 2,
    note: "Đơn hàng test từ VClaw",
    required_note: "CHOXEMHANGKHONGTHU",
    return_phone: "0987654321",
    return_address: "789 CMT8, Tân Bình, TP.HCM",
    to_name: "Khách Hàng Test",
    to_phone: "0912345678",
    to_address: "123 Lê Lợi, Quận 1, TP.HCM",
    to_ward_code: "20314", // Phường Bến Nghé, Quận 1
    to_district_id: 1442,   // Quận 1
    weight: 200,
    length: 10,
    width: 10,
    height: 10,
    service_type_id: 2,
    items: [
      {
        name: "Áo sơ mi nam Oxford Premium",
        code: "SHIRT-OXFORD-001",
        quantity: 1,
        price: 450000
      }
    ]
  };

  const createRes = await createGhnOrderDirect(mockPayload);
  console.log("Create Result:", JSON.stringify(createRes, null, 2));

  if (createRes.success && createRes.data?.order_code) {
    const orderCode = createRes.data.order_code;
    console.log(`--- TEST GHN GET DETAIL (${orderCode}) ---`);
    const detailRes = await getGhnOrderDetail(orderCode);
    console.log("Detail Result:", JSON.stringify(detailRes, null, 2));
  } else {
    console.log("Không thể test Get Detail vì tạo đơn thất bại.");
  }

  await prisma.$disconnect();
}

test();
