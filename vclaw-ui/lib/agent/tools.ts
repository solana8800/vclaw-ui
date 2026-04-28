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
import { updateOrderFulfillment } from "@/lib/commerce/orders";
import { notifyShipperZalo } from "@/lib/actions/shipping-actions";
import { createGhnOrder, cancelGhnOrder, updateGhnOrder } from "@/lib/logistics/ghn-order";
import { tryGhnShippingFee } from "@/lib/logistics/ghn-quote";
import { getShippingEstimates, normalizeAddress } from "@/lib/logistics/shipping";

function newOrderNumber() {
  return `ORD-${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

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

        const orderNumber = newOrderNumber();
        const order = await prisma.order.create({
          data: {
            orderNumber,
            customerId: customer.id,
            amount,
            status: ["PENDING", "PAID", "PROCESSING", "DONE", "FOLLOW_UP"].includes(status)
              ? status
              : "PENDING",
            shippingNote,
          },
        });
        revalidateAdminPaths();
        result = {
          orderId: order.id,
          orderNumber: order.orderNumber,
          customerId: customer.id,
          // Gợi ý nội dung chuyển khoản chuẩn
          transferNote: `${orderNumber} ${(phone || "").slice(-4)}`.trim(),
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
          note: "Đây là toàn bộ danh mục sản phẩm của shop. Hãy dựa vào đây để biết shop có những gì." 
        };
        break;
      }
      case "vclaw.commerce.get_sales_guidelines": {
        const settings = await prisma.shopSettings.findFirst();
        result = {
          persona: `Bạn là Nhân viên bán hàng thực thụ của ${settings?.shopName ?? "VClaw"}.`,
          rules: [
            "PHÂN LOẠI DỮ LIỆU: [Công khai] Danh mục sản phẩm, giá, ảnh, thông tin shop. [Bảo mật] Thông tin khách hàng khác, doanh thu.",
            "XƯNG HÔ (BẮT BUỘC): KHÔNG dùng từ 'anh/chị'. Dựa vào tên/nick để ĐOÁN GIỚI TÍNH và xưng 'anh' hoặc 'chị'. NẾU KHÔNG XÁC ĐỊNH ĐƯỢC GIỚI TÍNH của khách từ tên qua AI và database thì HÃY XƯNG LÀ 'bạn'. Nếu khách hàng sửa cách xưng hô (ví dụ: 'gọi tôi là chú', 'chị chứ không phải anh'), xin lỗi nhẹ nhàng, lập tức đổi cách gọi theo ý khách, và PHẢI gọi tool vclaw.customer.upsert để lưu giới tính (gender) hoặc tên gọi ưu tiên (preferredName). Cố gắng hỏi tên khách nếu chưa biết để tiện xưng hô.",
            "PHONG CÁCH (BẮT BUỘC): Trả lời CỰC KỲ NGẮN GỌN, súc tích. Tránh giải thích dài dòng.",
            "TRUY XUẤT (BẮT BUỘC): Luôn dùng danh mục sản phẩm (Công khai) để tư vấn khách. Tuyệt đối KHÔNG tiết lộ thông tin Bảo mật.",
            "MỤC TIÊU (BẮT BUỘC): Luôn hướng khách về việc xem sản phẩm, chốt đơn và thanh toán.",
            "DANH TÍNH: Tuyệt đối KHÔNG nhận là AI/bot. Bạn là nhân viên thực tế của shop.",
            "QR CODE: Luôn dùng tool phát sinh QR và đặt link ở cuối tin nhắn."
          ]
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
            const last4 = (ord.customer?.phone || "").slice(-4);
            finalDesc = `${ord.orderNumber}${last4 ? " " + last4 : ""}`.trim();
          }
        }
        // Fallback: dùng phone/zaloId
        if (!finalDesc) {
          const identifier = String(args.phone || args.zaloId || "").trim();
          finalDesc = identifier.slice(-4) ? `DH ${identifier.slice(-4)}` : "VClaw";
        }

        const qrUrl = generateVietQRUrl({
          bankId: settings.bankName,
          accountNo: settings.accountNumber,
          accountName: settings.accountHolder || "",
          amount: amount > 0 ? amount : undefined,
          description: finalDesc,
        });

        result = {
          qrUrl,
          transferNote: finalDesc,
          message: `QR ${amount.toLocaleString()}đ — Nội dung CK: "${finalDesc}"`,
          instruction: "Gửi link ảnh QR cho khách ở DÒNG RIÊNG để Zalo hiển thị ảnh to.",
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
          salesPersona: "Bạn là nhân viên bán hàng chuyên nghiệp, luôn kiểm tra database trước khi tư vấn."
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
        const name = String(args.name ?? "").trim();
        const price = Number(args.price);
        if (!name || !Number.isFinite(price)) throw new Error("missing_name_or_price");
        const product = await prisma.product.create({
          data: {
            name,
            price,
            description: args.description ? String(args.description) : null,
            imageUrl: args.imageUrl ? String(args.imageUrl) : null,
            category: args.category ? String(args.category) : null,
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
        if (args.category != null) data.category = String(args.category);
        if (args.status) data.status = String(args.status);

        const product = await prisma.product.update({
          where: { id },
          data: data as any, // ép kiểu về bất kỳ để prisma chấp nhận Record
        });
        revalidateAdminPaths();
        result = { product };
        break;
      }
      case "vclaw.product.extract_from_image": {
        if (!args.isAdmin) throw new Error("permission_denied:admin_only");
        const imageUrl = String(args.imageUrl ?? "").trim();
        if (!imageUrl) throw new Error("missing_imageUrl");
        // Mocking extraction logic
        result = {
          name: "Sản phẩm từ ảnh",
          price: 50000,
          description: "Thông tin được trích xuất tự động từ AI",
          category: "Chưa phân loại",
          confidence: 0.85,
          imageUrl,
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
          note: "Đây là danh sách các tài khoản Zalo/Social đang kết nối với hệ thống."
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
        result = { booking, note: "Booking đã được tạo và đang chờ chủ shop duyệt." };
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
        
        result = { success: true, note: "Chiến dịch đã được đưa vào hàng đợi chờ duyệt." };
        break;
      }
      case "vclaw.shop.update_settings": {
        if (!args.isAdmin) throw new Error("permission_denied:admin_only");
        await upsertShopSettings(args as any);
        result = { success: true, note: "Cấu hình cửa hàng đã được cập nhật thành công." };
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

        const ghnResult = await createGhnOrder(order);
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
    description: "Tạo đơn hàng mới. BẮT BUỘC phải có tên + SĐT + tổng tiền trước khi gọi tool này.",
    parameters: {
      type: "object",
      properties: {
        customerName: { type: "string", description: "Họ tên khách hàng (bắt buộc)" },
        phone: { type: "string", description: "Số điện thoại (bắt buộc)" },
        email: { type: "string", description: "Email khách hàng (tuỳ chọn)" },
        amount: { type: "number", description: "Tổng tiền thanh toán" },
        status: { type: "string", enum: ["PENDING", "PROCESSING", "FOLLOW_UP"], description: "Trạng thái đơn (Mặc định PENDING)" },
        shippingNote: { type: "string", description: "Địa chỉ nhận hàng và ghi chú giao hàng" },
        items: { type: "string", description: "JSON danh sách sản phẩm: [{name, price, qty}]" },
        channel: { type: "string", description: "Kênh bán hàng" }
      },
      required: ["customerName", "phone", "amount"]
    }
  },
  "vclaw.commerce.catalog_index": {
    description: "Lấy TOÀN BỘ danh mục sản phẩm (tên và giá). Gọi ngay khi khách hỏi 'Shop bán gì?'",
    parameters: { type: "object", properties: {} }
  },
  "vclaw.commerce.get_sales_guidelines": {
    description: "Lấy quy tắc bán hàng và phong cách tư vấn (Persona).",
    parameters: { type: "object", properties: {} }
  },
  "vclaw.product.list": {
    description: "Lấy danh sách sản phẩm chi tiết có mô tả.",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "Từ khóa tìm kiếm" },
        category: { type: "string", description: "Danh mục sản phẩm" }
      }
    }
  },
  "vclaw.product.search": {
    description: "Tìm kiếm sản phẩm chi tiết theo từ khóa.",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "Từ khóa tìm kiếm" }
      },
      required: ["query"]
    }
  },
  "vclaw.shop.get_info": {
    description: "Lấy thông tin shop và lời khuyên tư vấn.",
    parameters: { type: "object", properties: {} }
  },
  "vclaw.product.get": {
    description: "Lấy chi tiết một sản phẩm cụ thể.",
    parameters: {
      type: "object",
      properties: {
        id: { type: "string", description: "ID sản phẩm" }
      },
      required: ["id"]
    }
  },
  "vclaw.product.create": {
    description: "Admin: Tạo sản phẩm mới.",
    parameters: {
      type: "object",
      properties: {
        name: { type: "string" },
        price: { type: "number" },
        description: { type: "string" },
        imageUrl: { type: "string" },
        category: { type: "string" },
        isAdmin: { type: "boolean", description: "Bắt buộc là true" }
      },
      required: ["name", "price", "isAdmin"]
    }
  },
  "vclaw.product.update": {
    description: "Admin: Cập nhật sản phẩm.",
    parameters: {
      type: "object",
      properties: {
        id: { type: "string" },
        name: { type: "string" },
        price: { type: "number" },
        description: { type: "string" },
        imageUrl: { type: "string" },
        category: { type: "string" },
        status: { type: "string" },
        isAdmin: { type: "boolean", description: "Bắt buộc là true" }
      },
      required: ["id", "isAdmin"]
    }
  },
  "vclaw.product.extract_from_image": {
    description: "Admin: Trích xuất thông tin sản phẩm từ ảnh.",
    parameters: {
      type: "object",
      properties: {
        imageUrl: { type: "string" },
        isAdmin: { type: "boolean", description: "Bắt buộc là true" }
      },
      required: ["imageUrl", "isAdmin"]
    }
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
    description: "Tạo mã QR VietQR. Luôn truyền orderId sau khi tạo đơn để nội dung CK tự động là số đơn hàng.",
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
      required: ["isAdmin"]
    }
  },
  "vclaw.booking.list_pending": {
    description: "Admin: Lấy danh sách lịch hẹn đang chờ duyệt.",
    parameters: {
      type: "object",
      properties: {
        isAdmin: { type: "boolean", description: "Bắt buộc là true" }
      },
      required: ["isAdmin"]
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
      required: ["id", "status", "isAdmin"]
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
      required: ["title", "isAdmin"]
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
      required: ["isAdmin"]
    }
  },
  "vclaw.report.get_snapshot": {
    description: "Admin: Lấy báo cáo doanh thu và thống kê.",
    parameters: {
      type: "object",
      properties: {
        isAdmin: { type: "boolean", description: "Bắt buộc là true" }
      },
      required: ["isAdmin"]
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
      required: ["paymentId", "isAdmin"]
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
      required: ["orderId", "isAdmin"]
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
      required: ["orderId", "isAdmin"]
    }
  },
  "vclaw.shipping.create_ghn_order": {
    description: "Admin: Tạo đơn giao hàng trên Giao Hàng Nhanh (GHN).",
    parameters: {
      type: "object",
      properties: {
        orderId: { type: "string" },
        isAdmin: { type: "boolean", description: "Bắt buộc là true" }
      },
      required: ["orderId", "isAdmin"]
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
      required: ["orderCode", "isAdmin"]
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
      required: ["payload", "isAdmin"]
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
      required: ["toDistrictId", "toWardCode", "weightGrams", "isAdmin"],
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
