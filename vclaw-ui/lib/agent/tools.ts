import { prisma } from "@/lib/db";
import { revalidateAdminPaths } from "@/lib/admin/revalidate";
import { generateVietQRUrl } from "@/lib/vietqr";
import { verifyPaymentBill } from "@/lib/actions/payment-actions";
import { createGhnOrder } from "@/lib/logistics/ghn-order";
import { getShippingEstimates, normalizeAddress } from "@/lib/logistics/shipping";
import { newOrderNumber } from "@/lib/commerce/orders";
import { getSalesPersona, SALES_GUIDELINES_RULES, TOOL_NOTE_CATALOG } from "@/lib/ai/prompts/sales-prompts";

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
  console.info("[vclaw:executeVclawAgentTool]", name);
  try {
    let result: unknown;
    switch (name) {

      // ── Khách hàng ──────────────────────────────────────────────────────────
      case "vclaw.customer.upsert": {
        const customerName = String(args.customerName ?? "").trim();
        const phone = args.phone ? String(args.phone).trim() : null;
        const email = args.email ? String(args.email).trim() : null;
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

        if (!customer) {
          customer = await prisma.customer.create({
            data: {
              name: customerName || "Khách",
              phone,
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
              ...(email ? { labels: JSON.stringify({ email }) } : {}),
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
        result = { customerId: customer.id, customerName: customer.name, phone: customer.phone, gender: customer.gender, preferredName: customer.preferredName };
        break;
      }

      // ── Sản phẩm ─────────────────────────────────────────────────────────────
      case "vclaw.product.list": {
        const query = args.query ? String(args.query).trim() : "";
        const products = await prisma.product.findMany({
          where: {
            status: "ACTIVE",
            ...(query ? {
              OR: [
                { name: { contains: query } },
                { description: { contains: query } },
                { category: { contains: query } },
              ]
            } : {}),
          },
          select: { id: true, name: true, price: true, category: true, description: true, productCode: true },
          orderBy: { updatedAt: "desc" },
          take: 100,
        });
        result = {
          products,
          count: products.length,
          empty: products.length === 0,
          instruction: products.length === 0
            ? "Catalog rỗng: không được tự nghĩ sản phẩm, giá, combo hay tồn kho. Nói shop đang cập nhật danh mục và xin SĐT/nhu cầu để báo lại."
            : TOOL_NOTE_CATALOG,
        };
        break;
      }

      // ── Đơn hàng ─────────────────────────────────────────────────────────────
      case "vclaw.order.create": {
        const customerName = String(args.customerName ?? "Khách").trim() || "Khách";
        const phone = args.phone != null ? String(args.phone).trim() || null : null;
        const email = args.email ? String(args.email).trim() : null;
        const amount = Number(args.amount);
        const status = String(args.status ?? "PENDING").toUpperCase();
        const shippingAddress = args.shippingNote ? String(args.shippingNote) : null;

        let shippingNote = shippingAddress || null;
        if (args.items) {
          const itemsStr = typeof args.items === "string" ? args.items : JSON.stringify(args.items);
          shippingNote = shippingAddress ? `${shippingAddress}\n[items]${itemsStr}` : `[items]${itemsStr}`;
        }

        if (!Number.isFinite(amount) || amount <= 0) throw new Error("invalid_amount");

        let customer = phone ? await prisma.customer.findFirst({ where: { phone } }) : null;
        if (!customer) {
          customer = await prisma.customer.create({
            data: {
              name: customerName,
              phone,
              channel: args.channel ? String(args.channel) : "Zalo",
              ...(email ? { labels: JSON.stringify({ email }) } : {}),
            },
          });
        } else if (customerName && customer.name !== customerName) {
          customer = await prisma.customer.update({ where: { id: customer.id }, data: { name: customerName } });
        }

        // Tạo OrderItems nếu tìm được product trong DB
        let orderItemsData: { productId: string; quantity: number; price: number }[] = [];
        try {
          if (args.items) {
            const parsedItems = typeof args.items === "string" ? JSON.parse(args.items) : args.items;
            if (Array.isArray(parsedItems)) {
              for (const item of parsedItems) {
                const pName = String(item.name || "").trim();
                const pCode = String(item.productCode || "").trim();
                let product = null;
                if (pCode) product = await prisma.product.findUnique({ where: { productCode: pCode } });
                if (!product && pName) product = await prisma.product.findFirst({ where: { name: { contains: pName } } });
                if (product?.id) {
                  orderItemsData.push({
                    productId: product.id,
                    quantity: Number(item.qty || item.quantity || 1),
                    price: Number(item.price || product.price || 0),
                  });
                }
              }
            }
          }
        } catch (e) {
          console.error("Lỗi xử lý OrderItems:", e);
        }

        const orderNumber = await newOrderNumber();
        const order = await prisma.order.create({
          data: {
            orderNumber,
            customerId: customer.id,
            amount,
            status: ["PENDING", "PAID", "PROCESSING", "DONE", "FOLLOW_UP"].includes(status) ? status : "PENDING",
            shippingNote,
            items: orderItemsData.length > 0 ? {
              create: orderItemsData.map(item => ({
                productId: item.productId,
                quantity: item.quantity,
                price: item.price,
              }))
            } : undefined,
          },
        });
        revalidateAdminPaths();

        // Sinh QR tự động
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

        if (settings?.bankName && settings?.accountNumber) {
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
          transferNote,
          qrUrl,
          message: qrUrl
            ? `Đơn hàng ${orderNumber} đã được tạo. Nội dung CK BẮT BUỘC: "${transferNote}". Link QR: ${qrUrl}`
            : `Đơn hàng ${orderNumber} đã được tạo thành công.`,
          instruction: qrUrl
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
        if (!finalDesc && args.orderId) {
          const ord = await prisma.order.findUnique({
            where: { id: String(args.orderId) },
            include: { customer: true },
          });
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
        const verifyResult = await verifyPaymentBill(paymentId, null);
        result = { verifyResult };
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
        const order = await prisma.order.findUnique({ where: { id: orderId }, include: { customer: true } });
        if (!order) throw new Error("order_not_found");
        const ghnResult = await createGhnOrder(orderId);
        result = ghnResult;
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
    return { ok: true, result };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await logTool(name, payload, false, msg);
    return { ok: false, error: msg };
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
    description: "Lấy danh sách sản phẩm active từ database. Gọi trước khi tư vấn sản phẩm/giá. Tùy chọn lọc bằng query. Chỉ bán sản phẩm có trong kết quả này.",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "Từ khóa tìm kiếm (tên, mô tả, danh mục). Bỏ trống để lấy toàn bộ danh mục." },
      },
      required: [],
    },
  },
  "vclaw.order.create": {
    description: "Tạo đơn hàng PENDING và sinh QR VietQR tự động. BẮT BUỘC có SĐT + amount + items. Trả về qrUrl và transferNote.",
    parameters: {
      type: "object",
      properties: {
        customerName: { type: "string", description: "Họ tên khách hàng" },
        phone: { type: "string", description: "Số điện thoại (bắt buộc)" },
        email: { type: "string", description: "Email (cho hàng digital)" },
        amount: { type: "number", description: "Tổng tiền thanh toán" },
        shippingNote: { type: "string", description: "Địa chỉ và ghi chú giao hàng" },
        items: { type: "string", description: "JSON danh sách sản phẩm: [{name, productCode, price, qty}]" },
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
    description: "Ghi nhận và trích xuất thông tin bill khách gửi để đối soát. Gọi ngay khi khách gửi ảnh/bill chuyển khoản.",
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
    description: "Tạo vận đơn GHN sau khi đơn hàng đã được xác nhận thanh toán. Cần shop đã cấu hình GHN.",
    parameters: {
      type: "object",
      properties: {
        orderId: { type: "string", description: "ID đơn hàng VClaw" },
      },
      required: ["orderId"],
    },
  },
  "vclaw.commerce.get_sales_guidelines": {
    description: "Lấy persona và quy tắc bán hàng của shop. Gọi khi cần biết phong cách tư vấn hoặc xử lý greeting.",
    parameters: { type: "object", properties: {} },
  },
} as const;

export const VCLAW_AGENT_TOOL_NAMES = Object.keys(VCLAW_AGENT_TOOLS_METADATA) as Array<keyof typeof VCLAW_AGENT_TOOLS_METADATA>;
