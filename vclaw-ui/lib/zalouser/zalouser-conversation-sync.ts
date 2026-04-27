import { revalidateAdminPaths } from "@/lib/admin/revalidate";
import { parseSessionMessageBubble } from "@/lib/zalouser/zalouser-chat-format";
import { classifyIntent, getIntentLabel } from "@/lib/ai/intent-classifier";

export const ZALOUSER_PROVIDER = "zalouser";

export type ZalouserDirection = "IN" | "OUT" | "STAFF" | "SYSTEM";

export type NormalizedZalouserMessage = {
  provider: typeof ZALOUSER_PROVIDER;
  externalThreadId: string;
  openclawSessionKey: string;
  direction: ZalouserDirection;
  body: string;
  externalMessageId: string | null;
  createdAt?: Date;
  rawPayloadJson: string;
};

export type ZalouserConversationRepo = {
  getOrCreateConversationSession(input: {
    provider: typeof ZALOUSER_PROVIDER;
    externalThreadId: string;
    title: string;
    openclawSessionKey: string;
    selfAccountId?: string | null;
  }): Promise<{ id: string }>;
  findMessageByExternalId(
    conversationId: string,
    externalMessageId: string,
  ): Promise<{ id: string } | null>;
  createMessage(input: {
    conversationId: string;
    direction: ZalouserDirection;
    body: string;
    externalMessageId: string | null;
    rawPayloadJson: string;
    createdAt?: Date;
  }): Promise<{ id: string }>;
  addLabelToCustomer?(customerId: string, newLabel: string): Promise<void>;
};

export function buildZalouserSessionKey(externalThreadId: string): string {
  return `agent:main:zalouser:${externalThreadId.trim()}`;
}

function stringField(obj: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const v = obj[key];
    if (typeof v === "string" && v.trim()) return v.trim();
    if (typeof v === "number" && Number.isFinite(v)) return String(v);
  }
  return "";
}

function stableHash(value: string): string {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash.toString(36);
}

function messageDate(message: Record<string, unknown>): Date | undefined {
  const raw =
    message.createdAt ??
    message.timestamp ??
    message.time ??
    message.date;
  if (raw instanceof Date && !Number.isNaN(raw.getTime())) return raw;
  if (typeof raw === "number" && Number.isFinite(raw)) {
    const ms = raw > 10_000_000_000 ? raw : raw * 1000;
    const d = new Date(ms);
    return Number.isNaN(d.getTime()) ? undefined : d;
  }
  if (typeof raw === "string" && raw.trim()) {
    const d = new Date(raw);
    return Number.isNaN(d.getTime()) ? undefined : d;
  }
  return undefined;
}

function messageExternalId(params: {
  sessionKey: string;
  direction: ZalouserDirection;
  body: string;
  message: Record<string, unknown>;
  fallbackIndex?: number;
}): string | null {
  const direct = stringField(params.message, [
    "id",
    "messageId",
    "externalMessageId",
    "sid",
    "mid",
  ]);
  if (direct) return direct;
  if (!params.body.trim()) return null;
  const createdAt = messageDate(params.message)?.toISOString() ?? "";
  const source = [
    params.sessionKey,
    params.direction,
    params.body,
    createdAt,
    params.fallbackIndex ?? "",
  ].join("|");
  return `history:${stableHash(source)}`;
}

function safeJson(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    return JSON.stringify({ unserializable: true });
  }
}

export function normalizeZalouserHistoryMessage(input: {
  sessionKey: string;
  externalThreadId: string;
  message: unknown;
  fallbackIndex?: number;
  selfAccountId?: string | null;
}): NormalizedZalouserMessage | null {
  if (!input.message || typeof input.message !== "object") return null;
  const message = input.message as Record<string, unknown>;
  const bubble = parseSessionMessageBubble(
    {
      sessionKey: input.sessionKey,
      message,
    },
    input.selfAccountId,
  );
  const body = bubble.text.trim();
  if (!body) return null;
  const direction: ZalouserDirection =
    bubble.side === "them" ? "IN" : bubble.side === "staff" ? "STAFF" : bubble.side === "you" ? "OUT" : "SYSTEM";
  return {
    provider: ZALOUSER_PROVIDER,
    externalThreadId: input.externalThreadId,
    openclawSessionKey: input.sessionKey,
    direction,
    body,
    externalMessageId: messageExternalId({
      sessionKey: input.sessionKey,
      direction,
      body,
      message,
      fallbackIndex: input.fallbackIndex,
    }),
    createdAt: messageDate(message),
    rawPayloadJson: safeJson(message),
  };
}

export async function createPrismaZalouserConversationRepo(): Promise<ZalouserConversationRepo> {
  const { prisma } = await import("@/lib/db");
  return {
    async getOrCreateConversationSession(input) {
      // 1. Tìm hoặc tạo Customer (Khách hàng)
      let customerId: string | null = null;
      try {
        const peer = await prisma.integrationPeer.findUnique({
          where: {
            provider_peerId: {
              provider: input.provider,
              peerId: input.externalThreadId,
            },
          },
        });

        const customerName = peer?.name || input.title || input.externalThreadId;
        const existingCustomer = await prisma.customer.findFirst({
          where: {
            channel: input.provider,
            OR: [{ name: customerName }, { phone: input.externalThreadId }],
          },
        });

        if (existingCustomer) {
          customerId = existingCustomer.id;
        } else {
          const newCustomer = await prisma.customer.create({
            data: {
              name: customerName,
              channel: input.provider,
            },
          });
          customerId = newCustomer.id;
        }
      } catch (e) {
        console.warn("[Zalo] Lỗi liên kết Customer:", e);
      }

      // 2. Tìm hội thoại gần nhất cho Thread này
      const latest = await prisma.conversation.findFirst({
        where: {
          provider: input.provider,
          externalThreadId: input.externalThreadId,
        },
        orderBy: { updatedAt: "desc" },
      });

      const SESSION_GAP_MS = 4 * 60 * 60 * 1000; // 4 tiếng
      const now = new Date();

      // Nếu có hội thoại cũ và chưa quá 4 tiếng -> Dùng lại
      if (latest && now.getTime() - latest.updatedAt.getTime() < SESSION_GAP_MS) {
        return prisma.conversation.update({
          where: { id: latest.id },
          data: {
            title: input.title,
            openclawSessionKey: input.openclawSessionKey,
            updatedAt: now,
            status: "OPEN",
            customerId: customerId || latest.customerId,
          },
          select: { id: true, customerId: true },
        });
      }

      // Ngược lại -> Tạo hội thoại mới (Session mới)
      return prisma.conversation.create({
        data: {
          provider: input.provider,
          externalThreadId: input.externalThreadId,
          title: input.title,
          openclawSessionKey: input.openclawSessionKey,
          status: "OPEN",
          customerId,
        },
        select: { id: true, customerId: true },
      });
    },
    async addLabelToCustomer(customerId, newLabel) {
      const { prisma } = await import("@/lib/db");
      const customer = await prisma.customer.findUnique({ where: { id: customerId } });
      if (!customer) return;

      let currentLabels: string[] = [];
      try {
        currentLabels = JSON.parse(customer.labels || "[]");
        if (!Array.isArray(currentLabels)) currentLabels = [];
      } catch {
        currentLabels = [];
      }

      if (!currentLabels.includes(newLabel)) {
        currentLabels.push(newLabel);
        await prisma.customer.update({
          where: { id: customerId },
          data: { labels: JSON.stringify(currentLabels) },
        });
      }
    },
    findMessageByExternalId(conversationId, externalMessageId) {
      return prisma.conversationMessage.findFirst({
        where: { conversationId, externalMessageId },
        select: { id: true },
      });
    },
    createMessage(input) {
      return prisma.conversationMessage.create({
        data: {
          conversationId: input.conversationId,
          direction: input.direction,
          body: input.body,
          externalMessageId: input.externalMessageId,
          rawPayloadJson: input.rawPayloadJson,
          ...(input.createdAt ? { createdAt: input.createdAt } : {}),
        },
        select: { id: true },
      });
    },
  };
}

export async function syncZalouserHistoryMessages(input: {
  repo?: ZalouserConversationRepo;
  sessionKey: string;
  externalThreadId: string;
  title?: string | null;
  messages: unknown[];
  revalidate?: boolean;
  selfAccountId?: string | null;
  ignoreSelf?: boolean;
}) {
  const repo = input.repo ?? (await createPrismaZalouserConversationRepo());
  const title =
    typeof input.title === "string" && input.title.trim()
      ? input.title.trim()
      : `Zalo: ${input.externalThreadId}`;
  const conversation = await repo.getOrCreateConversationSession({
    provider: ZALOUSER_PROVIDER,
    externalThreadId: input.externalThreadId,
    title,
    openclawSessionKey: input.sessionKey,
    selfAccountId: input.selfAccountId,
  });

  const ignoreSelf = input.ignoreSelf ?? true;

  let inserted = 0;
  let skipped = 0;
  for (let i = 0; i < input.messages.length; i += 1) {
    const normalized = normalizeZalouserHistoryMessage({
      sessionKey: input.sessionKey,
      externalThreadId: input.externalThreadId,
      message: input.messages[i],
      fallbackIndex: i,
      selfAccountId: input.selfAccountId,
    });

    if (!normalized) {
      skipped += 1;
      continue;
    }

    // Nếu là tin nhắn từ chính mình (OUT) và được yêu cầu bỏ qua
    if (ignoreSelf && normalized.direction === "OUT") {
      const msgRaw = (input.messages[i] as Record<string, unknown>) || {};
      const role = String(msgRaw.role || "").toLowerCase();
      // Chỉ giữ lại nếu là assistant/model/tool (do Bot/Admin gửi)
      // Còn nếu là user (nhưng isSelf) thì bỏ qua
      if (role !== "assistant" && role !== "model" && role !== "tool") {
        skipped += 1;
        continue;
      }
    }

    if (normalized.externalMessageId) {
      const existing = await repo.findMessageByExternalId(
        conversation.id,
        normalized.externalMessageId,
      );
      if (existing) {
        skipped += 1;
        continue;
      }
    }
    await repo.createMessage({
      conversationId: conversation.id,
      direction: normalized.direction,
      body: normalized.body,
      externalMessageId: normalized.externalMessageId,
      rawPayloadJson: normalized.rawPayloadJson,
      createdAt: normalized.createdAt,
    });
    console.log(`[Zalo] Đã lưu tin nhắn (${normalized.direction}): ${normalized.body.substring(0, 30)}${normalized.body.length > 30 ? "..." : ""}`);

    // Auto-labeling (Task 3)
    if (normalized.direction === "IN" && (conversation as any).customerId && repo.addLabelToCustomer) {
      const intent = classifyIntent(normalized.body);
      if (intent !== "GENERAL") {
        const label = getIntentLabel(intent);
        console.log(`[AI] Phát hiện ý định: ${label}. Đang gán nhãn cho khách hàng...`);
        await repo.addLabelToCustomer((conversation as any).customerId, label);
      }
    }

    inserted += 1;
  }

  if (inserted > 0 && input.revalidate !== false) revalidateAdminPaths();
  return { conversationId: conversation.id, inserted, skipped };
}

/** Xử lý sự kiện từ OpenClaw Gateway (cho cả Webhook và Server Action). */
export async function handleZalouserGatewayEvent(event: string, payload: unknown) {
  if (event !== "session.message") return { success: false, reason: "unsupported_event" };

  const p = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};
  const sessionKey = typeof p.sessionKey === "string" ? p.sessionKey : "";
  const message = p.message;

  console.log(`[Zalo Event] Xử lý sự kiện ${event} cho session: ${sessionKey}`);

  if (!sessionKey || !message) {
    console.warn("[Zalo Event] Payload không hợp lệ (thiếu sessionKey hoặc message)");
    return { success: false, reason: "invalid_payload" };
  }

  // Extract externalThreadId từ sessionKey (format: agent:main:zalouser:THREAD_ID)
  const parts = sessionKey.split(":");
  const externalThreadId = parts[parts.length - 1];
  if (!externalThreadId) return { success: false, reason: "invalid_session_key" };

  try {
    const { prisma } = await import("@/lib/db");
    const currentAccount = await prisma.integrationAccount.findUnique({
      where: { provider: ZALOUSER_PROVIDER },
    });
    const selfAccountId = currentAccount?.accountId;

    const result = await syncZalouserHistoryMessages({
      sessionKey,
      externalThreadId,
      messages: [message],
      selfAccountId,
      ignoreSelf: true,
      revalidate: true,
    });
    return { success: true, ...result };
  } catch (error) {
    console.error(`[Zalo] handleZalouserGatewayEvent error (${event}):`, error);
    return { success: false, error: String(error) };
  }
}
