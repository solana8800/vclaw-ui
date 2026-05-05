import "server-only";
import { prisma } from "@/lib/db";
import { executeVclawAgentTool } from "@/lib/ai/tools";
import type { Product } from "@prisma/client";
import type { CustomerWithOrders } from "@/lib/ai/enrichment-context";
import {
  ENRICHMENT_ACTION_ORDER_CREATED,
  ENRICHMENT_ACTION_QR_GENERATED,
  ENRICHMENT_ACTION_ORDER_FAILED,
  ENRICHMENT_ACTION_DUPLICATE_ORDER,
  ENRICHMENT_ACTION_PAYMENT_REQUESTED,
  ENRICHMENT_ACTION_PAYMENT_PROCESSING,
} from "@/lib/ai/prompts/enrichment-prompts";

export type DetectedItem = { name: string; qty: number; price: number };

export type ProductMatchResult = {
  items: DetectedItem[];
  totalAmount: number;
  matchedNames: string[];
  matchType: "full" | "keywords" | "none";
};

const MAX_AUTO_ORDER_QTY = 50;

export function removeAccents(str: string): string {
  return str
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase();
}

/** Bắt số lượng an toàn: tránh `iPhone\\s*(\\d+)` lấy nhầm "16" từ tên máy. */
function extractQtyForProduct(userMessage: string, productName: string): number {
  const firstWord = productName.trim().split(/\s+/)[0] || "x";
  const fwNorm = removeAccents(firstWord);
  if (!fwNorm) return 1;
  const fwEsc = firstWord.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const nMsg = removeAccents(userMessage);

  const reBefore = new RegExp(
    `(\\d{1,3})\\s*(?:cai|chiec|suat|ve|ban|goi|hop|cap)?\\s*${fwEsc}`,
    "i"
  );
  const mBefore =
    userMessage.match(reBefore) ??
    nMsg.match(new RegExp(`(\\d{1,3})\\s*(?:cai|chiec|suat|ve|ban|goi|hop|cap)?\\s*${fwNorm}`, "i"));
  if (mBefore) {
    const q = parseInt(mBefore[1], 10);
    if (Number.isFinite(q) && q > 0) return Math.min(MAX_AUTO_ORDER_QTY, q);
  }

  const reAfter = new RegExp(`${fwEsc}\\s*(\\d{1,3})`, "i");
  const mAfter =
    userMessage.match(reAfter) ??
    nMsg.match(new RegExp(`${fwNorm}\\s*(\\d{1,3})`, "i"));
  if (mAfter) {
    const q = parseInt(mAfter[1], 10);
    if (!Number.isFinite(q) || q <= 0) return 1;
    if (fwNorm === "iphone" && q >= 4 && q <= 17) return 1;
    return Math.min(MAX_AUTO_ORDER_QTY, q);
  }

  return 1;
}

export function detectProducts(
  normalizedMsg: string,
  userMessage: string,
  products: Product[]
): ProductMatchResult {
  type Candidate = { p: Product; via: "full" | "keywords" };
  const candidates: Candidate[] = [];

  for (const p of products) {
    const pNameNorm = removeAccents(p.name);
    const pNameClean = pNameNorm.replace(/\(.*\)/g, "").trim();
    const keywords = pNameClean
      .split(/\s+/)
      .filter(w => w.length >= 2 && !["ve", "cap", "treo", "hills", "suat", "world", "sun"].includes(w));

    const isFull =
      pNameNorm.includes(normalizedMsg) ||
      normalizedMsg.includes(pNameNorm) ||
      (pNameClean.length >= 12 && normalizedMsg.includes(pNameClean));
    const isKw = keywords.length > 0 && keywords.every(kw => normalizedMsg.includes(kw));

    console.debug(`[vclaw:product-match] "${p.name}" full:${isFull} kw:${isKw}`);

    if (isFull || isKw) candidates.push({ p, via: isFull ? "full" : "keywords" });
  }

  if (candidates.length === 0) {
    return { items: [], totalAmount: 0, matchedNames: [], matchType: "none" };
  }

  // Ưu tiên full match; nếu nhiều keyword match thì lấy tên dài nhất
  let picks = candidates;
  const fullPicks = candidates.filter(m => m.via === "full");
  if (fullPicks.length >= 1) {
    picks = fullPicks;
  } else if (picks.length > 1) {
    picks = [...picks].sort((a, b) => removeAccents(b.p.name).length - removeAccents(a.p.name).length);
    picks = [picks[0]];
  }

  const items: DetectedItem[] = [];
  let totalAmount = 0;
  for (const { p } of picks) {
    const qty = extractQtyForProduct(userMessage, p.name);
    items.push({ name: p.name, qty, price: p.price });
    totalAmount += p.price * qty;
  }

  return {
    items,
    totalAmount,
    matchedNames: picks.map(m => m.p.name),
    matchType: fullPicks.length >= 1 ? "full" : "keywords",
  };
}

const BUY_INTENT_KEYWORDS = [
  "mua", "dat hang", "chot", "lay hang", "ship den", "giao den",
  "giao hang", "order", "thanh toan", "ck luon", "chuyen khoan",
];

export function detectBuyIntent(normalizedMsg: string): boolean {
  return (
    BUY_INTENT_KEYWORDS.some(kw => normalizedMsg.includes(kw)) ||
    normalizedMsg.includes("dia chi") ||
    normalizedMsg.includes("ship")
  );
}

const PAYMENT_CONFIRM_KEYWORDS = ["da thanh toan", "da ck", "da chuyen khoan", "da gui tien"];

export function detectPaymentConfirm(normalizedMsg: string): boolean {
  return PAYMENT_CONFIRM_KEYWORDS.some(kw => normalizedMsg.includes(kw));
}

export async function executeOrderAction(params: {
  items: DetectedItem[];
  totalAmount: number;
  phone: string;
  currentCustomer: CustomerWithOrders | null;
  userMessage: string;
  source: "admin" | "zalo";
}): Promise<string[]> {
  const { items, totalAmount, phone, currentCustomer, userMessage, source } = params;
  const actionResults: string[] = [];

  // Dedup: tránh tạo đơn trùng trong vòng 60 giây cùng amount
  let recentCheckCustomerId = currentCustomer?.id as string | undefined;
  if (!recentCheckCustomerId && phone) {
    const byPhone = await prisma.customer.findFirst({ where: { phone } });
    recentCheckCustomerId = byPhone?.id;
  }

  const recentOrder =
    recentCheckCustomerId != null
      ? await prisma.order.findFirst({
          where: {
            customerId: recentCheckCustomerId,
            amount: totalAmount,
            createdAt: { gte: new Date(Date.now() - 60 * 1000) },
          },
        })
      : null;

  if (recentOrder) {
    console.info(
      "[vclaw:enrichment-action] đơn trùng lặp phát hiện",
      JSON.stringify({ orderNumber: recentOrder.orderNumber, amount: totalAmount, phone })
    );
    actionResults.push(ENRICHMENT_ACTION_DUPLICATE_ORDER(recentOrder.orderNumber));
    return actionResults;
  }

  const addrMatch = userMessage.match(/(?:dia chi|tai|ship den|o)[:\s]+([^,.\n]+)/i);
  const address = addrMatch ? addrMatch[1].trim() : "Giao tận nơi";

  console.info(
    "[vclaw:enrichment-action] tạo đơn",
    JSON.stringify({
      items: items.map(i => `${i.name} x${i.qty}`),
      totalAmount,
      phone,
      address,
      channel: source,
    })
  );

  const orderRes = await executeVclawAgentTool("vclaw.order.create", {
    customerName: currentCustomer?.name || "Khách Zalo",
    phone,
    amount: totalAmount,
    items,
    shippingNote: address,
    channel: source === "zalo" ? "Zalo" : "Admin",
  });

  if (orderRes.ok && orderRes.result) {
    const orderInfo = orderRes.result as { orderNumber: string; orderId: string; qrUrl?: string };
    console.info(
      "[vclaw:enrichment-action] đơn tạo thành công",
      JSON.stringify({ orderNumber: orderInfo.orderNumber, hasQr: !!orderInfo.qrUrl })
    );
    actionResults.push(ENRICHMENT_ACTION_ORDER_CREATED(orderInfo.orderNumber, totalAmount));

    if (orderInfo.qrUrl) {
      actionResults.push(ENRICHMENT_ACTION_QR_GENERATED(orderInfo.qrUrl));
    } else {
      // Fallback sinh QR nếu order.create chưa trả về
      const qrRes = await executeVclawAgentTool("vclaw.payment.generate_qr", {
        amount: totalAmount,
        phone,
        orderId: orderInfo.orderId,
      });
      if (qrRes.ok && qrRes.result) {
        const qrInfo = qrRes.result as { qrUrl: string };
        console.info(
          "[vclaw:enrichment-action] QR fallback thành công",
          JSON.stringify({ qrUrl: qrInfo.qrUrl })
        );
        actionResults.push(ENRICHMENT_ACTION_QR_GENERATED(qrInfo.qrUrl));
      } else {
        console.warn(
          "[vclaw:enrichment-action] QR fallback thất bại",
          JSON.stringify({ error: qrRes.error })
        );
      }
    }
  } else {
    console.error(
      "[vclaw:enrichment-action] tạo đơn thất bại",
      JSON.stringify({ error: orderRes.error, phone, totalAmount })
    );
    actionResults.push(ENRICHMENT_ACTION_ORDER_FAILED(String(orderRes.error)));
  }

  return actionResults;
}

export async function executePaymentAction(customer: CustomerWithOrders): Promise<string[]> {
  const pendingOrder = await prisma.order.findFirst({
    where: { customerId: customer.id, status: "PENDING" },
    orderBy: { createdAt: "desc" },
  });

  if (!pendingOrder) return [];

  await prisma.order.update({
    where: { id: pendingOrder.id },
    data: { status: "PROCESSING" },
  });

  console.info(
    "[vclaw:enrichment-action] xác nhận thanh toán",
    JSON.stringify({
      orderNumber: pendingOrder.orderNumber,
      amount: pendingOrder.amount,
      customerId: customer.id,
    })
  );

  return [
    ENRICHMENT_ACTION_PAYMENT_REQUESTED(pendingOrder.orderNumber),
    ENRICHMENT_ACTION_PAYMENT_PROCESSING(pendingOrder.orderNumber, pendingOrder.amount),
  ];
}
