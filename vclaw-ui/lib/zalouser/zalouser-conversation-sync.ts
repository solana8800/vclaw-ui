import { revalidateAdminPaths } from "@/lib/admin/revalidate";
import { parseSessionMessageBubble } from "@/lib/zalouser/zalouser-chat-format";

export const ZALOUSER_PROVIDER = "zalouser";

export type ZalouserDirection = "IN" | "OUT" | "SYSTEM";

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
  upsertConversation(input: {
    provider: typeof ZALOUSER_PROVIDER;
    externalThreadId: string;
    title: string;
    openclawSessionKey: string;
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
}): NormalizedZalouserMessage | null {
  if (!input.message || typeof input.message !== "object") return null;
  const message = input.message as Record<string, unknown>;
  const bubble = parseSessionMessageBubble({
    sessionKey: input.sessionKey,
    message,
  });
  const body = bubble.text.trim();
  if (!body) return null;
  const direction: ZalouserDirection =
    bubble.side === "them" ? "IN" : bubble.side === "you" ? "OUT" : "SYSTEM";
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
    upsertConversation(input) {
      return prisma.conversation.upsert({
        where: {
          provider_externalThreadId: {
            provider: input.provider,
            externalThreadId: input.externalThreadId,
          },
        },
        update: {
          title: input.title,
          openclawSessionKey: input.openclawSessionKey,
          updatedAt: new Date(),
        },
        create: {
          provider: input.provider,
          externalThreadId: input.externalThreadId,
          title: input.title,
          openclawSessionKey: input.openclawSessionKey,
        },
        select: { id: true },
      });
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
}) {
  const repo = input.repo ?? await createPrismaZalouserConversationRepo();
  const title =
    typeof input.title === "string" && input.title.trim()
      ? input.title.trim()
      : `Zalo: ${input.externalThreadId}`;
  const conversation = await repo.upsertConversation({
    provider: ZALOUSER_PROVIDER,
    externalThreadId: input.externalThreadId,
    title,
    openclawSessionKey: input.sessionKey,
  });

  let inserted = 0;
  let skipped = 0;
  for (let i = 0; i < input.messages.length; i += 1) {
    const normalized = normalizeZalouserHistoryMessage({
      sessionKey: input.sessionKey,
      externalThreadId: input.externalThreadId,
      message: input.messages[i],
      fallbackIndex: i,
    });
    if (!normalized) {
      skipped += 1;
      continue;
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
    inserted += 1;
  }

  if (inserted > 0 && input.revalidate !== false) revalidateAdminPaths();
  return { conversationId: conversation.id, inserted, skipped };
}
