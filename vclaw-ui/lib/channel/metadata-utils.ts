import { prisma } from "@/lib/db";

export type EnhancedMetadata = {
  sourceLabel: string;
  typeLabel: string;
  origin: string;
  chatType: "group" | "direct";
};

export function getEnrichedMetadata(conv: any): EnhancedMetadata {
  const provider = conv.provider;
  const threadId = conv.externalThreadId || "";
  const isGroup = threadId.startsWith("group:");
  
  const chatType = isGroup ? "group" : "direct";
  const typeLabel = isGroup ? "Nhóm" : "Cá nhân";
  
  let sourceLabel = "Đa kênh";
  if (provider === "zalouser") sourceLabel = "Zalo";
  else if (provider === "telegram") sourceLabel = "Telegram";
  else if (provider === "messenger") sourceLabel = "Messenger";
  else if (provider === "openai") sourceLabel = "OpenAI";
  
  let origin = "Gateway";
  const sessionKey = conv.openclawSessionKey || "";
  if (sessionKey.includes(":webhook:")) origin = "Webhook";
  else if (sessionKey.includes(":vclaw:")) origin = "AI Handler";
  else if (sessionKey.includes(":admin:")) origin = "Admin Dash";
  else if (sessionKey.includes(":openai:")) origin = "OpenAI AI";
  else if (provider === "openai") origin = "AI Direct";

  return { sourceLabel, typeLabel, origin, chatType };
}

/**
 * Trả về tên hiển thị đẹp hơn cho hội thoại/khách hàng
 * Nếu tên là ID, thử tìm trong IntegrationPeer/Group
 */
export async function resolveDisplayName(
  currentName: string | null, 
  externalThreadId: string, 
  provider: string
): Promise<string> {
  const name = currentName || "";
  
  // Nếu tên đã có giá trị thực sự (không phải ID)
  if (name && !name.includes("Hội thoại Zalo:") && !/^\d{15,25}$/.test(name) && !name.startsWith("user:") && !name.startsWith("group:")) {
    return name;
  }

  // Thử tìm trong cache
  if (provider === "zalouser") {
    if (externalThreadId.startsWith("group:")) {
      const groupId = externalThreadId.replace("group:", "");
      const g = await prisma.integrationGroup.findUnique({ where: { groupId } });
      if (g?.name) return g.name;
    } else {
      const peerId = externalThreadId.replace("user:", "");
      const p = await prisma.integrationPeer.findUnique({ 
        where: { 
          provider_peerId: {
            provider,
            peerId
          }
        } 
      });
      if (p?.name) return p.name;
    }
  }

  // Fallback về ID thu gọn hoặc tên hiện tại
  return name || externalThreadId;
}

/**
 * Tự động cập nhật tên khách hàng nếu tìm thấy tên thật trong cache
 */
export async function autoRepairCustomerName(customer: any) {
  if (!customer) return;

  const currentName = customer.name;
  if (!currentName || currentName.includes("Hội thoại Zalo:") || /^\d{15,25}$/.test(currentName)) {
    // Tìm hội thoại liên quan để lấy externalThreadId và provider
    const conv = await prisma.conversation.findFirst({
      where: { customerId: customer.id },
      orderBy: { updatedAt: "desc" }
    });

    if (conv) {
      const realName = await resolveDisplayName(currentName, conv.externalThreadId, conv.provider);
      if (realName !== currentName) {
        await prisma.customer.update({
          where: { id: customer.id },
          data: { name: realName }
        });
        customer.name = realName; // Cập nhật object local
      }
    }
  }
}
