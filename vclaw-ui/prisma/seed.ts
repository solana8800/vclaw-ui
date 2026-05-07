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
  imageUrl: string;
  metadata: string;
  commercePolicyJson: string;
  status: "ACTIVE";
};

const developmentShopSettings = {
  id: "default",
  shopName: "Ve Sunworld - Vinwonders",
  preferredChannel: "Zalo",
  bankName: "TCB",
  accountHolder: "TRAN DANH TUAN",
  accountNumber: "69696969321",
  address: "Tòa S203 - Vinhomes Oean Park - Da Ton - Gia Lam - Ha noi",
  phone: "0817789396",
  email: null,
  website: null,
  shopLogoUrl: null,
  approvalConfigJson: JSON.stringify({
    paymentAutoApprove: false,
    automationEnabled: true,
    remoteAccessEnabled: false,
  }),
  language: "vi",
  notificationConfigJson: JSON.stringify({
    reminderInterval: 30,
    followUpCadence: "NORMAL",
  }),
  shipperGroupId: "group:3389622756751054122",
  ghnToken: null,
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
    imageUrl: "https://images.unsplash.com/photo-1559592442-741eaf739780?w=1200&q=80",
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
    imageUrl: "https://images.unsplash.com/photo-1559592442-741eaf739780?w=1200&q=80",
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
    imageUrl: "https://banahills.sunworld.vn/wp-content/uploads/2020/07/nha-hang-arapang-1.jpg",
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
    imageUrl: "https://images.unsplash.com/photo-1596131397999-bb015822904d?w=1200&q=80",
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
    imageUrl: "https://images.unsplash.com/photo-1616484173745-07f25fd0547f?w=1200&q=80",
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
    imageUrl: "https://images.unsplash.com/photo-1534430480872-3498386e7a56?w=1200&q=80",
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
    imageUrl: "https://images.unsplash.com/photo-1534346505051-51203b573531?w=1200&q=80",
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
    imageUrl: "https://images.unsplash.com/photo-1517513006860-26ed464b5ae2?w=1200&q=80",
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
    imageUrl: "https://images.unsplash.com/photo-1521369909029-2afed882baee?w=1200&q=80",
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
    imageUrl: "https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=1200&q=80",
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
    imageUrl: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=1200&q=80",
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
    imageUrl: "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=1200&q=80",
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
    imageUrl: "https://images.unsplash.com/photo-1559454403-b8fb88521f11?w=1200&q=80",
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
    imageUrl: "https://images.unsplash.com/photo-1519692933481-e162a57d6721?w=1200&q=80",
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
    imageUrl: "https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=1200&q=80",
    metadata: metadata({ brand: "VinWonders", material: "canvas" }),
    commercePolicyJson: codShippingPolicy(300),
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
