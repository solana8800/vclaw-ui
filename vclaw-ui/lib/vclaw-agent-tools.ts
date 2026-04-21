import { prisma } from "@/lib/prisma";
import { revalidateAdminPaths } from "@/lib/revalidate-admin";

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
            data: { name: customerName, phone, channel: "OpenClaw" },
          });
        } else if (customer.name !== customerName) {
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

export const VCLAW_AGENT_TOOL_NAMES = [
  "vclaw.order.create",
  "vclaw.payment.create_pending",
  "vclaw.conversation.append_outbound_draft",
] as const;
