import {
  getIntegrationAccounts,
  getIntegrationConnectionsPublic,
} from "@/lib/actions/integration-actions";
import { prisma } from "@/lib/db";
import { revalidateAdminPaths } from "@/lib/admin/revalidate";
import { generateVietQRUrl } from "@/lib/vietqr";
import { createBooking, updateBookingStatus } from "@/lib/actions/booking-actions";
import { enqueueAutomationJob } from "@/lib/actions/automation-actions";
import { upsertShopSettings } from "@/lib/actions/shop-settings-actions";
import { verifyPaymentBill } from "@/lib/actions/payment-actions";
import { getCommerceReportSnapshot } from "@/lib/commerce/report-stats";
import { notifyShipperZalo } from "@/lib/actions/shipping-actions";
import { createGhnOrder, cancelGhnOrder, updateGhnOrder } from "@/lib/logistics/ghn-order";
import { tryGhnShippingFee } from "@/lib/logistics/ghn-quote";
import { getShippingEstimates, normalizeAddress } from "@/lib/logistics/shipping";
import { extractProductFromImage } from "@/lib/actions/product-actions";
import { newOrderNumber } from "@/lib/commerce/orders";
import {
  getSalesPersona,
  SALES_GUIDELINES_RULES,
  SALES_SHORT_PERSONA,
  TOOL_NOTE_CATALOG,
  TOOL_NOTE_EXTRACTED,
  TOOL_NOTE_CONNECTIONS,
  TOOL_NOTE_BOOKING_CREATED,
  TOOL_NOTE_CAMPAIGN_QUEUED,
  TOOL_NOTE_SETTINGS_UPDATED,
} from "@/lib/ai/prompts/sales-prompts";



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
 * Thực thi tool nội bộ (HTTP bridge cho OpenClaw / gateway).
 * Policy: chỉ gọi từ server với `VCLAW_AGENT_TOOLS_SECRET`.
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
      case "vclaw.customer.upsert": {
        // Tạo hoặc cập nhật khách hàng từ cuộc chat Zalo
        const customerName = String(args.customerName ?? "").trim();
        const phone = args.phone ? String(args.phone).trim() : null;
        const email = args.email ? String(args.email).trim() : null;
        const channel = args.channel ? String(args.channel) : "Zalo";
        const externalId = args.externalId ? String(args.externalId) : null;
        const gender = args.gender ? String(args.gender).trim() : null;
        const preferredName = args.preferredName ? String(args.preferredName).trim() : null;

        if (!customerName && !phone && !externalId) throw new Error("missing_name_or_phone_or_externalId");

        let customer = null;

        // Tìm khách theo SĐT
        if (phone) {
          customer = await prisma.customer.findFirst({ where: { phone } });
        }
        
        // Nếu không có SĐT nhưng có externalId, tìm theo conversation
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

        // Liên kết conversation với customer nếu có externalId
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
      case "vclaw.order.create": {
        const customerName = String(args.customerName ?? "Khách").trim() || "Khách";
        const phone = args.phone != null ? String(args.phone).trim() || null : null;
        const email = args.email ? String(args.email).trim() : null;
        const amount = Number(args.amount);
        const status = String(args.status ?? "PENDING").toUpperCase();
        const shippingAddress = args.shippingNote ? String(args.shippingNote) : null;

        // Lưu danh sách sản phẩm vào shippingNote dưới dạng JSON nếu có
        let shippingNote = shippingAddress || null;
        if (args.items) {
          const itemsStr = typeof args.items === "string" ? args.items : JSON.stringify(args.items);
          shippingNote = shippingAddress
            ? `${shippingAddress}\n[items]${itemsStr}`
            : `[items]${itemsStr}`;
        }

        if (!Number.isFinite(amount) || amount <= 0) {
          throw new Error("invalid_amount");
        }

        // Tìm hoặc tạo khách hàng
        let customer = phone
          ? await prisma.customer.findFirst({ where: { phone } })
          : null;
        if (!customer) {
          customer = await prisma.customer.create({
            data: {
              name: customerName,
              phone,
              channel: args.channel ? String(args.channel) : "Zalo",
              ...(email ? { labels: JSON.stringify({ email }) } : {}),
            },
          });
        } else {
          // Cập nhật tên nếu khách đã tồn tại và có tên mới
          if (customerName && customer.name !== customerName) {
            customer = await prisma.customer.update({
              where: { id: customer.id },
              data: { name: customerName },
            });
          }
        }

        // 2. Xử lý danh sách sản phẩm (OrderItem)
        let orderItemsData: any[] = [];
        try {
          if (args.items) {
            const parsedItems = typeof args.items === "string" ? JSON.parse(args.items) : args.items;
            if (Array.isArray(parsedItems)) {
              for (const item of parsedItems) {
                // Thử tìm sản phẩm trong DB bằng productCode hoặc tên
                const pName = String(item.name || "").trim();
                const pCode = String(item.productCode || "").trim();
                
                let product = null;
                if (pCode) {
                  product = await prisma.product.findUnique({
                    where: { productCode: pCode }
                  });
                }
                
                if (!product && pName) {
                  product = await prisma.product.findFirst({
                    where: {
                      name: {
                        contains: pName,
                      }
                    }
                  });
                }

                orderItemsData.push({
                  productId: product?.id || "unknown", // Nếu không tìm thấy thì để unknown hoặc xử lý sau
                  quantity: Number(item.qty || item.quantity || 1),
                  price: Number(item.price || 0),
                  // Lưu tên gốc vào metadata nếu cần đối soát khi không tìm thấy product
                  createdAt: new Date(),
                  updatedAt: new Date(),
                });
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
            status: ["PENDING", "PAID", "PROCESSING", "DONE", "FOLLOW_UP"].includes(status)
              ? status
              : "PENDING",
            shippingNote,
            // Lưu OrderItems vào DB
            items: orderItemsData.length > 0 ? {
              create: orderItemsData.map(item => ({
                productId: item.productId !== "unknown" ? item.productId : undefined,
                // Vì productId là bắt buộc trong schema (thường là vậy), 
                // ta cần cẩn thận nếu không tìm thấy product.
                // Ở đây tôi giả định schema cho phép null hoặc ta có 1 sp 'khác'
                quantity: item.quantity,
                price: item.price,
              })).filter(i => !!i.productId) // Chỉ tạo item nếu tìm thấy sản phẩm
            } : undefined,
          },
        });
        revalidateAdminPaths();

        // Tự động tạo mã QR thanh toán
        const settings = await prisma.shopSettings.findFirst();
        let qrUrl: string | null = null;
        
        // Nội dung CK chuẩn 4 phần: Mã-đơn SĐT Mã-SP xSố-lượng (Ngăn cách bằng ĐÚNG MỘT dấu cách)
        const cleanOrderNumber = orderNumber.replace(/\s+/g, "");
        const cleanPhone = (phone || "").replace(/\s+/g, "");
        
        // Tạo chuỗi itemInfo tách biệt để join sạch hơn
        let itemParts: string[] = [];
        try {
          if (args.items) {
            const parsedItems = typeof args.items === "string" ? JSON.parse(args.items) : args.items;
            if (Array.isArray(parsedItems) && parsedItems.length > 0) {
              const firstItem = parsedItems[0];
              const pCode = (firstItem.productCode || firstItem.sku || firstItem.name || "SP")
                .replace(/[\s-]+/g, "")
                .slice(0, 10)
                .toUpperCase();
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
              bankId: settings.bankName.toLowerCase(), // Đảm bảo viết thường cho vietqr.io
              accountNo: settings.accountNumber,
              accountName: settings.accountHolder || "",
              amount: amount > 0 ? amount : undefined,
              description: transferNote,
            });
          } catch (qrErr) {
            console.error("Lỗi sinh mã QR khi tạo đơn:", qrErr);
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
      case "vclaw.commerce.catalog_index": {
        const products = await prisma.product.findMany({
          where: { status: "ACTIVE" },
          select: { id: true, name: true, price: true, category: true },
          take: 100, // Đủ cho hầu hết shop nhỏ
        });
        result = { 
          catalog: products,
          note: TOOL_NOTE_CATALOG
        };

        break;
      }
      case "vclaw.commerce.get_sales_guidelines": {
        const settings = await prisma.shopSettings.findFirst();
        result = {
          persona: getSalesPersona(settings?.shopName ?? undefined),
          rules: SALES_GUIDELINES_RULES
        };
        break;
      }


      case "vclaw.system.get_local_capabilities": {
        result = {
          version: "1.0.0",
          environment: process.env.NODE_ENV,
          modules: [
            "commerce.catalog",
            "commerce.orders",
            "customer.management",
            "ai.enrichment",
            "openclaw.bridge",
            "payment.vietqr"
          ],
          localApis: [
            "/api/vclaw/enrich",
            "/api/vclaw/agent-tools"
          ],
          capabilities: "Hệ thống có khả năng truy xuất database local, xử lý nghiệp vụ bán hàng, tạo mã VietQR và nạp ngữ cảnh AI đa kênh."
        };
        break;
      }
      case "vclaw.payment.generate_qr": {
        const amount = Number(args.amount);
        const settings = await prisma.shopSettings.findFirst();

        if (!settings?.bankName || !settings?.accountNumber) {
          throw new Error("shop_bank_info_not_configured");
        }

        // Xây dựng nội dung chuyển khoản: ưu tiên orderId → lấy orderNumber
        let finalDesc = String(args.description ?? "").trim();
        if (!finalDesc && args.orderId) {
          const ord = await prisma.order.findUnique({
            where: { id: String(args.orderId) },
            include: { customer: true },
          });
          if (ord) {
            // Cố gắng lấy info sản phẩm từ shippingNote (nếu có lưu [items])
            let itemInfo = "";
            if (ord.shippingNote?.includes("[items]")) {
              try {
                const itemsStr = ord.shippingNote.split("[items]")[1];
                const items = JSON.parse(itemsStr);
                if (Array.isArray(items) && items.length > 0) {
                  const first = items[0];
                  // Mã sản phẩm không dấu cách
                  const code = (first.productCode || first.sku || first.name || "SP")
                    .replace(/\s+/g, "")
                    .slice(0, 10)
                    .toUpperCase();
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
        // Fallback: dùng phone/zaloId - CỐ GẮNG GIỮ ĐỊNH DẠNG Madonhang sodienthoai
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
      case "vclaw.customer.search": {
        const query = String(args.query ?? "").trim();
        const customers = await prisma.customer.findMany({
          where: {
            OR: [
              { name: { contains: query } },
              { phone: { contains: query } },
            ],
          },
          take: 5,
        });
        result = { customers };
        break;
      }
      case "vclaw.customer.get_orders": {
        const customerId = String(args.customerId || "");
        const orders = await prisma.order.findMany({
          where: { customerId },
          orderBy: { createdAt: "desc" },
          take: 10,
        });
        result = { orders };
        break;
      }
      case "vclaw.product.list": {
        const query = String(args.query ?? "").trim();
        const category = args.category ? String(args.category) : undefined;
        const products = await prisma.product.findMany({
          where: {
            status: "ACTIVE",
            AND: [
              query ? { name: { contains: query } } : {},
              category ? { category } : {},
            ],
          },
          orderBy: { updatedAt: "desc" },
          take: 20,
        });
        result = { 
          products: products.map(p => ({ 
            id: p.id, 
            name: p.name, 
            price: p.price, 
            description: p.description,
            imageUrl: p.imageUrl 
          })) 
        };
        break;
      }
      case "vclaw.product.search": {
        const query = String(args.query ?? "").trim();
        if (!query) throw new Error("missing_query");
        const products = await prisma.product.findMany({
          where: {
            status: "ACTIVE",
            OR: [
              { name: { contains: query } },
              { description: { contains: query } },
              { category: { contains: query } },
            ],
          },
          orderBy: { updatedAt: "desc" },
          take: 10,
        });
        result = { products };
        break;
      }
      case "vclaw.shop.get_info": {
        const settings = await prisma.shopSettings.findFirst();
        result = { 
          shopName: settings?.shopName ?? "Cửa hàng VClaw",
          phone: (settings as any)?.phone,
          email: (settings as any)?.email,
          address: (settings as any)?.address,
          website: (settings as any)?.website,
          preferredChannel: settings?.preferredChannel ?? "Zalo",
          bankName: settings?.bankName,
          accountHolder: settings?.accountHolder,
          accountNumber: settings?.accountNumber,
          salesPersona: SALES_SHORT_PERSONA
        };
        break;
      }

      case "vclaw.product.get": {
        const id = String(args.id ?? "").trim();
        const name = String(args.name ?? "").trim();
        if (!id && !name) throw new Error("missing_id_or_name");
        const product = id 
          ? await prisma.product.findUnique({ where: { id } })
          : await prisma.product.findFirst({ where: { name: { contains: name } } });
        if (!product) throw new Error("product_not_found");
        result = { product };
        break;
      }
      case "vclaw.product.create": {
        if (!args.isAdmin) throw new Error("permission_denied:admin_only");
        // Kiểm tra mã sản phẩm đã tồn tại chưa
        const existingCode = String(args.productCode ?? "").replace(/\s+/g, "").toUpperCase();
        if (existingCode) {
          const conflict = await prisma.product.findUnique({ where: { productCode: existingCode } });
          if (conflict) throw new Error(`Mã sản phẩm '${existingCode}' đã tồn tại. Vui lòng chọn mã khác.`);
        }
        const name = String(args.name ?? "").trim();
        const price = Number(args.price);
        
        let productCode = String(args.productCode ?? "").replace(/\s+/g, "").toUpperCase();
        // Tự sinh productCode nếu thiếu
        if (!productCode && name) {
          productCode = name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\w\s]/gi, "").replace(/\s+/g, "").toUpperCase().substring(0, 15);
        }

        if (!name || !Number.isFinite(price)) throw new Error("missing_name_or_price");
        if (!productCode) throw new Error("Mã sản phẩm (productCode) là bắt buộc và không thể tự sinh.");

        const product = await (prisma.product.create as any)({
          data: {
            name,
            price,
            description: args.description ? String(args.description) : null,
            imageUrl: args.imageUrl ? String(args.imageUrl) : null,
            images: Array.isArray(args.imageUrls) ? JSON.stringify(args.imageUrls) : (args.imageUrl ? JSON.stringify([args.imageUrl]) : null),
            category: args.category ? String(args.category) : null,
            productCode,
            status: "ACTIVE",
          },
        });
        revalidateAdminPaths();
        result = { product };
        break;
      }
      case "vclaw.product.update": {
        if (!args.isAdmin) throw new Error("permission_denied:admin_only");
        const id = String(args.id ?? "").trim();
        if (!id) throw new Error("missing_id");
        const data: Record<string, unknown> = {};
        if (args.name) data.name = String(args.name);
        if (args.price != null) data.price = Number(args.price);
        if (args.description != null) data.description = String(args.description);
        if (args.imageUrl != null) data.imageUrl = String(args.imageUrl);
        if (Array.isArray(args.imageUrls)) (data as any).images = JSON.stringify(args.imageUrls);
        if (args.category != null) data.category = String(args.category);
        if (args.status) data.status = String(args.status);
        if (args.productCode) data.productCode = String(args.productCode).replace(/\s+/g, "").toUpperCase();

        const product = await (prisma.product.update as any)({
          where: { id },
          data: data as any,
        });
        revalidateAdminPaths();
        result = { product };
        break;
      }
      case "vclaw.product.extract_from_image": {
        if (!args.isAdmin) throw new Error("permission_denied:admin_only");
        
        const imageUrl = args.imageUrl ? String(args.imageUrl).trim() : null;
        const imageUrls = Array.isArray(args.imageUrls) ? args.imageUrls.map(String) : [];
        
        const targets = imageUrl ? [imageUrl, ...imageUrls] : imageUrls;
        if (targets.length === 0) throw new Error("missing_images");
        
        // Gọi action thực tế để bóc tách thông tin từ ảnh bằng AI Vision
        const extracted = await extractProductFromImage(targets);
        
        result = {
          ...extracted,
          note: TOOL_NOTE_EXTRACTED

        };
        break;
      }
      case "vclaw.payment.create_pending": {
        const orderId = String(args.orderId ?? "").trim();
        const amount = Number(args.amount);
        if (!orderId) throw new Error("missing_orderId");
        if (!Number.isFinite(amount) || amount <= 0) throw new Error("invalid_amount");
        const order = await prisma.order.findUnique({ where: { id: orderId } });
        if (!order) throw new Error("order_not_found");
        const payment = await prisma.payment.create({
          data: {
            orderId,
            amount,
            status: "PENDING",
            method: String(args.method ?? "VietQR"),
            evidenceImage: null,
          },
        });
        revalidateAdminPaths();
        result = { paymentId: payment.id };
        break;
      }
      case "vclaw.channel.status": {
        const [accounts, connections] = await Promise.all([
          getIntegrationAccounts(),
          getIntegrationConnectionsPublic(),
        ]);
        result = {
          integrationAccounts: accounts.map((a) => ({
            provider: a.provider,
            displayName: a.displayName,
            connectedAt: a.connectedAt?.toISOString() ?? null,
          })),
          channelConnections: connections.map((c) => {
            let profile: Record<string, unknown> | null = null;
            if (c.profileJson) {
              try {
                profile = JSON.parse(c.profileJson) as Record<string, unknown>;
              } catch {
                profile = null;
              }
            }
            return {
              provider: c.provider,
              oauthOrTokenPresent: c.hasAccessToken,
              hasRefreshToken: c.hasRefreshToken,
              expiresAtIso: c.expiresAtIso,
              externalAccountId: c.externalAccountId,
              profile,
            };
          }),
        };
        break;
      }
      case "vclaw.conversation.append_outbound_draft": {
        const conversationId = String(args.conversationId ?? "").trim();
        const text = String(args.text ?? "").trim();
        if (!conversationId || !text) throw new Error("missing_conversation_or_text");
        const conv = await prisma.conversation.findUnique({ where: { id: conversationId } });
        if (!conv) throw new Error("conversation_not_found");
        await prisma.conversationMessage.create({
          data: {
            conversationId,
            direction: "OUT",
            body: `[draft] ${text}`,
            externalMessageId: null,
          },
        });
        await prisma.conversation.update({
          where: { id: conversationId },
          data: { updatedAt: new Date() },
        });
        revalidateAdminPaths();
        result = { ok: true };
        break;
      }
      case "vclaw.system.status": {
        const settings = await prisma.shopSettings.findFirst();
        const productCount = await prisma.product.count();
        const orderCount = await prisma.order.count();
        const customerCount = await prisma.customer.count();
        result = {
          shopName: settings?.shopName ?? "VClaw",
          stats: {
            products: productCount,
            orders: orderCount,
            customers: customerCount
          },
          status: "Hệ thống đang hoạt động ổn định tại local."
        };
        break;
      }
      case "vclaw.sessions.list": {
        const connections = await getIntegrationConnectionsPublic();
        result = {
          activeSessions: connections.map(c => ({
            provider: c.provider,
            externalAccountId: c.externalAccountId,
            status: c.hasAccessToken ? "CONNECTED" : "DISCONNECTED"
          })),
          note: TOOL_NOTE_CONNECTIONS

        };
        break;
      }
      case "vclaw.ui.get_page_context": {
        const path = String(args.pathname || "");
        if (path.includes("/admin/products")) {
          const products = await prisma.product.findMany({ take: 10, select: { name: true, price: true, category: true } });
          result = { type: "products", data: products, message: "Đây là các sản phẩm đang hiển thị trên màn hình." };
        } else if (path.includes("/admin/orders")) {
          const orders = await prisma.order.findMany({ take: 5, orderBy: { createdAt: "desc" } });
          result = { type: "orders", data: orders, message: "Đây là các đơn hàng gần đây trên màn hình." };
        } else {
          result = { type: "generic", message: `Bạn đang ở trang ${path}. Chưa có dữ liệu đặc thù được cấu hình.` };
        }
        break;
      }
      case "vclaw.booking.create": {
        const customerName = String(args.customerName ?? "").trim() || "Khách";
        const phone = args.phone ? String(args.phone).trim() : null;
        let customer = phone ? await prisma.customer.findFirst({ where: { phone } }) : null;
        if (!customer) {
          customer = await prisma.customer.create({ data: { name: customerName, phone, channel: "Zalo" } });
        }
        const booking = await createBooking({
          customerId: customer.id,
          serviceName: String(args.serviceName ?? "Tư vấn"),
          dateStr: String(args.dateStr ?? new Date().toISOString().split("T")[0]),
          timeStr: String(args.timeStr ?? "09:00"),
        });
        result = { booking, note: TOOL_NOTE_BOOKING_CREATED };

        break;
      }
      case "vclaw.booking.list_pending": {
        if (!args.isAdmin) throw new Error("permission_denied:admin_only");
        const bookings = await prisma.booking.findMany({
          where: { status: "PENDING" },
          include: { customer: true },
          orderBy: { startTime: "asc" }
        });
        result = { bookings };
        break;
      }
      case "vclaw.booking.update_status": {
        if (!args.isAdmin) throw new Error("permission_denied:admin_only");
        const id = String(args.id ?? "").trim();
        const status = String(args.status ?? "CONFIRMED").trim();
        if (!id) throw new Error("missing_id");
        await updateBookingStatus(id, status);
        result = { success: true, status };
        break;
      }
      case "vclaw.automation.enqueue_job": {
        if (!args.isAdmin) throw new Error("permission_denied:admin_only");
        const title = String(args.title ?? "").trim();
        const channel = args.channel ? String(args.channel) : "Zalo";
        const draftContent = args.draftContent ? String(args.draftContent) : null;
        if (!title) throw new Error("missing_title");
        
        await enqueueAutomationJob({ title, channel, draftContent });
        
        result = { success: true, note: TOOL_NOTE_CAMPAIGN_QUEUED };

        break;
      }
      case "vclaw.shop.update_settings": {
        if (!args.isAdmin) throw new Error("permission_denied:admin_only");
        await upsertShopSettings(args as any);
        result = { success: true, note: TOOL_NOTE_SETTINGS_UPDATED };

        break;
      }
      case "vclaw.report.get_snapshot": {
        if (!args.isAdmin) throw new Error("permission_denied:admin_only");
        const snapshot = await getCommerceReportSnapshot();
        result = { snapshot };
        break;
      }
      case "vclaw.payment.verify_bill": {
        if (!args.isAdmin) throw new Error("permission_denied:admin_only");
        const paymentId = String(args.paymentId ?? "").trim();
        if (!paymentId) throw new Error("missing_paymentId");
        // verifyPaymentBill expects (taskId/paymentId, amount)
        const verifyResult = await verifyPaymentBill(paymentId, null);
        result = { verifyResult };
        break;
      }
      case "vclaw.payment.update_status": {
        if (!args.isAdmin) throw new Error("permission_denied:admin_only");
        const paymentId = String(args.paymentId ?? "").trim();
        const status = String(args.status ?? "PAID").trim();
        if (!paymentId) throw new Error("missing_paymentId");
        const payment = await prisma.payment.update({ where: { id: paymentId }, data: { status } });
        result = { success: true, payment };
        break;
      }
      case "vclaw.payment.list_pending": {
        if (!args.isAdmin) throw new Error("permission_denied:admin_only");
        const payments = await prisma.payment.findMany({
          where: { status: "PENDING" },
          include: { order: { include: { customer: true } } },
          orderBy: { createdAt: "desc" },
          take: 20,
        });
        result = { payments };
        break;
      }
      case "vclaw.order.fulfill": {
        if (!args.isAdmin) throw new Error("permission_denied:admin_only");
        const orderId = String(args.orderId ?? "").trim();
        const status = String(args.status ?? "COMPLETED").trim();
        const trackingNumber = args.trackingNumber ? String(args.trackingNumber).trim() : undefined;
        
        if (!orderId) throw new Error("missing_orderId");
        
        await prisma.order.update({
          where: { id: orderId },
          data: { 
            fulfillmentStatus: status,
            ...(trackingNumber ? { trackingNumber } : {})
          }
        });
        revalidateAdminPaths();
        result = { success: true, orderId, status };
        break;
      }
      case "vclaw.shipping.notify_shipper": {
        if (!args.isAdmin) throw new Error("permission_denied:admin_only");
        const orderId = String(args.orderId ?? "").trim();
        if (!orderId) throw new Error("missing_orderId");
        
        const order = await prisma.order.findUnique({
          where: { id: orderId },
          include: { customer: true }
        });
        if (!order) throw new Error("order_not_found");

        const settings = await prisma.shopSettings.findFirst();
        const shipperGroupId = (settings as any)?.shipperGroupId;

        if (!shipperGroupId) {
          throw new Error("shipper_group_not_configured");
        }
        
        const notifyResult = await notifyShipperZalo(order as any, shipperGroupId);
        if (!notifyResult.success) {
          throw new Error(notifyResult.error || "notify_failed");
        }
        result = { success: true, orderId };
        break;
      }
      case "vclaw.shipping.create_ghn_order": {
        if (!args.isAdmin) throw new Error("permission_denied:admin_only");
        const orderId = String(args.orderId ?? "").trim();
        if (!orderId) throw new Error("missing_orderId");
        
        const order = await prisma.order.findUnique({
          where: { id: orderId },
          include: { customer: true }
        });
        if (!order) throw new Error("order_not_found");

        const ghnResult = await createGhnOrder(orderId);
        result = ghnResult;
        break;
      }
      case "vclaw.shipping.cancel_ghn_order": {
        if (!args.isAdmin) throw new Error("permission_denied:admin_only");
        const orderCode = String(args.orderCode ?? "").trim();
        if (!orderCode) throw new Error("missing_orderCode");
        const res = await cancelGhnOrder(orderCode);
        result = res;
        break;
      }
      case "vclaw.shipping.update_ghn_order": {
        if (!args.isAdmin) throw new Error("permission_denied:admin_only");
        const payload = args.payload as any;
        if (!payload || !payload.order_code) throw new Error("missing_order_code_in_payload");
        const res = await updateGhnOrder(payload);
        result = res;
        break;
      }
      case "vclaw.shipping.estimate_ghn_fee": {
        if (!args.isAdmin) throw new Error("permission_denied:admin_only");
        const toDistrictId = Number(args.toDistrictId);
        const toWardCode = String(args.toWardCode ?? "").trim();
        const weightGrams = Number(args.weightGrams);
        if (!Number.isFinite(toDistrictId) || toDistrictId <= 0) {
          throw new Error("invalid_or_missing_toDistrictId");
        }
        if (!toWardCode) throw new Error("missing_toWardCode");
        if (!Number.isFinite(weightGrams) || weightGrams <= 0) {
          throw new Error("invalid_weightGrams");
        }

        const settings = await prisma.shopSettings.findFirst();
        if (!settings?.ghnToken?.trim() || !settings?.ghnShopId?.trim()) {
          throw new Error("ghn_not_configured");
        }

        const fromDistrictIdRaw = args.fromDistrictId;
        const fromDistrictId =
          fromDistrictIdRaw != null && fromDistrictIdRaw !== ""
            ? Number(fromDistrictIdRaw)
            : undefined;
        if (
          fromDistrictIdRaw != null &&
          fromDistrictIdRaw !== "" &&
          (!Number.isFinite(fromDistrictId!) || fromDistrictId! <= 0)
        ) {
          throw new Error("invalid_fromDistrictId");
        }

        const estimate = await tryGhnShippingFee({
          toDistrictId,
          toWardCode,
          weightGrams,
          ...(fromDistrictId != null && Number.isFinite(fromDistrictId) && fromDistrictId > 0
            ? { fromDistrictId }
            : {}),
        });
        if (!estimate) {
          throw new Error("ghn_fee_estimate_unavailable");
        }
        result = {
          provider: estimate.provider,
          price: estimate.price,
          eta: estimate.eta,
        };
        break;
      }
      case "vclaw.shipping.quote_from_address": {
        const rawAddress = String(args.rawAddress ?? "").trim();
        if (!rawAddress) throw new Error("missing_rawAddress");
        const weightKg = args.weightKg != null ? Number(args.weightKg) : 0.5;
        const weight = Number.isFinite(weightKg) && weightKg > 0 ? weightKg : 0.5;

        const normalized = await normalizeAddress(rawAddress);
        if (!normalized) {
          throw new Error("address_standardization_failed");
        }

        const quotes = await getShippingEstimates(normalized, { weight });
        result = {
          normalized,
          quotes,
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
    description: "Tạo hoặc cập nhật thông tin khách hàng từ cuộc chat. Gọi ngay khi thu thập được tên/SĐT/địa chỉ/giới tính/cách xưng hô.",
    parameters: {
      type: "object",
      properties: {
        customerName: { type: "string", description: "Họ tên khách hàng" },
        phone: { type: "string", description: "Số điện thoại" },
        email: { type: "string", description: "Email (nếu có)" },
        gender: { type: "string", description: "Giới tính khách hàng (nam, nữ)" },
        preferredName: { type: "string", description: "Cách khách hàng muốn được gọi hoặc xưng hô (anh, chị, cô, chú, bé... hoặc tên riêng)" },
        channel: { type: "string", description: "Kênh chat: Zalo, Telegram..." },
        externalId: { type: "string", description: "Zalo UID hoặc ID kênh để liên kết conversation" }
      },
      required: []
    }
  },
  "vclaw.order.create": {
    description: "Tạo đơn hàng mới và tự động sinh mã QR thanh toán. BẮT BUỘC có đủ SĐT + tổng tiền + items. Kết quả trả về có qrUrl và transferNote (định dạng: Madonhang sodienthoai masanpham xsoluong). CẤM dùng tên khách hàng trong nội dung CK.",
    parameters: {
      type: "object",
      properties: {
        customerName: { type: "string", description: "Họ tên khách hàng (bắt buộc)" },
        phone: { type: "string", description: "Số điện thoại (bắt buộc)" },
        email: { type: "string", description: "Email khách hàng (tuỳ chọn)" },
        amount: { type: "number", description: "Tổng tiền thanh toán" },
        status: { type: "string", enum: ["PENDING", "PROCESSING", "FOLLOW_UP"], description: "Trạng thái đơn (Mặc định PENDING)" },
        shippingNote: { type: "string", description: "Địa chỉ nhận hàng và ghi chú giao hàng" },
        items: { type: "string", description: "BẮT BUỘC: JSON danh sách sản phẩm: [{name, productCode, price, qty}]. Phải có để thống kê doanh thu theo sản phẩm." },
        channel: { type: "string", description: "Kênh bán hàng" }
      },
      required: ["customerName", "phone", "amount"]
    }
  },
  "vclaw.commerce.catalog_index": {
    description: "Lấy TOÀN BỘ danh mục sản phẩm active (tên và giá thật). BẮT BUỘC gọi trước khi trả lời khách hỏi sản phẩm/giá, hỏi shop bán gì, hoặc chỉ chào 'Alo/Hi/Chào shop'. Chỉ tư vấn sản phẩm trong catalog; không có trong catalog thì không bán và không bịa giá.",
    parameters: { type: "object", properties: {} }
  },
  "vclaw.commerce.get_sales_guidelines": {
    description: "Lấy quy tắc bán hàng và phong cách tư vấn (Persona).",
    parameters: { type: "object", properties: {} }
  },
  "vclaw.payment.create_pending": {
    description: "Tạo yêu cầu thanh toán chờ duyệt cho đơn hàng.",
    parameters: {
      type: "object",
      properties: {
        orderId: { type: "string" },
        amount: { type: "number" },
        method: { type: "string" }
      },
      required: ["orderId", "amount"]
    }
  },
  "vclaw.channel.status": {
    description: "Kiểm tra trạng thái kết nối các kênh Zalo, Telegram...",
    parameters: { type: "object", properties: {} }
  },
  "vclaw.conversation.append_outbound_draft": {
    description: "Lưu bản nháp tin nhắn phản hồi.",
    parameters: {
      type: "object",
      properties: {
        conversationId: { type: "string" },
        text: { type: "string" }
      },
      required: ["conversationId", "text"]
    }
  },
  "vclaw.product.create": {
    description: "Admin: Tạo một sản phẩm mới vào database.",
    parameters: {
      type: "object",
      properties: {
        name: { type: "string" },
        price: { type: "number" },
        productCode: { type: "string", description: "Mã sản phẩm duy nhất, VIẾT HOA, không khoảng trắng (vd: COFFEENAU)" },
        description: { type: "string" },
        category: { type: "string" },
        imageUrl: { type: "string", description: "URL ảnh chính" },
        imageUrls: { type: "array", items: { type: "string" }, description: "Danh sách URL ảnh (mảng)" },
        isAdmin: { type: "boolean", description: "Bắt buộc là true" }
      },
      required: ["name", "price"]
    }
  },
  "vclaw.product.extract_from_image": {
    description: "Admin: Bóc tách thông tin sản phẩm (tên, giá, mô tả) từ một hoặc nhiều ảnh bằng AI Vision.",
    parameters: {
      type: "object",
      properties: {
        imageUrl: { type: "string", description: "URL ảnh đơn lẻ" },
        imageUrls: { type: "array", items: { type: "string" }, description: "Mảng các URL ảnh" },
        isAdmin: { type: "boolean", description: "Bắt buộc là true" }
      },
      required: []
    }
  },
  "vclaw.product.list": {
    description: "Lấy danh sách sản phẩm active theo từ khóa hoặc danh mục. Dùng để tư vấn đúng sản phẩm thật, không lấy giá từ trí nhớ.",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string" },
        category: { type: "string" }
      }
    }
  },
  "vclaw.product.search": {
    description: "Tìm kiếm sản phẩm active trong catalog theo tên, mô tả hoặc danh mục. BẮT BUỘC dùng khi khách hỏi một sản phẩm cụ thể; nếu không có kết quả thì báo shop chưa có món đó và gợi sản phẩm gần nhất đang có, không bịa giá.",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "Tên sản phẩm, từ khóa, nhu cầu hoặc danh mục khách hỏi" }
      },
      required: ["query"]
    }
  },
  "vclaw.product.get": {
    description: "Lấy chi tiết một sản phẩm active theo ID hoặc tên để báo đúng giá/mô tả. Không dùng nếu chưa có sản phẩm khớp từ catalog/search.",
    parameters: {
      type: "object",
      properties: {
        id: { type: "string" },
        name: { type: "string" }
      }
    }
  },
  "vclaw.product.update": {
    description: "Admin: Cập nhật thông tin sản phẩm hiện có.",
    parameters: {
      type: "object",
      properties: {
        id: { type: "string", description: "ID của sản phẩm cần sửa" },
        name: { type: "string" },
        price: { type: "number" },
        productCode: { type: "string" },
        imageUrl: { type: "string" },
        imageUrls: { type: "array", items: { type: "string" } },
        isAdmin: { type: "boolean", description: "Bắt buộc là true" }
      },
      required: ["id"]
    }
  },
  "vclaw.ui.get_page_context": {
    description: "Lấy dữ liệu thực tế đang hiển thị trên màn hình hiện tại.",
    parameters: {
      type: "object",
      properties: {
        pathname: { type: "string", description: "Đường dẫn trang hiện tại" }
      },
      required: ["pathname"]
    }
  },
  "vclaw.system.status": {
    description: "Lấy trạng thái tổng quát của hệ thống (số lượng đơn hàng, sản phẩm, khách hàng).",
    parameters: { type: "object", properties: {} }
  },
  "vclaw.sessions.list": {
    description: "Lấy danh sách các phiên kết nối Zalo/Social đang hoạt động.",
    parameters: { type: "object", properties: {} }
  },
  "vclaw.customer.search": {
    description: "Tìm kiếm thông tin khách hàng theo tên hoặc số điện thoại.",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "Tên hoặc SĐT" }
      },
      required: ["query"]
    }
  },
  "vclaw.customer.get_orders": {
    description: "Lấy lịch sử đơn hàng của một khách hàng cụ thể.",
    parameters: {
      type: "object",
      properties: {
        customerId: { type: "string" }
      },
      required: ["customerId"]
    }
  },
  "vclaw.payment.generate_qr": {
    description: "Tạo mã QR VietQR. Nội dung CK (transferNote) PHẢI theo quy tắc: Madonhang sodienthoai masanpham xsoluong. TUYỆT ĐỐI KHÔNG dùng tên khách hàng trong nội dung CK.",
    parameters: {
      type: "object",
      properties: {
        amount: { type: "number", description: "Số tiền cần thanh toán" },
        orderId: { type: "string", description: "ID đơn hàng vừa tạo (ưu tiên dùng để tự lấy orderNumber làm nội dung CK)" },
        phone: { type: "string", description: "SĐT khách hàng (dùng khi chưa có orderId)" },
        description: { type: "string", description: "Nội dung chuyển khoản (chỉ ghi đè khi cần thiết)" }
      },
      required: ["amount"]
    }
  },
  "vclaw.booking.create": {
    description: "Tạo lịch hẹn mới cho khách hàng.",
    parameters: {
      type: "object",
      properties: {
        customerName: { type: "string" },
        phone: { type: "string" },
        serviceName: { type: "string" },
        dateStr: { type: "string", description: "YYYY-MM-DD" },
        timeStr: { type: "string", description: "HH:mm" }
      },
      required: ["customerName", "phone", "serviceName", "dateStr", "timeStr"]
    }
  },
  "vclaw.payment.list_pending": {
    description: "Admin: Liệt kê danh sách các khoản thanh toán đang chờ duyệt (PENDING).",
    parameters: {
      type: "object",
      properties: {
        isAdmin: { type: "boolean", description: "Bắt buộc là true" }
      },
      required: []
    }
  },
  "vclaw.booking.list_pending": {
    description: "Admin: Lấy danh sách lịch hẹn đang chờ duyệt.",
    parameters: {
      type: "object",
      properties: {
        isAdmin: { type: "boolean", description: "Bắt buộc là true" }
      },
      required: []
    }
  },
  "vclaw.booking.update_status": {
    description: "Admin: Duyệt hoặc từ chối lịch hẹn.",
    parameters: {
      type: "object",
      properties: {
        id: { type: "string" },
        status: { type: "string", enum: ["CONFIRMED", "CANCELLED", "DONE"] },
        isAdmin: { type: "boolean", description: "Bắt buộc là true" }
      },
      required: ["id", "status"]
    }
  },
  "vclaw.automation.enqueue_job": {
    description: "Admin: Tạo một chiến dịch marketing tự động chờ duyệt.",
    parameters: {
      type: "object",
      properties: {
        title: { type: "string" },
        campaignType: { type: "string", description: "Loại chiến dịch, VD: CSKH_FOLLOWUP, PROMO_DISCOUNT" },
        promptParams: { type: "object", description: "Các thông số ngữ cảnh cho AI sinh tin nhắn" },
        isAdmin: { type: "boolean", description: "Bắt buộc là true" }
      },
      required: ["title"]
    }
  },
  "vclaw.shop.update_settings": {
    description: "Admin: Cập nhật thông tin cấu hình cửa hàng (tên shop, VietQR).",
    parameters: {
      type: "object",
      properties: {
        shopName: { type: "string" },
        preferredChannel: { type: "string" },
        bankName: { type: "string" },
        accountNumber: { type: "string" },
        accountHolder: { type: "string" },
        isAdmin: { type: "boolean", description: "Bắt buộc là true" }
      },
      required: []
    }
  },
  "vclaw.report.get_snapshot": {
    description: "Admin: Lấy báo cáo doanh thu và thống kê.",
    parameters: {
      type: "object",
      properties: {
        isAdmin: { type: "boolean", description: "Bắt buộc là true" }
      },
      required: []
    }
  },
  "vclaw.payment.verify_bill": {
    description: "Ghi nhận và trích xuất thông tin từ ảnh bill (Số tiền, Mã GD) để đối soát - KHÔNG dùng để xác nhận thanh toán thực tế.",
    parameters: {
      type: "object",
      properties: {
        paymentId: { type: "string" },
        isAdmin: { type: "boolean", description: "Bắt buộc là true" }
      },
      required: ["paymentId"]
    }
  },
  "vclaw.order.fulfill": {
    description: "Admin: Hoàn tất xử lý đơn hàng (Gửi email vé hoặc đánh dấu đã giao).",
    parameters: {
      type: "object",
      properties: {
        orderId: { type: "string" },
        status: { type: "string", enum: ["COMPLETED", "CANCELLED", "PENDING"] },
        trackingNumber: { type: "string", description: "Mã vận đơn nếu có" },
        isAdmin: { type: "boolean", description: "Bắt buộc là true" }
      },
      required: ["orderId"]
    }
  },
  "vclaw.shipping.notify_shipper": {
    description: "Admin: Gửi tin nhắn thông báo cho Shipper qua Zalo.",
    parameters: {
      type: "object",
      properties: {
        orderId: { type: "string" },
        isAdmin: { type: "boolean", description: "Bắt buộc là true" }
      },
      required: ["orderId"]
    }
  },
  "vclaw.shipping.create_ghn_order": {
    description: "Tạo/khởi tạo vận đơn GHN cho đơn đã có (orderId). Gọi sau khi có địa chỉ ship và vclaw.order.create; không cần nhắc tên tool cho khách.",
    parameters: {
      type: "object",
      properties: {
        orderId: { type: "string" },
        isAdmin: { type: "boolean", description: "Bắt buộc là true" }
      },
      required: ["orderId"]
    }
  },
  "vclaw.shipping.cancel_ghn_order": {
    description: "Admin: Hủy đơn hàng trên GHN.",
    parameters: {
      type: "object",
      properties: {
        orderCode: { type: "string", description: "Mã vận đơn GHN (ví dụ: 5F5NH3LN)" },
        isAdmin: { type: "boolean" }
      },
      required: ["orderCode"]
    }
  },
  "vclaw.shipping.update_ghn_order": {
    description: "Admin: Cập nhật thông tin đơn hàng trên GHN.",
    parameters: {
      type: "object",
      properties: {
        payload: { 
          type: "object", 
          description: "Dữ liệu cập nhật, phải bao gồm order_code và các trường cần sửa" 
        },
        isAdmin: { type: "boolean" }
      },
      required: ["payload"]
    }
  },
  "vclaw.shipping.estimate_ghn_fee": {
    description:
      "Admin: Ước tính phí giao GHN theo mã quận/huyện nhận (toDistrictId), mã phường/xã (toWardCode) và khối lượng (gram). Cần cấu hình GHN Token + Shop ID trong shop settings.",
    parameters: {
      type: "object",
      properties: {
        toDistrictId: {
          type: "number",
          description: "ID quận/huyện nhận hàng theo master data GHN",
        },
        toWardCode: {
          type: "string",
          description: "Mã phường/xã nhận hàng theo GHN (ward_code)",
        },
        weightGrams: {
          type: "number",
          description: "Khối lượng kiện hàng (gram), > 0",
        },
        fromDistrictId: {
          type: "number",
          description: "Tuỳ chọn: ID quận/huyện gửi; mặc định hệ thống dùng giá trị nội bộ nếu bỏ trống",
        },
        isAdmin: { type: "boolean", description: "Bắt buộc là true" },
      },
      required: ["toDistrictId", "toWardCode", "weightGrams"],
    },
  },
  "vclaw.shipping.quote_from_address": {
    description:
      "Từ địa chỉ khách nhập tự do: tách tỉnh / quận / phường / đường rồi gợi ý phí giao (GHTK, GHN khi shop đã cấu hình). Dùng khi tư vấn phí ship trước khi tạo đơn.",
    parameters: {
      type: "object",
      properties: {
        rawAddress: {
          type: "string",
          description: "Địa chỉ nhận hàng tự nhiên (vd: 123 Lê Lợi, Quận 1, TP.HCM)",
        },
        weightKg: {
          type: "number",
          description: "Khối lượng kiện (kg), mặc định 0.5",
        },
      },
      required: ["rawAddress"],
    },
  },
} as const;

export const VCLAW_AGENT_TOOL_NAMES = Object.keys(VCLAW_AGENT_TOOLS_METADATA) as Array<keyof typeof VCLAW_AGENT_TOOLS_METADATA>;
