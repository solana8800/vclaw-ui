import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { revalidateAdminPaths } from "@/lib/admin/revalidate";
import { parseSessionMessageBubble } from "@/lib/zalouser/zalouser-chat-format";
import {
  buildZalouserSessionKey,
  normalizeZalouserThreadTarget,
} from "@/lib/zalouser/zalouser-session-key";
import { classifyIntent, getIntentLabel } from "@/lib/ai/intent-classifier";

const ZALOUSER_PROVIDER = "zalouser";

type ZalouserDirection = "IN" | "OUT" | "STAFF" | "SYSTEM";

type NormalizedZalouserMessage = {
  provider: string; // Đã bỏ gán cứng ZALOUSER_PROVIDER
  externalThreadId: string;
  openclawSessionKey: string;
  direction: ZalouserDirection;
  body: string;
  externalMessageId: string | null;
  createdAt?: Date;
  rawPayloadJson: string;
};

type ZalouserConversationRepo = {
  getOrCreateConversationSession(input: {
    provider: string;
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

export { buildZalouserSessionKey };

function formatDateInTimeZone(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function shouldStartNewZalouserConversation(input: {
  latestUpdatedAt: Date;
  now: Date;
  timeZone?: string;
}): boolean {
  const timeZone = input.timeZone || "Asia/Ho_Chi_Minh";
  return (
    formatDateInTimeZone(input.latestUpdatedAt, timeZone) !==
    formatDateInTimeZone(input.now, timeZone)
  );
}

function resolveZalouserProviderThreadFromSessionKey(sessionKey: string): {
  provider: string;
  externalThreadId: string;
} {
  const parts = sessionKey.split(":");
  const provider = parts[2] || ZALOUSER_PROVIDER;
  const rawTarget = parts.slice(3).join(":").trim();
  if (provider !== ZALOUSER_PROVIDER) {
    return { provider, externalThreadId: rawTarget || parts[parts.length - 1] || "" };
  }

  const target = normalizeZalouserThreadTarget(rawTarget);
  const externalThreadId =
    target.kind === "group" ? `group:${target.id}` : `user:${target.id}`;
  return { provider, externalThreadId };
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

function normalizePeerId(id: string, provider: string): string | null {
  const cleanId = id.trim();
  if (provider === "zalouser") {
    const target = normalizeZalouserThreadTarget(cleanId);
    return target.kind === "direct" ? `user:${target.id}` : null;
  }
  return cleanId;
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

function normalizeZalouserHistoryMessage(input: {
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
  let body = bubble.text.trim();
  if (!body) return null;

  // Trích xuất provider từ sessionKey (format: agent:account:PROVIDER:...)
  const parts = input.sessionKey.split(":");
  const extractedProvider = parts[2] || ZALOUSER_PROVIDER;

  const direction: ZalouserDirection =
    bubble.side === "them" ? "IN" : bubble.side === "staff" ? "STAFF" : bubble.side === "you" ? "OUT" : "SYSTEM";

  // NHẬN DIỆN ADMIN GỬI TỪ TELEGRAM:
  // Nếu tin nhắn đến từ phía "them" nhưng sender_id khớp với admin config -> Đổi thành STAFF
  if (direction === "IN" && extractedProvider === "telegram") {
    // Chúng ta sẽ kiểm tra senderId này trong logic xử lý sự kiện để gán STAFF chính xác hơn
  }

  // 1. Chuyển đổi Sticker JSON thành mô tả văn bản
  if (body.startsWith("{") && body.endsWith("}")) {
    try {
      const data = JSON.parse(body);
      if (data.id !== undefined && data.catId !== undefined) {
        body = "(Khách hàng vừa gửi một Sticker biểu cảm rất dễ thương.)";
      }
    } catch (e) { 
      /* Không phải sticker JSON */ 
      console.error("Failed to parse sticker JSON", e);
    }
  }

  // Nếu là Group, thử thêm tên người gửi vào nội dung để dễ nhận diện
  if (input.externalThreadId.startsWith("group:") && direction === "IN") {
    const senderObj = (message.sender as any) || {};
    const senderName = String(senderObj.name || senderObj.displayName || (message as any).senderName || "").trim();
    if (senderName) {
      body = `[${senderName}]: ${body}`;
    }
  }

  return {
    provider: extractedProvider,
    externalThreadId: input.externalThreadId,
    openclawSessionKey: input.sessionKey,
    direction,
    body: body,
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
        const normalizedPeerId = normalizePeerId(input.externalThreadId, input.provider);
        const peer = normalizedPeerId
          ? await prisma.integrationPeer.findUnique({
              where: {
                provider_peerId: {
                  provider: input.provider,
                  peerId: normalizedPeerId,
                },
              },
            })
          : null;

        // TRA CỨU Tên thật (Peer hoặc Group)
        let finalRealName: string | null = null;
        let finalPeer = peer;
        
        if (input.provider === "zalouser" && input.externalThreadId.startsWith("group:")) {
          const gid = input.externalThreadId.replace("group:", "");
          const group = await prisma.integrationGroup.findUnique({ where: { groupId: gid } });
          if (group) finalRealName = group.name;
        } else {
          // Nếu không tìm thấy peer bằng normalized ID, thử tra cứu bằng ID gốc
          if (!finalPeer && normalizedPeerId && normalizedPeerId !== input.externalThreadId) {
            finalPeer = await prisma.integrationPeer.findUnique({
              where: {
                provider_peerId: {
                  provider: input.provider,
                  peerId: input.externalThreadId,
                },
              },
            });
          }
          if (finalPeer) finalRealName = finalPeer.name;
        }

        const customerName = finalRealName || input.title || input.externalThreadId;
        const existingCustomer = await prisma.customer.findFirst({
          where: {
            channel: input.provider,
            OR: [
              { name: customerName }, 
              { name: { contains: input.externalThreadId } },
              { phone: input.externalThreadId }
            ],
          },
        });

        if (existingCustomer) {
          customerId = existingCustomer.id;
          // TỰ ĐỘNG CẬP NHẬT TÊN: Nếu khách hàng hiện tại đang để tên là ID hoặc tên mặc định, 
          // và chúng ta vừa tìm thấy tên thật từ IntegrationPeer, hãy cập nhật ngay.
          const isFallbackName = 
            existingCustomer.name.includes(input.externalThreadId) || 
            existingCustomer.name.startsWith("Hội thoại") ||
            existingCustomer.name === "Zalo User";
            
          if (isFallbackName && finalRealName && finalRealName !== existingCustomer.name) {
            console.log(`[Zalo] Cập nhật tên thật cho khách hàng: ${existingCustomer.name} -> ${finalRealName}`);
            await prisma.customer.update({
              where: { id: customerId },
              data: { name: finalRealName }
            });
          }
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

      const now = new Date();

      // Nếu vẫn trong cùng ngày local -> dùng lại hội thoại hiện tại.
      if (latest && !shouldStartNewZalouserConversation({ latestUpdatedAt: latest.updatedAt, now })) {
        // Cập nhật title nếu title cũ là ID và giờ đã có tên thật
        let finalTitle = input.title;
        const isFallbackTitle = latest.title?.includes(input.externalThreadId) || latest.title?.startsWith("Hội thoại");
        if (isFallbackTitle && customerId) {
          const c = await prisma.customer.findUnique({ where: { id: customerId }, select: { name: true } });
          if (c && !c.name.includes(input.externalThreadId)) {
            finalTitle = `Hội thoại ${input.provider === "telegram" ? "Telegram" : "Zalo"}: ${c.name}`;
          }
        }

        return prisma.conversation.update({
          where: { id: latest.id },
          data: {
            title: finalTitle,
            openclawSessionKey: input.openclawSessionKey,
            updatedAt: now,
            status: "OPEN",
            customerId: customerId || latest.customerId,
          },
          select: { id: true, customerId: true },
        });
      }

      // Ngược lại -> Tạo hội thoại mới (Session mới)
      let finalNewTitle = input.title;
      if (customerId) {
        const c = await prisma.customer.findUnique({ where: { id: customerId }, select: { name: true } });
        if (c && !c.name.includes(input.externalThreadId)) {
          finalNewTitle = `Hội thoại ${input.provider === "telegram" ? "Telegram" : "Zalo"}: ${c.name}`;
        }
      }

      return prisma.conversation.create({
        data: {
          provider: input.provider,
          externalThreadId: input.externalThreadId,
          title: finalNewTitle,
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
  
  const { provider: extractedProvider } =
    resolveZalouserProviderThreadFromSessionKey(input.sessionKey);

  const providerLabel = extractedProvider === "telegram" ? "Telegram" : extractedProvider === "zalouser" ? "Zalo" : extractedProvider;

  const title =
    typeof input.title === "string" && input.title.trim()
      ? input.title.trim()
      : `${providerLabel}: ${input.externalThreadId}`;
      
  const conversation = await repo.getOrCreateConversationSession({
    provider: extractedProvider,
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
export async function handleZalouserGatewayEvent(
  event: string, 
  payload: unknown
) {
  if (event !== "session.message") return { success: false, reason: "unsupported_event" };

  const p = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};
  const sessionKey = typeof p.sessionKey === "string" ? p.sessionKey : "";
  const message = p.message;

  console.log(`[Zalo Event] Xử lý sự kiện ${event} cho session: ${sessionKey}`);

  if (!sessionKey || !message) {
    console.warn("[Zalo Event] Payload không hợp lệ (thiếu sessionKey hoặc message)");
    return { success: false, reason: "invalid_payload" };
  }

  const { provider: extractedProvider, externalThreadId } =
    resolveZalouserProviderThreadFromSessionKey(sessionKey);
  
  if (!externalThreadId) return { success: false, reason: "invalid_session_key" };

  try {
    const { prisma } = await import("@/lib/db");
    
    // Extract accountId cho integrationAccount
    const currentAccount = await prisma.integrationAccount.findUnique({
      where: { provider: extractedProvider },
    });
    const selfAccountId = currentAccount?.accountId;
    
    // Kiểm tra xem đây có phải là Admin gửi từ Telegram không
    let isStaffFromTelegram = false;
    if (extractedProvider === "telegram") {
      const msgRaw = (message as Record<string, unknown>) || {};
      const senderId = String((msgRaw.sender as any)?.id || msgRaw.sender_id || "");
      
      // Tìm file config ở các vị trí có thể
      const possibleConfigPaths = [
        path.join(process.cwd(), "openclaw.json"),
        path.join(process.cwd(), "..", "openclaw.json"),
        path.join(process.cwd(), "..", "core", "openclaw-zero-token", ".openclaw-upstream-state", "openclaw.json")
      ];
      
      let configPath = "";
      for (const p of possibleConfigPaths) {
        if (fs.existsSync(p)) {
          configPath = p;
          break;
        }
      }

      if (configPath) {
        try {
          const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
          const allowFrom = config.telegram?.allowFrom || [];
          if (allowFrom.map(String).includes(senderId)) {
            isStaffFromTelegram = true;
          }
        } catch (e) {
          console.warn("[Sync] Lỗi đọc config Admin Telegram:", e);
        }
      }
    }

    // Normalize tin nhắn
    const normalized = normalizeZalouserHistoryMessage({
      sessionKey,
      externalThreadId,
      message: message,
      selfAccountId,
    });

    if (!normalized) return { success: false, reason: "normalization_failed" };

    // THÊM: Đồng bộ thông tin Group từ payload (nếu có)
    if (extractedProvider === "zalouser" && externalThreadId.startsWith("group:")) {
      const groupId = externalThreadId.replace("group:", "");
      const sessionInfo = p.session && typeof p.session === "object" ? (p.session as Record<string, unknown>) : null;
      const groupName = sessionInfo ? String(sessionInfo.name || sessionInfo.title || sessionInfo.displayName || "").trim() : "";
      
      if (groupName) {
        await prisma.integrationGroup.upsert({
          where: { groupId },
          update: { name: groupName, updatedAt: new Date() },
          create: { 
            id: randomUUID(),
            provider: extractedProvider, 
            groupId, 
            name: groupName, 
            accountId: selfAccountId,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        });
      }
    }

    // THÊM: Đồng bộ thông tin sender từ payload (nếu có) vào IntegrationPeer
    const msgRawForSender = message && typeof message === "object" ? (message as Record<string, unknown>) : {};
    const senderSource = msgRawForSender.sender ?? p.sender;
    const sender = senderSource && typeof senderSource === "object" ? (senderSource as Record<string, unknown>) : null;
    if (sender && normalized.direction === "IN") {
      const senderName = String(sender.name || sender.displayName || "").trim();
      const avatarUrl = String(sender.avatar || sender.avatarUrl || "").trim();
      if (senderName) {
        const normalizedPeerId = normalizePeerId(externalThreadId, extractedProvider);
        if (normalizedPeerId) {
          await prisma.integrationPeer.upsert({
            where: { provider_peerId: { provider: extractedProvider, peerId: normalizedPeerId } },
            update: { name: senderName, avatarUrl: avatarUrl || undefined, updatedAt: new Date() },
            create: { 
              id: randomUUID(),
              provider: extractedProvider, 
              peerId: normalizedPeerId, 
              name: senderName, 
              avatarUrl: avatarUrl || null,
              accountId: selfAccountId,
              createdAt: new Date(),
              updatedAt: new Date(),
            }
          });
        }
      }
    }

    // Ghi đè direction nếu là Admin gửi từ Telegram
    if (isStaffFromTelegram) {
      normalized.direction = "STAFF";
    }

    const repo = await createPrismaZalouserConversationRepo();
    
    // Tên hội thoại
    const providerLabel = extractedProvider === "telegram" ? "Telegram" : "Zalo";
    const title = `Hội thoại ${providerLabel}: ${externalThreadId}`;

    const conversation = await repo.getOrCreateConversationSession({
      provider: extractedProvider,
      externalThreadId,
      title,
      openclawSessionKey: sessionKey,
      selfAccountId,
    });

    // Kiểm tra tin nhắn tồn tại
    if (normalized.externalMessageId) {
      const existing = await repo.findMessageByExternalId(conversation.id, normalized.externalMessageId);
      if (existing) return { success: true, inserted: 0, skipped: 1 };
    }

    await repo.createMessage({
      conversationId: conversation.id,
      direction: normalized.direction,
      body: normalized.body,
      externalMessageId: normalized.externalMessageId,
      rawPayloadJson: normalized.rawPayloadJson,
      createdAt: normalized.createdAt,
    });

    const channelLabel = extractedProvider.toUpperCase();
    console.log(`[${channelLabel}] Đã lưu tin nhắn (${normalized.direction}): ${normalized.body.substring(0, 30)}...`);

    // Auto-labeling chỉ cho tin nhắn từ khách hàng (IN)
    if (normalized.direction === "IN" && (conversation as any).customerId) {
      const intent = classifyIntent(normalized.body);
      if (intent !== "GENERAL") {
        const label = getIntentLabel(intent);
        console.log(`[AI] Phát hiện ý định: ${label}. Đang gán nhãn cho khách hàng...`);
        await repo.addLabelToCustomer?.((conversation as any).customerId, label);
      }
    }

    revalidateAdminPaths();
    return { success: true, inserted: 1, skipped: 0 };
  } catch (error) {
    console.error(`[Sync] handleZalouserGatewayEvent error (${event}):`, error);
    return { success: false, error: String(error) };
  }
}
