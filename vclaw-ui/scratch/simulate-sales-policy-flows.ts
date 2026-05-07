import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";

const repoRoot = path.resolve(process.cwd(), "..");
const reportPath = path.join(repoRoot, "docs", "sales-flow-policy-simulation-2026-05-07.md");
const endpoint = process.env.VCLAW_AGENT_TOOLS_URL ?? "http://127.0.0.1:12687/api/vclaw/agent-tools";
const liveDbPath = process.env.VCLAW_SIMULATION_DB_PATH ??
  path.join(process.cwd(), "prisma", "business.sqlite");
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: pathToFileURL(liveDbPath).href,
    },
  },
});

dotenv.config({ path: path.join(process.cwd(), ".env.local") });
dotenv.config({ path: path.join(process.cwd(), ".env") });

type ToolResult = Record<string, unknown>;
type ToolOutput = { ok: boolean; result?: ToolResult; error?: string };
type ReportOrder = Record<string, unknown> & {
  id: string;
  orderNumber: string;
  amount: number;
  status: string;
  fulfillmentType: string;
  fulfillmentStatus: string;
  shippingAddress: string | null;
  customer?: { name: string; phone: string | null } | null;
  items: Array<{ quantity: number; price: number; product?: { productCode: string | null } | null }>;
};
type ReportPayment = { method: string; status: string; amount: number };
type ReportTask = { type: string; status: string; title: string };
type TranscriptLine = {
  role: "customer" | "bot" | "tool" | "system";
  text: string;
};
type ScenarioResult = {
  id: string;
  title: string;
  productCode: string;
  transcript: TranscriptLine[];
  toolCalls: Array<{ name: string; args: Record<string, unknown>; out: ToolOutput }>;
  order?: ReportOrder | null;
  payments: ReportPayment[];
  tasks: ReportTask[];
  findings: string[];
};

const runId = `SIM${new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14)}`;

async function main() {
  const secret = process.env.VCLAW_AGENT_TOOLS_SECRET?.trim();
  if (!secret) {
    throw new Error("Thiếu VCLAW_AGENT_TOOLS_SECRET trong vclaw-ui/.env.local");
  }

  await seedProducts();
  const shopSettings = await prisma.shopSettings.findFirst();
  const results: ScenarioResult[] = [];

  results.push(await runPhysicalPrepaid());
  results.push(await runPhysicalCod());
  results.push(await runDigitalEmail());
  results.push(await runThirdPartyTicket());

  const report = renderReport({
    runId,
    endpoint,
    shopSettings: {
      hasBank: Boolean(shopSettings?.bankName && shopSettings.accountNumber),
      hasGhn: Boolean(shopSettings?.ghnToken && shopSettings.ghnShopId),
    },
    results,
  });

  fs.writeFileSync(reportPath, report);
  console.log(JSON.stringify({
    reportPath,
    runId,
    scenarios: results.map((result) => ({
      id: result.id,
      orderNumber: result.order?.orderNumber,
      orderStatus: result.order?.status,
      fulfillmentStatus: result.order?.fulfillmentStatus,
      findings: result.findings,
    })),
  }, null, 2));
}

async function seedProducts() {
  const products = [
    {
      code: "SIM-PHYS-PREPAID",
      name: "SIM Máy lọc mini trả trước",
      price: 320000,
      type: "GOODS",
      metadata: {
        commercePolicy: {
          productKind: "PHYSICAL",
          paymentMode: "PREPAID",
          fulfillmentMode: "GHN_SHIPPING",
          shipping: { carrier: "GHN", allowCod: false, weightGram: 900 },
        },
      },
    },
    {
      code: "SIM-PHYS-COD",
      name: "SIM Áo thun COD",
      price: 180000,
      type: "GOODS",
      metadata: {
        commercePolicy: {
          productKind: "PHYSICAL",
          paymentMode: "COD",
          fulfillmentMode: "GHN_SHIPPING",
          shipping: { carrier: "GHN", allowCod: true, weightGram: 300 },
        },
      },
    },
    {
      code: "SIM-DIGITAL-EMAIL",
      name: "SIM Voucher online gửi email",
      price: 250000,
      type: "DIGITAL",
      metadata: {
        commercePolicy: {
          productKind: "DIGITAL",
          paymentMode: "PREPAID",
          fulfillmentMode: "EMAIL_DELIVERY",
        },
      },
    },
    {
      code: "SIM-THIRD-PARTY",
      name: "SIM Vé đối tác qua email",
      price: 450000,
      type: "THIRD_PARTY",
      metadata: {
        commercePolicy: {
          productKind: "THIRD_PARTY",
          paymentMode: "PREPAID",
          fulfillmentMode: "THIRD_PARTY_API",
          requiredCustomerFields: ["name", "phone", "email"],
          provider: { name: "SIM_PARTNER", productSku: "SIM-TICKET-01", apiMode: "ISSUE_TICKET" },
        },
      },
    },
  ];

  for (const p of products) {
    await prisma.product.upsert({
      where: { productCode: p.code },
      update: {
        name: p.name,
        price: p.price,
        type: p.type,
        category: "Policy Simulation",
        status: "ACTIVE",
        metadata: JSON.stringify(p.metadata),
      },
      create: {
        productCode: p.code,
        name: p.name,
        price: p.price,
        type: p.type,
        category: "Policy Simulation",
        status: "ACTIVE",
        metadata: JSON.stringify(p.metadata),
      },
    });
  }
}

async function runPhysicalPrepaid(): Promise<ScenarioResult> {
  return runScenario({
    id: "physical-prepaid",
    title: "Hàng vật lý trả trước rồi mới đặt ship",
    productCode: "SIM-PHYS-PREPAID",
    quantity: 1,
    customer: {
      customerName: "Anh Prepaid Test",
      phone: phoneFor("001"),
      shippingAddress: "72 Le Loi, Quan 1, TP.HCM",
    },
    firstCustomerLine: "Shop có máy lọc mini không, anh lấy 1 cái giao Quận 1.",
    collectLine: "Anh gửi SĐT và địa chỉ để em lên đơn, đơn này chuyển khoản trước rồi shop đặt ship.",
    confirmationLine: "Anh lấy 1 cái, giao 72 Lê Lợi Q1, số 0900000001.",
    afterOrderBot: (order) => order.qrUrl
      ? `Em tạo đơn ${order.orderNumber} rồi. Anh chuyển ${money(Number(order.amount))} đúng nội dung ${order.transferNote}, gửi bill để em đối soát.\n${order.qrUrl}`
      : `Em tạo đơn ${order.orderNumber} rồi, nhưng shop chưa có QR ngân hàng. Em chuyển nhân viên gửi thông tin thanh toán.`,
    afterVerifiedBot: "Bill khớp rồi anh. Em chuyển đơn sang bước đặt ship.",
    fulfillmentTool: "vclaw.shipping.create_ghn_order",
    fulfillmentArgs: {},
  });
}

async function runPhysicalCod(): Promise<ScenarioResult> {
  return runScenario({
    id: "physical-cod",
    title: "Hàng vật lý ship COD",
    productCode: "SIM-PHYS-COD",
    quantity: 2,
    customer: {
      customerName: "Chị COD Test",
      phone: phoneFor("002"),
      shippingAddress: "18 Nguyen Trai, Quan 5, TP.HCM",
    },
    firstCustomerLine: "Chị lấy 2 áo thun, cho ship COD được không?",
    collectLine: "Được chị. Chị gửi SĐT + địa chỉ, em lên đơn COD không cần chuyển khoản trước.",
    confirmationLine: "Chị lấy 2 áo, giao 18 Nguyễn Trãi Q5, số 0900000002.",
    afterOrderBot: (order) => `Em tạo đơn COD ${order.orderNumber} rồi, tổng ${money(Number(order.amount))}. Em đặt vận đơn thu hộ cho chị.`,
    fulfillmentTool: "vclaw.shipping.create_ghn_order",
    fulfillmentArgs: {},
  });
}

async function runDigitalEmail(): Promise<ScenarioResult> {
  return runScenario({
    id: "digital-email",
    title: "Sản phẩm online gửi qua email, bắt buộc thu tiền trước",
    productCode: "SIM-DIGITAL-EMAIL",
    quantity: 1,
    customer: {
      customerName: "Anh Digital Test",
      phone: phoneFor("003"),
      email: `${runId.toLowerCase()}-digital@example.com`,
    },
    firstCustomerLine: "Anh mua voucher online, gửi qua email nhé.",
    collectLine: "Dạ voucher gửi email nên thanh toán trước. Anh gửi SĐT + email nhận voucher.",
    confirmationLine: "SĐT 0900000003, email digital@example.com.",
    afterOrderBot: (order) => order.qrUrl
      ? `Em tạo đơn ${order.orderNumber}. Anh chuyển ${money(Number(order.amount))} đúng nội dung ${order.transferNote}, gửi bill xong em xuất voucher qua email.\n${order.qrUrl}`
      : `Em tạo đơn ${order.orderNumber}, nhưng shop chưa có QR. Em chuyển nhân viên gửi thông tin thanh toán.`,
    afterVerifiedBot: "Bill khớp rồi anh. Em tạo yêu cầu gửi voucher qua email ngay.",
    fulfillmentTool: "vclaw.digital.fulfill_email",
    fulfillmentArgs: {},
  });
}

async function runThirdPartyTicket(): Promise<ScenarioResult> {
  return runScenario({
    id: "third-party-ticket",
    title: "Sản phẩm bán hộ bên thứ ba, xuất vé qua email",
    productCode: "SIM-THIRD-PARTY",
    quantity: 1,
    customer: {
      customerName: "Chị Partner Test",
      phone: phoneFor("004"),
      email: `${runId.toLowerCase()}-partner@example.com`,
    },
    firstCustomerLine: "Chị lấy vé đối tác, xuất vé qua email giúp chị.",
    collectLine: "Dạ vé đối tác cần thanh toán trước. Chị gửi SĐT + email nhận vé, em lên đơn.",
    confirmationLine: "SĐT 0900000004, email partner@example.com.",
    afterOrderBot: (order) => order.qrUrl
      ? `Em tạo đơn ${order.orderNumber}. Chị chuyển ${money(Number(order.amount))} đúng nội dung ${order.transferNote}, gửi bill xong em xuất vé qua đối tác.\n${order.qrUrl}`
      : `Em tạo đơn ${order.orderNumber}, nhưng shop chưa có QR. Em chuyển nhân viên gửi thông tin thanh toán.`,
    afterVerifiedBot: "Bill khớp rồi chị. Em gửi đơn sang đối tác xuất vé.",
    fulfillmentTool: "vclaw.third_party.create_order",
    fulfillmentArgs: { provider: "SIM_PARTNER" },
  });
}

async function runScenario(config: {
  id: string;
  title: string;
  productCode: string;
  quantity: number;
  customer: Record<string, string>;
  firstCustomerLine: string;
  collectLine: string;
  confirmationLine: string;
  afterOrderBot: (order: ToolResult) => string;
  afterVerifiedBot?: string;
  fulfillmentTool: "vclaw.shipping.create_ghn_order" | "vclaw.digital.fulfill_email" | "vclaw.third_party.create_order";
  fulfillmentArgs: Record<string, unknown>;
}): Promise<ScenarioResult> {
  const transcript: TranscriptLine[] = [];
  const toolCalls: ScenarioResult["toolCalls"] = [];
  const findings: string[] = [];

  transcript.push({ role: "customer", text: config.firstCustomerLine });
  const productList = await callTool("vclaw.product.list", { query: config.productCode }, toolCalls);
  const products = Array.isArray(productList.result?.products) ? productList.result.products : [];
  const product = products[0] as { name?: string; price?: number } | undefined;
  transcript.push({
    role: "tool",
    text: shortTool("vclaw.product.list", productList),
  });
  transcript.push({
    role: "bot",
    text: `${product?.name ?? config.productCode} giá ${money(product?.price ?? 0)}. ${config.collectLine}`,
  });

  transcript.push({ role: "customer", text: config.confirmationLine });
  const item = JSON.stringify([{ productCode: config.productCode, quantity: config.quantity }]);
  const checkoutMissing = await callTool("vclaw.checkout.prepare", { items: item }, toolCalls);
  transcript.push({ role: "tool", text: shortTool("vclaw.checkout.prepare", checkoutMissing) });

  const checkoutReadyArgs = {
    items: item,
    customerName: config.customer.customerName,
    phone: config.customer.phone,
    email: config.customer.email,
    shippingAddress: config.customer.shippingAddress,
  };
  const checkoutReady = await callTool("vclaw.checkout.prepare", checkoutReadyArgs, toolCalls);
  transcript.push({ role: "tool", text: shortTool("vclaw.checkout.prepare", checkoutReady) });

  const orderCreate = await callTool("vclaw.order.create", {
    customerName: config.customer.customerName,
    phone: config.customer.phone,
    email: config.customer.email,
    shippingAddress: config.customer.shippingAddress,
    amount: Number(checkoutReady.result?.totalAmount ?? (product?.price ?? 0) * config.quantity),
    items: item,
    channel: "Simulation",
  }, toolCalls);
  transcript.push({ role: "tool", text: shortTool("vclaw.order.create", orderCreate) });

  if (!orderCreate.ok) {
    findings.push(`Không tạo được đơn: ${orderCreate.error}`);
    transcript.push({ role: "bot", text: "Em chưa lên được đơn, để shop kiểm tra lại cấu hình sản phẩm." });
    return finishScenario(config, transcript, toolCalls, findings, undefined);
  }

  const orderInfo = orderCreate.result ?? {};
  transcript.push({ role: "bot", text: config.afterOrderBot(orderInfo) });

  if (orderInfo.paymentMode === "PREPAID") {
    transcript.push({ role: "customer", text: "Khách gửi ảnh bill chuyển khoản." });
    const verify = await callTool("vclaw.payment.verify_bill", { paymentId: orderInfo.orderId }, toolCalls);
    transcript.push({ role: "tool", text: shortTool("vclaw.payment.verify_bill", verify) });
    transcript.push({ role: "bot", text: config.afterVerifiedBot ?? "Bill khớp rồi, em xử lý bước giao hàng tiếp theo." });
    if (!verify.ok) findings.push(`Verify bill lỗi: ${verify.error}`);
  }

  const fulfill = await callTool(config.fulfillmentTool, {
    orderId: orderInfo.orderId,
    email: config.customer.email,
    ...config.fulfillmentArgs,
  }, toolCalls);
  const fulfillOk = fulfill.ok && fulfill.result?.success !== false;
  transcript.push({ role: "tool", text: shortTool(config.fulfillmentTool, fulfill) });
  transcript.push({
    role: "bot",
    text: fulfillOk
      ? fulfillmentSuccessText(config.fulfillmentTool)
      : `Em đã ghi nhận đơn, bước giao/xuất đang cần shop xử lý thêm: ${fulfill.error ?? fulfill.result?.message ?? "shop cần kiểm tra"}`,
  });
  if (!fulfillOk) {
    findings.push(`Fulfillment chưa hoàn tất: ${fulfill.error ?? fulfill.result?.message ?? "unknown"}`);
  }
  if (orderInfo.paymentMode === "COD" && orderInfo.qrUrl) {
    findings.push("Lỗi nghiêm trọng: đơn COD vẫn trả qrUrl.");
  }
  if (orderInfo.paymentMode === "PREPAID" && orderInfo.nextTool !== "vclaw.payment.verify_bill") {
    findings.push(`Risk: đơn prepaid trả nextTool=${orderInfo.nextTool}, đáng ra phải verify bill trước.`);
  }

  return finishScenario(config, transcript, toolCalls, findings, String(orderInfo.orderId ?? ""));
}

async function finishScenario(
  config: { id: string; title: string; productCode: string },
  transcript: TranscriptLine[],
  toolCalls: ScenarioResult["toolCalls"],
  findings: string[],
  orderId?: string,
): Promise<ScenarioResult> {
  const order = orderId
    ? await prisma.order.findUnique({
      where: { id: orderId },
      include: { customer: true, items: { include: { product: true } }, payments: true },
    })
    : null;
  const tasks = order
    ? await prisma.task.findMany({
      where: {
        OR: [
          { title: { contains: order.orderNumber } },
          { subtitle: { contains: order.orderNumber } },
        ],
      },
      orderBy: { createdAt: "desc" },
    })
    : [];

  return {
    id: config.id,
    title: config.title,
    productCode: config.productCode,
    transcript,
    toolCalls,
    order,
    payments: order?.payments ?? [],
    tasks,
    findings,
  };
}

async function callTool(
  name: string,
  args: Record<string, unknown>,
  toolCalls: ScenarioResult["toolCalls"],
): Promise<ToolOutput> {
  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      authorization: `Bearer ${process.env.VCLAW_AGENT_TOOLS_SECRET}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ tool: name, arguments: args }),
  });
  const out = await res.json() as ToolOutput;
  toolCalls.push({ name, args, out });
  return out;
}

function renderReport(input: {
  runId: string;
  endpoint: string;
  shopSettings: { hasBank: boolean; hasGhn: boolean };
  results: ScenarioResult[];
}) {
  const findings = input.results.flatMap(result => result.findings.map(finding => `${result.id}: ${finding}`));
  return `# VClaw Sales Policy Simulation - ${input.runId}

Ngày chạy: 2026-05-07

## Phạm vi

- Mô phỏng deterministic theo prompt/tool contract hiện tại, không gọi LLM để tránh kết quả không lặp lại.
- Có gọi tool thật qua \`${input.endpoint}\`.
- DB live được seed/đọc trực tiếp: \`${liveDbPath}\`.
- Có ghi DB thật: tạo/cập nhật sản phẩm test, khách test, đơn hàng, payment, task fulfillment.
- Sản phẩm test dùng prefix \`SIM-\`, khách test dùng SĐT \`${phoneFor("001")}\`...\`${phoneFor("004")}\`.

## Cấu hình shop tại thời điểm chạy

- Ngân hàng/VietQR: ${input.shopSettings.hasBank ? "có cấu hình" : "chưa cấu hình"}
- GHN: ${input.shopSettings.hasGhn ? "có token/shopId" : "chưa đủ token/shopId"}

## Kết luận nhanh

${findings.length > 0 ? findings.map(f => `- ${f}`).join("\n") : "- Không thấy lỗi policy nghiêm trọng trong các luồng được mô phỏng."}

${input.results.map(renderScenario).join("\n\n")}
`;
}

function renderScenario(result: ScenarioResult) {
  return `## ${result.title}

Sản phẩm: \`${result.productCode}\`

### Hội thoại mô phỏng

${result.transcript.map(line => `- **${line.role}**: ${line.text}`).join("\n")}

### Tool calls

${result.toolCalls.map(call => {
  const summary = call.out.ok
    ? summarizeToolResult(call.name, call.out.result)
    : `ERROR ${call.out.error}`;
  return `- \`${call.name}\` args=${inlineJson(call.args)} -> ${summary}`;
}).join("\n")}

### DB được tạo/cập nhật

${result.order ? renderOrder(result.order, result.payments, result.tasks) : "- Không có order được tạo."}

### Phân tích

${result.findings.length > 0 ? result.findings.map(finding => `- ${finding}`).join("\n") : "- Luồng đúng policy: bot biết cần thu tiền/giao hàng theo loại sản phẩm, không gọi QR sai cho COD, không fulfillment prepaid trước khi verify bill."}
`;
}

function renderOrder(order: ReportOrder, payments: ReportPayment[], tasks: ReportTask[]) {
  return `- Order: \`${order.orderNumber}\` / id=\`${order.id}\`
- Customer: ${order.customer?.name} / ${order.customer?.phone}
- Amount: ${money(order.amount)}
- Status: \`${order.status}\`
- Fulfillment: \`${order.fulfillmentType}\` / \`${order.fulfillmentStatus}\`
- Shipping address: ${order.shippingAddress ?? "(none)"}
- Items: ${order.items.map((item) => `${item.product?.productCode} x${item.quantity} (${money(item.price)})`).join(", ")}
- Payments: ${payments.map(payment => `\`${payment.method}:${payment.status}:${money(payment.amount)}\``).join(", ") || "(none)"}
- Tasks: ${tasks.map(task => `\`${task.type}:${task.status}:${task.title}\``).join(", ") || "(none)"}`;
}

function summarizeToolResult(name: string, result: ToolResult | undefined) {
  if (!result) return "ok";
  if (name === "vclaw.product.list") return `count=${result.count}`;
  if (name === "vclaw.checkout.prepare") {
    return `nextAction=${result.nextAction}, canCreateOrder=${result.canCreateOrder}, missing=${JSON.stringify(result.missingFields)}`;
  }
  if (name === "vclaw.order.create") {
    return `order=${result.orderNumber}, paymentMode=${result.paymentMode}, fulfillmentMode=${result.fulfillmentMode}, hasQr=${Boolean(result.qrUrl)}, nextTool=${result.nextTool}`;
  }
  if (name === "vclaw.payment.verify_bill") return `nextAction=${result.nextAction}`;
  if (name === "vclaw.shipping.create_ghn_order") return `success=${result.success}, message=${result.message ?? ""}`;
  return inlineJson(result);
}

function shortTool(name: string, out: ToolOutput) {
  return out.ok ? `${name}: ${summarizeToolResult(name, out.result)}` : `${name}: ERROR ${out.error}`;
}

function fulfillmentSuccessText(tool: string) {
  if (tool === "vclaw.shipping.create_ghn_order") return "Em đã chuyển đơn sang vận chuyển.";
  if (tool === "vclaw.digital.fulfill_email") return "Em đã tạo yêu cầu gửi hàng qua email.";
  return "Em đã gửi đơn sang đối tác xử lý.";
}

function inlineJson(value: unknown) {
  return JSON.stringify(value).replace(/\s+/g, " ").slice(0, 500);
}

function money(value: number) {
  return `${Number(value || 0).toLocaleString("vi-VN")}đ`;
}

function phoneFor(suffix: string) {
  return `09${runId.slice(-5)}${suffix}`.slice(0, 10);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
