import {
  getIntegrationAccounts,
  getIntegrationConnectionsPublic,
} from "@/lib/actions/integration-actions";
import { prisma } from "@/lib/db";
import { revalidateAdminPaths } from "@/lib/admin/revalidate";

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
      case "vclaw.order.create": {
        const customerName = String(args.customerName ?? "Khách").trim() || "Khách";
        const phone = args.phone != null ? String(args.phone).trim() || null : null;
        const amount = Number(args.amount);
        const status = String(args.status ?? "PENDING").toUpperCase();
        if (!Number.isFinite(amount) || amount <= 0) {
          throw new Error("invalid_amount");
        }
        let customer =
          phone ? await prisma.customer.findFirst({ where: { phone } }) : null;
        if (!customer) {
          customer = await prisma.customer.create({
            data: { name: customerName, phone, channel: args.channel ? String(args.channel) : "OpenClaw" },
          });
        } else if (customer.name !== customerName && args.updateCustomerName) {
          customer = await prisma.customer.update({
            where: { id: customer.id },
            data: { name: customerName },
          });
        }
        const order = await prisma.order.create({
          data: {
            orderNumber: newOrderNumber(),
            customerId: customer.id,
            amount,
            status: ["PENDING", "PAID", "PROCESSING", "DONE", "FOLLOW_UP"].includes(status)
              ? status
              : "PENDING",
          },
        });
        revalidateAdminPaths();
        result = { orderId: order.id, orderNumber: order.orderNumber, customerId: customer.id };
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
          persona: `Bạn là chuyên gia tư vấn bán hàng (Best Seller) của ${settings?.shopName ?? "VClaw"}.`,
          rules: [
            "BẮT BUỘC kiểm tra catalog_index hoặc search trước khi trả lời về giá hoặc sản phẩm.",
            "KHÔNG ĐƯỢC tự bịa ra sản phẩm hoặc giá nếu không thấy trong database.",
            "Phong cách: Thân thiện, nhiệt tình, chuyên nghiệp, ngôn ngữ tự nhiên như người thật.",
            "Cá nhân hóa (Personalization): Hãy gọi `vclaw.customer.get_orders` nếu biết khách là ai để tư vấn dựa trên lịch sử mua hàng.",
            "Kỹ thuật bán hàng: Hãy chủ động gợi ý combo hoặc sản phẩm liên quan để tăng giá trị đơn hàng (Upsell/Cross-sell).",
            "Tư vấn thông minh: Nếu khách chê đắt, hãy nhấn mạnh vào giá trị và chất lượng sản phẩm.",
            "Xử lý khi hết hàng: Nếu sản phẩm khách tìm không có, hãy lịch sự xin lỗi và gợi ý ngay sản phẩm tương tự có sẵn.",
            "Chốt đơn: Nếu khách có ý định mua, hãy CHỦ ĐỘNG hỏi để lên đơn ngay (VD: 'Để mình lên đơn cho bạn nhé?')."
          ]
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
          preferredChannel: settings?.preferredChannel ?? "Zalo",
          bankName: settings?.bankName,
          accountHolder: settings?.accountHolder,
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
  "vclaw.order.create": {
    description: "Tạo đơn hàng mới cho khách hàng.",
    parameters: {
      type: "object",
      properties: {
        customerName: { type: "string", description: "Tên khách hàng" },
        phone: { type: "string", description: "Số điện thoại" },
        amount: { type: "number", description: "Tổng tiền" },
        status: { type: "string", enum: ["PENDING", "PAID", "PROCESSING", "DONE", "FOLLOW_UP"], description: "Trạng thái đơn hàng" },
        channel: { type: "string", description: "Kênh bán hàng (Zalo, Telegram...)" },
        updateCustomerName: { type: "boolean", description: "Cập nhật lại tên nếu khách đã tồn tại" }
      },
      required: ["amount"]
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
} as const;

export const VCLAW_AGENT_TOOL_NAMES = Object.keys(VCLAW_AGENT_TOOLS_METADATA) as Array<keyof typeof VCLAW_AGENT_TOOLS_METADATA>;
