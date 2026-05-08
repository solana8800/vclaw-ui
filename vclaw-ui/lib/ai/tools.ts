import "server-only";
import { prisma } from "@/lib/db";
import { revalidateAdminPaths } from "@/lib/admin/revalidate";
import { generateVietQRUrl } from "@/lib/vietqr";
import { verifyPaymentBill } from "@/lib/actions/payment-actions";
import { createGhnOrder } from "@/lib/logistics/ghn-order";
import { getShippingEstimates, normalizeAddress } from "@/lib/logistics/shipping";
import { getOrderWithOptionalProducts, newOrderNumber } from "@/lib/commerce/orders";
import { rankCatalogProductsForQuery } from "@/lib/ai/product-search";
import { getSalesPersona, SALES_GUIDELINES_RULES, TOOL_NOTE_CATALOG } from "@/lib/ai/prompts/sales-prompts";
import {
  nextToolAfterOrderCreate,
  prepareCheckout,
  type CheckoutCustomerInput,
  type CheckoutItemInput,
  type ProductPolicySource,
} from "@/lib/commerce/product-policy";
import { getApprovalConfig } from "@/lib/automation/approval-config";

async function logTool(tool: string, payload: unknown, ok: boolean, error?: string) {
  try {
    await prisma.agentToolLog.create({
      data: {
        tool,
        payload: JSON.stringify(payload).slice(0, 8000),
        ok,
        error: error?.slice(0, 2000) ?? null,
      },
    });
  } catch {
    // ignore log failures
  }
}

/**
 * Thực thi tool bán hàng — chỉ dành cho bot/gateway qua VCLAW_AGENT_TOOLS_SECRET.
 * Admin dùng API routes riêng, không qua đây.
 */
export async function executeVclawAgentTool(
  name: string,
  args: Record<string, unknown>,
): Promise<{ ok: boolean; result?: unknown; error?: string }> {
  const payload = { name, args };
  const t0 = Date.now();
  console.info("[vclaw:tool] gọi →", name, JSON.stringify(summarizeArgs(args)));
  try {
    let result: unknown;
    switch (name) {

      // ── Khách hàng ──────────────────────────────────────────────────────────
      case "vclaw.customer.upsert": {
        const customerName = String(args.customerName ?? "").trim();
        const phone = args.phone ? String(args.phone).trim() : null;
        const channel = args.channel ? String(args.channel) : "Zalo";
        const externalId = args.externalId ? String(args.externalId) : null;
        const gender = args.gender ? String(args.gender).trim() : null;
        const preferredName = args.preferredName ? String(args.preferredName).trim() : null;

        if (!customerName && !phone && !externalId) throw new Error("missing_name_or_phone_or_externalId");

        let customer = null;
        if (phone) {
          customer = await prisma.customer.findFirst({ where: { phone } });
        }
        if (!customer && externalId) {
          const conv = await prisma.conversation.findFirst({
            where: { externalThreadId: externalId, customerId: { not: null } }
          });
          if (conv?.customerId) {
            customer = await prisma.customer.findUnique({ where: { id: conv.customerId } });
          }
        }

        const emailArg = args.email ? String(args.email).trim() : null;

        if (!customer) {
          customer = await prisma.customer.create({
            data: {
              name: customerName || "Khách",
              phone,
              email: emailArg,
              channel,
              ...(gender ? { gender } : {}),
              ...(preferredName ? { preferredName } : {}),
            },
          });
        } else {
          customer = await prisma.customer.update({
            where: { id: customer.id },
            data: {
              ...(customerName ? { name: customerName } : {}),
              ...(emailArg ? { email: emailArg } : {}),
              ...(gender ? { gender } : {}),
              ...(preferredName ? { preferredName } : {}),
              ...(phone ? { phone } : {}),
            },
          });
        }

        if (externalId) {
          await prisma.conversation.updateMany({
            where: { externalThreadId: externalId, customerId: null },
            data: { customerId: customer.id },
          });
        }

        revalidateAdminPaths();
        result = { customerId: customer.id, customerName: customer.name, phone: customer.phone, email: customer.email, gender: customer.gender, preferredName: customer.preferredName };
        break;
      }

      // ── Sản phẩm ─────────────────────────────────────────────────────────────
      case "vclaw.product.list": {
        const query = args.query ? String(args.query).trim() : "";
        const allProducts = await prisma.product.findMany({
          where: { status: "ACTIVE" },
          select: { id: true, name: true, price: true, category: true, description: true, imageUrl: true, images: true, productCode: true, type: true, metadata: true, commercePolicyJson: true },
          orderBy: { updatedAt: "desc" },
          take: 100,
        });
        const products = query
          ? rankCatalogProductsForQuery(allProducts, query)
          : allProducts;
        const productsWithPolicy = products.map((product) => {
          const checkout = prepareCheckout({ items: [{ product, quantity: 1 }], customer: {} });
          return {
            ...product,
            commercePolicy: checkout.items[0]?.policy,
            checkoutHint: {
              requiredCustomerFields: checkout.items[0]?.policy.requiredCustomerFields ?? [],
              paymentMode: checkout.paymentMode,
              fulfillmentMode: checkout.fulfillmentMode,
              nextAction: checkout.nextAction,
            },
          };
        });
        result = {
          products: productsWithPolicy,
          count: productsWithPolicy.length,
          empty: products.length === 0,
          instruction: products.length === 0
            ? "Catalog rỗng: không được tự nghĩ sản phẩm, giá, combo hay tồn kho. Nói shop đang cập nhật danh mục và xin SĐT/nhu cầu để báo lại."
            : `${TOOL_NOTE_CATALOG} Đọc imageUrl/images cùng commercePolicy/checkoutHint. Chỉ gửi ảnh khi URL được copy nguyên văn từ đúng dòng sản phẩm đang tư vấn; cấm tự bịa URL ảnh hoặc lấy ảnh sản phẩm khác. Ảnh sai sản phẩm là lỗi nghiêm trọng.`,
        };
        break;
      }

      case "vclaw.checkout.prepare": {
        const checkoutItems = await resolveCheckoutItems(args.items);
        const customer = checkoutCustomerFromArgs(args);
        const checkout = prepareCheckout({ items: checkoutItems, customer });
        result = {
          ...checkout,
          instruction: `${checkout.instruction} Bot chỉ được gọi vclaw.order.create khi canCreateOrder=true.`,
        };
        break;
      }

      // ── Đơn hàng ─────────────────────────────────────────────────────────────
      case "vclaw.order.create": {
        const customerName = String(args.customerName ?? "Khách").trim() || "Khách";
        const phone = args.phone != null ? String(args.phone).trim() || null : null;
        const email = args.email ? String(args.email).trim() : null;
        let amount = Number(args.amount);
        const status = String(args.status ?? "PENDING").toUpperCase();
        const shippingAddress = String(args.shippingAddress ?? args.shippingNote ?? "").trim() || null;

        let shippingNote = shippingAddress || null;
        if (args.items) {
          const itemsStr = typeof args.items === "string" ? args.items : JSON.stringify(args.items);
          shippingNote = shippingAddress ? `${shippingAddress}\n[items]${itemsStr}` : `[items]${itemsStr}`;
        }

        let orderItemsData: { productId: string; quantity: number; price: number }[] = [];
        let checkout = null as ReturnType<typeof prepareCheckout> | null;
        try {
          if (args.items) {
            const checkoutItems = await resolveCheckoutItems(args.items);
            checkout = prepareCheckout({
              items: checkoutItems,
              customer: {
                name: customerName,
                phone,
                email,
                address: shippingAddress,
              },
            });
            if (checkout.nextAction === "SPLIT_ORDER_BY_POLICY") {
              throw new Error("split_order_by_policy_required");
            }
            if (checkout.missingFields.length > 0) {
              throw new Error(`missing_customer_fields:${checkout.missingFields.join(",")}`);
            }
            if (checkout.nextAction === "MANUAL_REVIEW") {
              throw new Error("manual_review_required_for_product_policy");
            }
            amount = checkout.totalAmount;
            orderItemsData = checkout.items.map(item => ({
              productId: item.productId,
              quantity: item.quantity,
              price: item.price,
            }));
          }
        } catch (e) {
          const message = e instanceof Error ? e.message : String(e);
          console.error("Lỗi xử lý policy/order items:", message);
          throw e;
        }

        if (!Number.isFinite(amount) || amount <= 0) throw new Error("invalid_amount");

        let customer = phone ? await prisma.customer.findFirst({ where: { phone } }) : null;
        if (!customer) {
          customer = await prisma.customer.create({
            data: {
              name: customerName,
              phone,
              email: email || null,
              shippingAddress: shippingAddress || null,
              channel: args.channel ? String(args.channel) : "Zalo",
            },
          });
        } else {
          const updateData: Record<string, unknown> = {};
          if (customerName && customer.name !== customerName) updateData.name = customerName;
          if (email && !customer.email) updateData.email = email;
          if (shippingAddress && !customer.shippingAddress) updateData.shippingAddress = shippingAddress;
          if (Object.keys(updateData).length > 0) {
            customer = await prisma.customer.update({ where: { id: customer.id }, data: updateData });
          }
        }

        const paymentMode = checkout?.paymentMode ?? "PREPAID";
        const fulfillmentMode = checkout?.fulfillmentMode ?? "GHN_SHIPPING";
        const requiresPrepaid = checkout?.requiresPaymentBeforeFulfillment ?? true;
        const orderStatus = paymentMode === "COD"
          ? "PROCESSING"
          : ["PENDING", "PAID", "PROCESSING", "DONE", "FOLLOW_UP"].includes(status)
            ? status
            : "PENDING";
        const fulfillmentStatus = requiresPrepaid ? "PENDING_PAYMENT" : "READY_TO_FULFILL";
        const orderNumber = await newOrderNumber();
        const order = await prisma.order.create({
          data: {
            orderNumber,
            customerId: customer.id,
            amount,
            status: orderStatus,
            fulfillmentType: fulfillmentMode,
            fulfillmentStatus,
            shippingAddress,
            shippingNote,
            items: orderItemsData.length > 0 ? {
              create: orderItemsData.map(item => ({
                productId: item.productId,
                quantity: item.quantity,
                price: item.price,
              }))
            } : undefined,
            payments: paymentMode === "MANUAL_REVIEW" ? undefined : {
              create: {
                amount,
                status: paymentMode === "COD" ? "COD_PENDING" : "PENDING",
                method: paymentMode === "COD" ? "COD" : "BANK_TRANSFER",
              },
            },
          },
        });
        revalidateAdminPaths();

        const settings = await prisma.shopSettings.findFirst();
        let qrUrl: string | null = null;
        const cleanOrderNumber = orderNumber.replace(/\s+/g, "");
        const cleanPhone = (phone || "").replace(/\s+/g, "");
        let itemParts: string[] = [];
        try {
          if (args.items) {
            const parsedItems = typeof args.items === "string" ? JSON.parse(args.items) : args.items;
            if (Array.isArray(parsedItems) && parsedItems.length > 0) {
              const firstItem = parsedItems[0];
              const pCode = (firstItem.productCode || firstItem.sku || firstItem.name || "SP")
                .replace(/[\s-]+/g, "").slice(0, 10).toUpperCase();
              const pQty = firstItem.qty || firstItem.quantity || 1;
              itemParts = [pCode, `x${pQty}`];
            }
          }
        } catch (e) {
          console.error("Lỗi parse items khi tạo transferNote:", e);
        }

        const transferNote = [cleanOrderNumber, cleanPhone, ...itemParts]
          .filter(p => !!p && p.trim() !== "")
          .join(" ")
          .slice(0, 50);

        if (paymentMode === "PREPAID" && settings?.bankName && settings?.accountNumber) {
          try {
            qrUrl = generateVietQRUrl({
              bankId: settings.bankName.toLowerCase(),
              accountNo: settings.accountNumber,
              accountName: settings.accountHolder || "",
              amount: amount > 0 ? amount : undefined,
              description: transferNote,
            });
          } catch (qrErr) {
            console.error("Lỗi sinh QR:", qrErr);
          }
        }

        result = {
          orderId: order.id,
          orderNumber: order.orderNumber,
          customerId: customer.id,
          amount,
          transferNote,
          qrUrl,
          paymentMode,
          fulfillmentMode,
          requiresPaymentBeforeFulfillment: requiresPrepaid,
          nextTool: nextToolAfterOrderCreate({ paymentMode, fulfillmentMode }),
          message: paymentMode === "COD"
            ? `Đơn hàng COD ${orderNumber} đã được tạo. Không cần QR; bước tiếp theo là tạo vận đơn thu hộ.`
            : qrUrl
              ? `Đơn hàng ${orderNumber} đã được tạo. Nội dung CK BẮT BUỘC: "${transferNote}". Link QR: ${qrUrl}`
              : `Đơn hàng ${orderNumber} đã được tạo thành công.`,
          instruction: paymentMode === "COD"
            ? "Đơn COD: không gửi QR. Xác nhận địa chỉ rồi gọi vclaw.shipping.create_ghn_order."
            : qrUrl
            ? `BẮT BUỘC: Copy đúng chuỗi "${transferNote}" làm nội dung CK và gửi link QR ở dòng cuối.`
            : "LƯU Ý: Shop chưa cấu hình ngân hàng nên không có mã QR.",
        };
        break;
      }

      // ── Thanh toán ───────────────────────────────────────────────────────────
      case "vclaw.payment.generate_qr": {
        const amount = Number(args.amount);
        const settings = await prisma.shopSettings.findFirst();

        if (!settings?.bankName || !settings?.accountNumber) {
          throw new Error("shop_bank_info_not_configured");
        }

        let finalDesc = String(args.description ?? "").trim();
        if (args.orderId) {
          const ord = await prisma.order.findUnique({
            where: { id: String(args.orderId) },
            include: { customer: true, payments: true },
          });
          if (ord?.payments.some(payment => payment.method === "COD")) {
            throw new Error("cod_order_does_not_need_qr");
          }
          if (ord) {
            let itemInfo = "";
            if (ord.shippingNote?.includes("[items]")) {
              try {
                const itemsStr = ord.shippingNote.split("[items]")[1];
                const items = JSON.parse(itemsStr);
                if (Array.isArray(items) && items.length > 0) {
                  const first = items[0];
                  const code = (first.productCode || first.sku || first.name || "SP")
                    .replace(/\s+/g, "").slice(0, 10).toUpperCase();
                  const qty = first.qty || first.quantity || 1;
                  itemInfo = `${code} x${qty}`;
                }
              } catch {}
            }
            const cleanOrderNumber = ord.orderNumber.replace(/\s+/g, "");
            const cleanPhone = (ord.customer?.phone || "").replace(/\s+/g, "");
            finalDesc = [cleanOrderNumber, cleanPhone, itemInfo]
              .filter(p => !!p && p.trim() !== "")
              .join(" ")
              .slice(0, 50);
          }
        }
        if (!finalDesc) {
          const identifier = String(args.phone || args.zaloId || "").trim().replace(/\s+/g, "");
          finalDesc = `THANHTOAN ${identifier} VCLAW`.trim().slice(0, 50);
        }

        const qrUrl = generateVietQRUrl({
          bankId: settings.bankName.toLowerCase(),
          accountNo: settings.accountNumber,
          accountName: settings.accountHolder || "",
          amount: amount > 0 ? amount : undefined,
          description: finalDesc,
        });

        result = {
          qrUrl,
          transferNote: finalDesc,
          message: `Mã QR thanh toán: ${qrUrl}`,
          instruction: "BẮT BUỘC: Gửi link này cho khách ở DÒNG RIÊNG CUỐI CÙNG của tin nhắn.",
        };
        break;
      }

      case "vclaw.payment.verify_bill": {
        const paymentId = String(args.paymentId ?? "").trim();
        if (!paymentId) throw new Error("missing_paymentId");
        const payment = await findPaymentForVerification(paymentId);
        if (!payment) throw new Error("payment_or_order_not_found");
        const verifyResult = await verifyPaymentBill(payment.id, String(payment.amount));
        const approval = await getApprovalConfig();
        const canAutoApprove = approval.paymentAutoApprove === true;
        if (verifyResult.success && verifyResult.match && canAutoApprove) {
          await prisma.payment.update({
            where: { id: payment.id },
            data: { status: "VERIFIED" },
          });
          await prisma.order.update({
            where: { id: payment.orderId },
            data: { status: "PROCESSING", fulfillmentStatus: "READY_TO_FULFILL" },
          });
          revalidateAdminPaths();
        }
        result = {
          paymentId: payment.id,
          orderId: payment.orderId,
          verifyResult,
          manualReviewRequired: verifyResult.success && verifyResult.match && !canAutoApprove,
          autoApproved: verifyResult.success && verifyResult.match && canAutoApprove,
          nextAction: verifyResult.success && verifyResult.match && canAutoApprove
            ? "FULFILL_ORDER"
            : "MANUAL_PAYMENT_REVIEW",
          instruction: verifyResult.success && verifyResult.match
            ? canAutoApprove
              ? "Bill đã khớp. Gọi tool fulfillment phù hợp với fulfillmentType của đơn."
              : "Bill khớp nhưng Cổng duyệt tự động đang TẮT. Không nói đã xác nhận; báo khách shop đang kiểm tra và chờ admin duyệt."
            : "Bill chưa đủ tin cậy. Chuyển nhân viên kiểm tra, không giao hàng.",
        };
        break;
      }

      // ── Vận chuyển ───────────────────────────────────────────────────────────
      case "vclaw.shipping.quote_from_address": {
        const rawAddress = String(args.rawAddress ?? "").trim();
        if (!rawAddress) throw new Error("missing_rawAddress");
        const weightKg = args.weightKg != null ? Number(args.weightKg) : 0.5;
        const weight = Number.isFinite(weightKg) && weightKg > 0 ? weightKg : 0.5;

        const normalized = await normalizeAddress(rawAddress);
        if (!normalized) throw new Error("address_standardization_failed");

        const quotes = await getShippingEstimates(normalized, { weight });
        result = { normalized, quotes };
        break;
      }

      case "vclaw.shipping.create_ghn_order": {
        const orderId = String(args.orderId ?? "").trim();
        if (!orderId) throw new Error("missing_orderId");
        const order = await getOrderWithOptionalProducts(orderId);
        if (!order) throw new Error("order_not_found");
        ensureOrderCanFulfill(order);
        const ghnResult = await createGhnOrder(orderId);
        if (!ghnResult.success) {
          await createFulfillmentReviewTask({
            orderId: order.id,
            orderNumber: order.orderNumber,
            amount: order.amount,
            type: "SHIPPING_REVIEW",
            title: `Kiểm tra vận chuyển đơn ${order.orderNumber}`,
            subtitle: ghnResult.message ?? "GHN chưa tạo được vận đơn.",
            fulfillmentStatus: "SHIPPING_REVIEW",
          });
          revalidateAdminPaths();
          result = {
            ...ghnResult,
            nextAction: "MANUAL_SHIPPING_REVIEW",
            instruction: "Vận đơn chưa tạo được. Báo khách shop đã ghi nhận và sẽ kiểm tra lại giao hàng; không nói đã chuyển đơn sang vận chuyển.",
          };
          break;
        }
        result = ghnResult;
        break;
      }

      case "vclaw.digital.fulfill_email": {
        const orderId = String(args.orderId ?? "").trim();
        if (!orderId) throw new Error("missing_orderId");
        const order = await getOrderWithOptionalProducts(orderId);
        if (!order) throw new Error("order_not_found");
        ensureOrderCanFulfill(order);
        const email = String(args.email ?? order.customer?.email ?? readEmailFromLabels(order.customer?.labels)).trim();
        if (!email) throw new Error("missing_email");
        await prisma.task.create({
          data: {
            type: "DIGITAL_FULFILLMENT",
            title: `Xuất hàng điện tử cho đơn ${order.orderNumber}`,
            subtitle: `Gửi qua email ${email}`,
            amount: String(order.amount),
            status: "NEW",
            isUrgent: true,
          },
        });
        await prisma.order.update({
          where: { id: order.id },
          data: { fulfillmentStatus: "FULFILLMENT_REQUESTED" },
        });
        revalidateAdminPaths();
        result = {
          orderId: order.id,
          orderNumber: order.orderNumber,
          email,
          message: `Đã tạo yêu cầu xuất hàng điện tử cho đơn ${order.orderNumber}.`,
          instruction: "Báo khách shop đang gửi hàng qua email; không nói đã gửi xong nếu chưa có xác nhận từ hệ thống email/đối tác.",
        };
        break;
      }

      case "vclaw.third_party.create_order": {
        const orderId = String(args.orderId ?? "").trim();
        if (!orderId) throw new Error("missing_orderId");
        const order = await getOrderWithOptionalProducts(orderId);
        if (!order) throw new Error("order_not_found");
        ensureOrderCanFulfill(order);
        await prisma.task.create({
          data: {
            type: "THIRD_PARTY_FULFILLMENT",
            title: `Gửi đơn ${order.orderNumber} sang bên thứ ba`,
            subtitle: String(args.provider ?? "Chưa cấu hình provider"),
            amount: String(order.amount),
            status: "NEW",
            isUrgent: true,
          },
        });
        await prisma.order.update({
          where: { id: order.id },
          data: { fulfillmentStatus: "THIRD_PARTY_REQUESTED" },
        });
        revalidateAdminPaths();
        result = {
          orderId: order.id,
          orderNumber: order.orderNumber,
          message: `Đã tạo yêu cầu xử lý bên thứ ba cho đơn ${order.orderNumber}.`,
          instruction: "Chỉ báo khách đơn đang được xử lý; chưa hứa đã xuất vé/hàng nếu provider chưa trả mã xác nhận.",
        };
        break;
      }

      // ── Automation ──────────────────────────────────────────────────────────
      case "vclaw.automation.run_rules": {
        const { executeHeartbeat } = await import("@/lib/automation/marketing");
        const results = await executeHeartbeat();
        result = {
          ranAt: new Date().toISOString(),
          count: Array.isArray(results) ? results.length : 0,
          results,
          instruction: "Nếu count=0 hoặc toàn bộ kết quả skipped thì không gửi thêm tin nhắn. Nếu có lỗi, ghi nhận vận hành ngắn gọn.",
        };
        break;
      }

      // ── Guidelines ───────────────────────────────────────────────────────────
      case "vclaw.commerce.get_sales_guidelines": {
        const settings = await prisma.shopSettings.findFirst();
        result = {
          persona: getSalesPersona(settings?.shopName ?? undefined),
          rules: SALES_GUIDELINES_RULES,
        };
        break;
      }

      default:
        throw new Error(`unknown_tool:${name}`);
    }
    await logTool(name, payload, true);
    console.info("[vclaw:tool] ok ←", name, JSON.stringify(summarizeResult(name, result)), `(${Date.now() - t0}ms)`);
    return { ok: true, result };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await logTool(name, payload, false, msg);
    console.error("[vclaw:tool] lỗi ←", name, JSON.stringify({ error: msg }), `(${Date.now() - t0}ms)`);
    return { ok: false, error: msg };
  }
}

function checkoutCustomerFromArgs(args: Record<string, unknown>): CheckoutCustomerInput {
  return {
    name: stringOrNull(args.customerName ?? args.name),
    phone: stringOrNull(args.phone),
    email: stringOrNull(args.email),
    address: stringOrNull(args.address ?? args.shippingAddress ?? args.shippingNote),
  };
}

async function resolveCheckoutItems(itemsArg: unknown): Promise<CheckoutItemInput[]> {
  const rawItems = parseItemsArg(itemsArg);
  if (rawItems.length === 0) throw new Error("missing_items");

  const checkoutItems: CheckoutItemInput[] = [];
  for (const item of rawItems) {
    const productId = String(item.productId ?? item.id ?? "").trim();
    const productCode = String(item.productCode ?? item.sku ?? "").trim();
    const name = String(item.name ?? "").trim();
    let product = null as ProductPolicySource | null;

    const productSelect = { id: true, name: true, price: true, type: true, metadata: true, productCode: true, commercePolicyJson: true } as const;
    if (productId) {
      product = await prisma.product.findUnique({ where: { id: productId }, select: productSelect });
    }
    if (!product && productCode) {
      product = await prisma.product.findUnique({ where: { productCode }, select: productSelect });
    }
    if (!product && name) {
      product = await prisma.product.findFirst({ where: { name: { contains: name } }, select: productSelect });
    }
    if (!product) {
      throw new Error(`product_not_found:${productCode || name || productId || "unknown"}`);
    }

    checkoutItems.push({
      product,
      quantity: Number(item.qty ?? item.quantity ?? 1),
    });
  }
  return checkoutItems;
}

function parseItemsArg(itemsArg: unknown): Array<Record<string, unknown>> {
  if (!itemsArg) return [];
  const parsed = typeof itemsArg === "string" ? JSON.parse(itemsArg) : itemsArg;
  if (!Array.isArray(parsed)) return [];
  return parsed.filter((item): item is Record<string, unknown> => {
    return item != null && typeof item === "object" && !Array.isArray(item);
  });
}

async function findPaymentForVerification(identifier: string) {
  const direct = await prisma.payment.findUnique({ where: { id: identifier } });
  if (direct) return direct;

  const order = await prisma.order.findFirst({
    where: {
      OR: [
        { id: identifier },
        { orderNumber: identifier },
      ],
    },
    include: {
      payments: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });
  return order?.payments[0] ?? null;
}

function ensureOrderCanFulfill(order: {
  status: string;
  payments: Array<{ method: string; status: string }>;
}) {
  const hasCodPayment = order.payments.some(payment => payment.method === "COD");
  if (hasCodPayment) return;

  const hasVerifiedPayment = order.payments.some(payment => {
    return ["VERIFIED", "PAID", "APPROVED", "SUCCESS"].includes(payment.status);
  });
  if (hasVerifiedPayment || ["PAID", "PROCESSING", "DONE"].includes(order.status)) return;

  throw new Error("payment_not_verified");
}

async function createFulfillmentReviewTask(input: {
  orderId: string;
  orderNumber: string;
  amount: number;
  type: string;
  title: string;
  subtitle: string;
  fulfillmentStatus: string;
}) {
  const existing = await prisma.task.findFirst({
    where: {
      type: input.type,
      title: input.title,
      status: "NEW",
    },
  });
  if (!existing) {
    await prisma.task.create({
      data: {
        type: input.type,
        title: input.title,
        subtitle: input.subtitle,
        amount: String(input.amount),
        status: "NEW",
        isUrgent: true,
      },
    });
  }
  await prisma.order.update({
    where: { id: input.orderId },
    data: { fulfillmentStatus: input.fulfillmentStatus },
  });
}

function readEmailFromLabels(labels: string | null | undefined): string | null {
  if (!labels) return null;
  try {
    const parsed = JSON.parse(labels) as { email?: unknown };
    return typeof parsed.email === "string" ? parsed.email : null;
  } catch {
    return null;
  }
}

function stringOrNull(value: unknown): string | null {
  const text = String(value ?? "").trim();
  return text || null;
}

function summarizeArgs(args: Record<string, unknown>): Record<string, unknown> {
  const safe: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(args)) {
    if (k === "items") safe[k] = Array.isArray(v) ? `[${(v as unknown[]).length} items]` : v;
    else if (typeof v === "string" && v.length > 80) safe[k] = v.slice(0, 80) + "…";
    else safe[k] = v;
  }
  return safe;
}

function summarizeResult(toolName: string, result: unknown): Record<string, unknown> {
  if (!result || typeof result !== "object") return { result };
  const r = result as Record<string, unknown>;
  switch (toolName) {
    case "vclaw.order.create":
      return { orderNumber: r.orderNumber, amount: r.amount, hasQr: !!r.qrUrl };
    case "vclaw.payment.generate_qr":
      return { hasQr: !!r.qrUrl, transferNote: r.transferNote };
    case "vclaw.customer.upsert":
      return { customerId: r.customerId, name: r.customerName, phone: r.phone };
    case "vclaw.product.list":
      return { count: r.count, empty: r.empty };
    case "vclaw.checkout.prepare":
      return { nextAction: r.nextAction, canCreateOrder: r.canCreateOrder, missingFields: r.missingFields };
    case "vclaw.shipping.quote_from_address":
      return { quotesCount: Array.isArray(r.quotes) ? r.quotes.length : 0 };
    case "vclaw.automation.run_rules":
      return { count: r.count };
    default:
      return { ok: true };
  }
}

export const VCLAW_AGENT_TOOLS_METADATA = {
  "vclaw.customer.upsert": {
    description: "Tạo hoặc cập nhật khách hàng. Gọi ngay khi có tên/SĐT/địa chỉ/giới tính/cách xưng hô từ tin nhắn.",
    parameters: {
      type: "object",
      properties: {
        customerName: { type: "string", description: "Họ tên khách hàng" },
        phone: { type: "string", description: "Số điện thoại" },
        email: { type: "string", description: "Email (nếu có)" },
        gender: { type: "string", description: "Giới tính (nam, nữ)" },
        preferredName: { type: "string", description: "Cách gọi khách (anh, chị, tên riêng...)" },
        channel: { type: "string", description: "Kênh chat: Zalo, Telegram..." },
        externalId: { type: "string", description: "Zalo UID để liên kết conversation" },
      },
      required: [],
    },
  },
  "vclaw.product.list": {
    description: "Lấy danh sách sản phẩm active từ database, gồm imageUrl/images, commercePolicy/checkoutHint. Gọi trước khi tư vấn sản phẩm/giá. Chỉ bán sản phẩm có trong kết quả này. Chỉ gửi ảnh bằng URL imageUrl/images copy nguyên văn từ đúng dòng sản phẩm.",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "Từ khóa tìm kiếm (tên, mô tả, danh mục). Bỏ trống để lấy toàn bộ danh mục." },
      },
      required: [],
    },
  },
  "vclaw.checkout.prepare": {
    description: "Tính chính sách checkout theo sản phẩm: thiếu thông tin gì, COD hay trả trước, giao GHN/email/bên thứ ba. Gọi trước vclaw.order.create.",
    parameters: {
      type: "object",
      properties: {
        customerName: { type: "string", description: "Tên khách nếu đã có" },
        phone: { type: "string", description: "SĐT khách nếu đã có" },
        email: { type: "string", description: "Email khách nếu hàng digital/email delivery" },
        shippingAddress: { type: "string", description: "Địa chỉ nhận hàng nếu giao vật lý/GHN" },
        items: { type: "string", description: "JSON danh sách sản phẩm: [{productId, productCode, name, quantity}]" },
      },
      required: ["items"],
    },
  },
  "vclaw.order.create": {
    description: "Tạo đơn theo commercePolicy của sản phẩm. Prepaid: PENDING + QR. COD: không QR, sẵn sàng tạo vận đơn thu hộ. Digital/third-party: yêu cầu email/provider theo policy. Nên gọi vclaw.checkout.prepare trước.",
    parameters: {
      type: "object",
      properties: {
        customerName: { type: "string", description: "Họ tên khách hàng" },
        phone: { type: "string", description: "Số điện thoại (bắt buộc)" },
        email: { type: "string", description: "Email (cho hàng digital)" },
        amount: { type: "number", description: "Tổng tiền khách xác nhận. Server sẽ ưu tiên giá catalog khi items khớp DB." },
        shippingAddress: { type: "string", description: "Địa chỉ giao hàng cho GHN/COD/prepaid vật lý" },
        shippingNote: { type: "string", description: "Ghi chú giao hàng, tương thích luồng cũ" },
        items: { type: "string", description: "JSON danh sách sản phẩm: [{productId, name, productCode, qty}]" },
        channel: { type: "string", description: "Kênh bán hàng" },
      },
      required: ["customerName", "phone", "amount"],
    },
  },
  "vclaw.payment.generate_qr": {
    description: "Sinh mã QR VietQR cho đơn hàng đã tồn tại. Dùng khi cần gửi lại QR hoặc đơn chưa có QR.",
    parameters: {
      type: "object",
      properties: {
        amount: { type: "number", description: "Số tiền cần thanh toán" },
        orderId: { type: "string", description: "ID đơn hàng (ưu tiên — tự lấy orderNumber làm nội dung CK)" },
        phone: { type: "string", description: "SĐT khách (dùng khi chưa có orderId)" },
        description: { type: "string", description: "Nội dung CK tùy chỉnh (hiếm dùng)" },
      },
      required: ["amount"],
    },
  },
  "vclaw.payment.verify_bill": {
    description: "Ghi nhận và đối soát bill khách gửi. Nhận paymentId, orderId hoặc orderNumber; nếu khớp sẽ chuyển đơn sang READY_TO_FULFILL.",
    parameters: {
      type: "object",
      properties: {
        paymentId: { type: "string", description: "ID thanh toán hoặc đơn hàng cần đối soát" },
      },
      required: ["paymentId"],
    },
  },
  "vclaw.shipping.quote_from_address": {
    description: "Báo phí ship từ địa chỉ khách nhập tự nhiên (tách tỉnh/quận/phường tự động). Dùng khi khách hỏi phí ship trước khi tạo đơn.",
    parameters: {
      type: "object",
      properties: {
        rawAddress: { type: "string", description: "Địa chỉ nhận hàng (vd: 123 Lê Lợi, Quận 1, TP.HCM)" },
        weightKg: { type: "number", description: "Khối lượng kg (mặc định 0.5)" },
      },
      required: ["rawAddress"],
    },
  },
  "vclaw.shipping.create_ghn_order": {
    description: "Tạo vận đơn GHN. Đơn prepaid bắt buộc bill đã VERIFIED/PAID; đơn COD được tạo vận đơn thu hộ.",
    parameters: {
      type: "object",
      properties: {
        orderId: { type: "string", description: "ID đơn hàng VClaw" },
      },
      required: ["orderId"],
    },
  },
  "vclaw.digital.fulfill_email": {
    description: "Tạo yêu cầu xuất/gửi hàng điện tử qua email sau khi đơn prepaid đã được xác nhận thanh toán.",
    parameters: {
      type: "object",
      properties: {
        orderId: { type: "string", description: "ID đơn hàng VClaw" },
        email: { type: "string", description: "Email nhận hàng nếu chưa lưu trong khách hàng" },
      },
      required: ["orderId"],
    },
  },
  "vclaw.third_party.create_order": {
    description: "Tạo yêu cầu xử lý đơn qua bên thứ ba sau khi điều kiện thanh toán của policy đã đạt.",
    parameters: {
      type: "object",
      properties: {
        orderId: { type: "string", description: "ID đơn hàng VClaw" },
        provider: { type: "string", description: "Tên đối tác/provider nếu bot biết từ commercePolicy" },
      },
      required: ["orderId"],
    },
  },
  "vclaw.automation.run_rules": {
    description: "Chạy các Quy tắc tự động hóa đã bật trong VClaw: follow-up thanh toán, nhắc lịch hẹn, tái kích hoạt lead. Dùng cho OpenClaw heartbeat/cron.",
    parameters: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  "vclaw.commerce.get_sales_guidelines": {
    description: "Lấy persona và quy tắc bán hàng của shop. Gọi khi cần biết phong cách tư vấn hoặc xử lý greeting.",
    parameters: { type: "object", properties: {} },
  },
} as const;

export const VCLAW_AGENT_TOOL_NAMES = Object.keys(VCLAW_AGENT_TOOLS_METADATA) as Array<keyof typeof VCLAW_AGENT_TOOLS_METADATA>;
