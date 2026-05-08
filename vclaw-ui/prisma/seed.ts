import { PrismaClient } from "@prisma/client";

import type { ProductCommercePolicy } from "@/lib/commerce/product-policy";

const prisma = new PrismaClient();

type SeedProduct = {
  name: string;
  productCode: string;
  price: number;
  category: string;
  type: string;
  description: string;
  imageUrl: string | null;
  metadata: string;
  commercePolicyJson: string;
  status: "ACTIVE";
};

const BANA_IMAGE =
  "https://sun-ecommerce-cdn.azureedge.net/ecommerce/service-sites/asset/SunWorldBaNaHill/swold/sun-world-ba-na-hills-mot-thap-ky-chinh-phuc-va-vuon-tam-the-gioihtml/14.jpg";
const FANSIPAN_IMAGE =
  "https://sun-ecommerce-cdn.azureedge.net/ecommerce/service-sites/asset/SunWorldFansipan/swold/cap-treo/MG_1993.jpg";
const HON_THOM_IMAGE =
  "https://sun-ecommerce-cdn.azureedge.net/ecommerce/service-sites/asset/SunWorldPhuQuoc/swold/cap-treo-hon-thom/hon-thom-cable-car.jpg";
const VIN_PQ_IMAGE = "https://static.vinwonders.com/2022/05/vinwonders-phu-quoc-2.jpeg";
const VIN_NT_IMAGE = "https://static.vinwonders.com/2022/04/vinwonders-nha-trang-1.jpg";
const VIN_SAFARI_IMAGE = "https://static.vinwonders.com/2022/04/vinpearl-safari-phu-quoc-1.jpg";
const BA_DEN_CABLE_IMAGE =
  "https://sun-ecommerce-cdn.azureedge.net/ecommerce/service-sites/asset/SunWorldBaDen/swold/cap-treo-nui-ba-den/ba-den-cable-car.jpg";
const BA_DEN_ENTRANCE_IMAGE = "https://sunworld.vn/wp-content/uploads/2023/04/cong-vao-nui-ba-den.jpg";

const SOUVENIR_SUNWORLD_IMAGE = "https://owa.bestprice.vn/images/articles/ban-nen-mua-gi-lam-qua-khi-di-du-lich-da-nang-6086300438b4d.jpg";
const SOUVENIR_VINWONDERS_IMAGE = "https://product.hstatic.net/200001043367/product/ho_trang_1_80a30b6c697e4b9b9a6b6c697e4b9b9a_master.jpg";
const TSHIRT_BANA_IMAGE = "https://www.vecaptreobanahills.com/wp-content/uploads/2024/04/ao-thun-ba-na-hills.jpg";
const BUCKET_HAT_IMAGE = "https://hoiandaytrip.com/wp-content/uploads/2023/04/ba-na-hills-souvenir-shop.jpg";
const TUMBLER_VIN_IMAGE = "https://product.hstatic.net/200001043367/product/hop_qua_1_80a30b6c697e4b9b9a6b6c697e4b9b9a_master.jpg";
const TOTE_VIN_IMAGE = "https://cdn.hstatic.net/products/200001043367/c_nh_c_t_1_394fe12c41e34b11b26f47ab56f6649d.jpg";
const RAINCOAT_SUNWORLD_IMAGE = "https://bizweb.dktcdn.net/thumb/1024x1024/100/452/160/products/image-1669037100562.png?v=1671857954040";

const developmentShopSettings = {
  id: "default",
  shopName: "Ve Sunworld - Vinwonders",
  preferredChannel: "Zalo",
  bankName: "TCB",
  accountHolder: "TRAN DANH TUAN",
  accountNumber: "69696969321",
  address: "Tòa S203 - Vinhomes Oean Park - Da Ton - Gia Lam - Ha noi",
  phone: "0817789396",
  email: "solana8800@gmail.com",
  website: null,
  shopLogoUrl: null,
  automationRulesJson: JSON.stringify({
    paymentFollowup: { enabled: true, delayValue: 24, delayUnit: "hours" },
    appointmentReminder: { enabled: true, delayValue: 2, delayUnit: "hours" },
    leadReactivation: { enabled: true, delayValue: 3, delayUnit: "days" },
  }),
  approvalConfigJson: JSON.stringify({
    paymentAutoApprove: false,
    automationEnabled: true,
  }),
  language: "vi",
  notificationConfigJson: JSON.stringify({
    reminderInterval: 30,
    followUpCadence: "NORMAL",
  }),
  shipperGroupId: "group:3389622756751054122",
  ghnToken: "3d33b254-4579-11f1-a973-aee5264794df",
  ghnShopId: "200166",
  ghnFromDistrictId: null,
  shopCode: null,
};

function policy(input: ProductCommercePolicy): string {
  return JSON.stringify(input);
}

function metadata(value: Record<string, unknown>): string {
  return JSON.stringify(value);
}

const prepaidEmailTicketPolicy = policy({
  productKind: "DIGITAL",
  paymentMode: "PREPAID",
  fulfillmentMode: "EMAIL_DELIVERY",
  requiresPaymentBeforeFulfillment: true,
  requiresBillVerification: true,
  requiredCustomerFields: ["name", "phone", "email"],
});

function prepaidShippingPolicy(weightGram: number): string {
  return policy({
    productKind: "PHYSICAL",
    paymentMode: "PREPAID",
    fulfillmentMode: "GHN_SHIPPING",
    requiresPaymentBeforeFulfillment: true,
    requiresBillVerification: true,
    requiredCustomerFields: ["name", "phone", "address"],
    shipping: { carrier: "GHN", allowCod: false, weightGram },
  });
}

function codShippingPolicy(weightGram: number): string {
  return policy({
    productKind: "PHYSICAL",
    paymentMode: "COD",
    fulfillmentMode: "GHN_SHIPPING",
    requiresPaymentBeforeFulfillment: false,
    requiresBillVerification: false,
    requiredCustomerFields: ["name", "phone", "address"],
    shipping: { carrier: "GHN", allowCod: true, weightGram },
  });
}
const seedProducts: SeedProduct[] = [
  {
    name: "Vé Cáp Treo Bà Nà Hills - Người Lớn",
    productCode: "SW-BANA-ADULT",
    price: 950000,
    category: "Vé Sun World",
    type: "DIGITAL",
    description: "Vé điện tử cáp treo Bà Nà Hills cho người lớn, gửi qua email sau khi xác nhận chuyển khoản.",
    imageUrl: BANA_IMAGE,
    metadata: metadata({ park: "Sun World Ba Na Hills", ticketType: "Người Lớn", delivery: "email" }),
    commercePolicyJson: prepaidEmailTicketPolicy,
    status: "ACTIVE",
  },
  {
    name: "Vé Cáp Treo Bà Nà Hills - Trẻ Em",
    productCode: "SW-BANA-CHILD",
    price: 750000,
    category: "Vé Sun World",
    type: "DIGITAL",
    description: "Vé điện tử cáp treo Bà Nà Hills cho trẻ em 1m-1m4, gửi qua email.",
    imageUrl: BANA_IMAGE,
    metadata: metadata({ park: "Sun World Ba Na Hills", ticketType: "Trẻ Em", height: "1.0m - 1.4m", delivery: "email" }),
    commercePolicyJson: prepaidEmailTicketPolicy,
    status: "ACTIVE",
  },
  {
    name: "Combo Cáp Treo + Buffet Bà Nà Hills - Người Lớn",
    productCode: "SW-BANA-COMBO-ADULT",
    price: 1250000,
    category: "Vé Sun World",
    type: "DIGITAL",
    description: "Combo vé điện tử cáp treo và buffet trưa Bà Nà Hills cho người lớn.",
    imageUrl: BANA_IMAGE,
    metadata: metadata({ park: "Sun World Ba Na Hills", ticketType: "Người Lớn", includes: "Buffet trưa", delivery: "email" }),
    commercePolicyJson: prepaidEmailTicketPolicy,
    status: "ACTIVE",
  },
  {
    name: "Vé Cáp Treo Fansipan Legend - Người Lớn",
    productCode: "SW-FAN-ADULT",
    price: 850000,
    category: "Vé Sun World",
    type: "DIGITAL",
    description: "Vé điện tử cáp treo khứ hồi Fansipan Legend cho người lớn.",
    imageUrl: FANSIPAN_IMAGE,
    metadata: metadata({ park: "Sun World Fansipan Legend", ticketType: "Người Lớn", delivery: "email" }),
    commercePolicyJson: prepaidEmailTicketPolicy,
    status: "ACTIVE",
  },
  {
    name: "Vé Cáp Treo Hòn Thơm - Người Lớn",
    productCode: "SW-HON-ADULT",
    price: 650000,
    category: "Vé Sun World",
    type: "DIGITAL",
    description: "Vé điện tử cáp treo Hòn Thơm Phú Quốc cho người lớn.",
    imageUrl: HON_THOM_IMAGE,
    metadata: metadata({ park: "Sun World Phu Quoc", ticketType: "Người Lớn", delivery: "email" }),
    commercePolicyJson: prepaidEmailTicketPolicy,
    status: "ACTIVE",
  },
  {
    name: "Vé VinWonders Phú Quốc - Người Lớn",
    productCode: "VW-PQ-ADULT",
    price: 1050000,
    category: "Vé VinWonders",
    type: "DIGITAL",
    description: "Vé điện tử VinWonders Phú Quốc cho người lớn, gửi qua email sau đối soát bill.",
    imageUrl: VIN_PQ_IMAGE,
    metadata: metadata({ park: "VinWonders Phú Quốc", ticketType: "Người Lớn", delivery: "email" }),
    commercePolicyJson: prepaidEmailTicketPolicy,
    status: "ACTIVE",
  },
  {
    name: "Vé VinWonders Nha Trang - Người Lớn",
    productCode: "VW-NT-ADULT",
    price: 1050000,
    category: "Vé VinWonders",
    type: "DIGITAL",
    description: "Vé điện tử VinWonders Nha Trang gồm cáp treo khứ hồi cho người lớn.",
    imageUrl: VIN_NT_IMAGE,
    metadata: metadata({ park: "VinWonders Nha Trang", ticketType: "Người Lớn", includes: "Cáp treo khứ hồi", delivery: "email" }),
    commercePolicyJson: prepaidEmailTicketPolicy,
    status: "ACTIVE",
  },
  {
    name: "Combo VinWonders & Safari Phú Quốc - Người Lớn",
    productCode: "VW-PQ-COMBO-ADULT",
    price: 1450000,
    category: "Vé VinWonders",
    type: "DIGITAL",
    description: "Combo vé điện tử VinWonders và Vinpearl Safari Phú Quốc trong 1 ngày.",
    imageUrl: VIN_SAFARI_IMAGE,
    metadata: metadata({ park: "VinWonders Phú Quốc", ticketType: "Người Lớn", includes: "Safari", delivery: "email" }),
    commercePolicyJson: prepaidEmailTicketPolicy,
    status: "ACTIVE",
  },
  {
    name: "Mũ bucket Sun World",
    productCode: "SOUV-SW-BUCKET-HAT",
    price: 120000,
    category: "Quà lưu niệm",
    type: "GOODS",
    description: "Mũ bucket in logo Sun World, giao hàng toàn quốc sau khi khách chuyển khoản.",
    imageUrl: BUCKET_HAT_IMAGE,
    metadata: metadata({ brand: "Sun World", material: "cotton", color: "vàng" }),
    commercePolicyJson: prepaidShippingPolicy(250),
    status: "ACTIVE",
  },
  {
    name: "Bình giữ nhiệt VinWonders 500ml",
    productCode: "SOUV-VW-TUMBLER-500",
    price: 180000,
    category: "Quà lưu niệm",
    type: "GOODS",
    description: "Bình giữ nhiệt 500ml in logo VinWonders, cần thanh toán trước rồi shop gửi GHN.",
    imageUrl: TUMBLER_VIN_IMAGE,
    metadata: metadata({ brand: "VinWonders", capacityMl: 500, material: "stainless steel" }),
    commercePolicyJson: prepaidShippingPolicy(600),
    status: "ACTIVE",
  },
  {
    name: "Áo thun Bà Nà Hills",
    productCode: "SOUV-BANA-TSHIRT",
    price: 220000,
    category: "Quà lưu niệm",
    type: "GOODS",
    description: "Áo thun souvenir Bà Nà Hills, có size S/M/L/XL, thanh toán trước để giữ hàng.",
    imageUrl: TSHIRT_BANA_IMAGE,
    metadata: metadata({ park: "Sun World Ba Na Hills", sizes: ["S", "M", "L", "XL"] }),
    commercePolicyJson: prepaidShippingPolicy(350),
    status: "ACTIVE",
  },
  {
    name: "Set móc khóa cáp treo Sun World",
    productCode: "SOUV-SW-KEYCHAIN-SET",
    price: 90000,
    category: "Quà lưu niệm",
    type: "GOODS",
    description: "Set 3 móc khóa mô hình cáp treo Sun World, hàng nhỏ gọn giao GHN.",
    imageUrl: SOUVENIR_SUNWORLD_IMAGE,
    metadata: metadata({ brand: "Sun World", pack: 3 }),
    commercePolicyJson: prepaidShippingPolicy(150),
    status: "ACTIVE",
  },
  {
    name: "Gấu bông mascot VinWonders",
    productCode: "SOUV-VW-MASCOT-PLUSH",
    price: 250000,
    category: "Quà lưu niệm COD",
    type: "GOODS",
    description: "Gấu bông mascot VinWonders, hỗ trợ COD khi khách cung cấp đủ tên, SĐT và địa chỉ.",
    imageUrl: SOUVENIR_VINWONDERS_IMAGE,
    metadata: metadata({ brand: "VinWonders", sizeCm: 30 }),
    commercePolicyJson: codShippingPolicy(500),
    status: "ACTIVE",
  },
  {
    name: "Áo mưa du lịch Sun World",
    productCode: "SOUV-SW-RAINCOAT",
    price: 75000,
    category: "Quà lưu niệm COD",
    type: "GOODS",
    description: "Áo mưa mỏng gấp gọn cho khách đi công viên, hỗ trợ giao COD.",
    imageUrl: RAINCOAT_SUNWORLD_IMAGE,
    metadata: metadata({ brand: "Sun World", usage: "travel" }),
    commercePolicyJson: codShippingPolicy(250),
    status: "ACTIVE",
  },
  {
    name: "Túi tote VinWonders",
    productCode: "SOUV-VW-TOTE",
    price: 150000,
    category: "Quà lưu niệm COD",
    type: "GOODS",
    description: "Túi tote canvas VinWonders, nhận hàng thanh toán COD.",
    imageUrl: TOTE_VIN_IMAGE,
    metadata: metadata({ brand: "VinWonders", material: "canvas" }),
    commercePolicyJson: codShippingPolicy(300),
    status: "ACTIVE",
  },
  {
    name: "Vé Vào Cổng Núi Bà Đen - Người Lớn",
    productCode: "NBD-ENTRANCE-ADULT",
    price: 10000,
    category: "Vé Núi Bà Đen",
    type: "DIGITAL",
    description: "Vé vào cổng khu du lịch Núi Bà Đen cho người lớn.",
    imageUrl: BA_DEN_ENTRANCE_IMAGE,
    metadata: metadata({ park: "Núi Bà Đen", ticketType: "Người Lớn", delivery: "email" }),
    commercePolicyJson: prepaidEmailTicketPolicy,
    status: "ACTIVE",
  },
  {
    name: "Vé Cáp Treo Núi Bà Đen (Đỉnh Vân Sơn) - Người Lớn",
    productCode: "NBD-VANSON-ADULT",
    price: 400000,
    category: "Vé Núi Bà Đen",
    type: "DIGITAL",
    description: "Vé cáp treo khứ hồi lên đỉnh núi Bà Đen (Tuyến Vân Sơn) cho người lớn.",
    imageUrl: BA_DEN_CABLE_IMAGE,
    metadata: metadata({ park: "Núi Bà Đen", ticketType: "Người Lớn", route: "Đỉnh Vân Sơn", delivery: "email" }),
    commercePolicyJson: prepaidEmailTicketPolicy,
    status: "ACTIVE",
  },
  {
    name: "Vé Cáp Treo Núi Bà Đen (Đỉnh Vân Sơn) - Trẻ Em",
    productCode: "NBD-VANSON-CHILD",
    price: 300000,
    category: "Vé Núi Bà Đen",
    type: "DIGITAL",
    description: "Vé cáp treo khứ hồi lên đỉnh núi Bà Đen (Tuyến Vân Sơn) cho trẻ em (1m-1m4).",
    imageUrl: BA_DEN_CABLE_IMAGE,
    metadata: metadata({ park: "Núi Bà Đen", ticketType: "Trẻ Em", route: "Đỉnh Vân Sơn", height: "1.0m - 1.4m", delivery: "email" }),
    commercePolicyJson: prepaidEmailTicketPolicy,
    status: "ACTIVE",
  },
];

async function resetDevelopmentData() {
  await prisma.conversationMessage.deleteMany();
  await prisma.conversation.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.order.deleteMany();
  await prisma.task.deleteMany();
  await prisma.agentToolLog.deleteMany();
  await prisma.automationJob.deleteMany();
  await prisma.integrationPeer.deleteMany();
  await prisma.integrationGroup.deleteMany();
  await prisma.integrationAccount.deleteMany();
  await prisma.channelConnection.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.product.deleteMany();
}

async function ensureDevelopmentShopSettings() {
  const existing = await prisma.shopSettings.findUnique({ where: { id: "default" } });
  if (existing) {
    console.log("Giữ nguyên ShopSettings hiện có.");
    return;
  }

  await prisma.shopSettings.create({ data: developmentShopSettings });
  console.log("Đã tạo ShopSettings mặc định cho development.");
}

async function main() {
  console.log("Đang làm sạch dữ liệu development, giữ nguyên ShopSettings nếu đã có...");
  await resetDevelopmentData();
  await ensureDevelopmentShopSettings();

  console.log("Đang nạp dữ liệu mồi (vé điện tử + quà lưu niệm ship trả trước/COD)...");

  for (const product of seedProducts) {
    await prisma.product.create({ data: product });
  }

  console.log(`Xong. Đã nạp ${seedProducts.length} sản phẩm seed.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
