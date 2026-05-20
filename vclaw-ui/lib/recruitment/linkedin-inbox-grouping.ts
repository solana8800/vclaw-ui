export type LinkedInInboundMessageRow = {
  body: string;
  createdAt: Date;
  conversation: {
    externalThreadId: string;
    title: string | null;
    candidate: {
      id: string;
      name: string;
      linkedinProfileIdUrl: string | null;
      profileUrl: string | null;
      extractedInfo: string | null;
    } | null;
  };
};

export type GroupedLinkedInInboxMessage = {
  threadId: string;
  senderName: string;
  senderProfileUrl: string | null;
  lastMessageText: string;
  deliveredAt: number;
  candidateId: string;
  needsProfile: boolean;
  messageCount: number;
  recentMessages: string[];
};

export function groupLinkedInInboundMessagesForAutoReply(
  rows: LinkedInInboundMessageRow[],
): GroupedLinkedInInboxMessage[] {
  const groups = new Map<string, LinkedInInboundMessageRow[]>();

  for (const row of rows) {
    if (!row.body.trim()) continue;
    const key = row.conversation.candidate?.id ?? row.conversation.externalThreadId;
    const existing = groups.get(key);
    if (existing) existing.push(row);
    else groups.set(key, [row]);
  }

  return [...groups.values()]
    .map((items) => {
      const sorted = [...items].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
      const latest = sorted[sorted.length - 1]!;
      const candidate = latest.conversation.candidate;
      return {
        threadId: latest.conversation.externalThreadId,
        senderName: latest.conversation.title ?? candidate?.name ?? "LinkedIn",
        senderProfileUrl: candidate?.linkedinProfileIdUrl ?? candidate?.profileUrl ?? null,
        lastMessageText: latest.body,
        deliveredAt: latest.createdAt.getTime(),
        candidateId: candidate?.id ?? "",
        needsProfile: !candidate?.extractedInfo,
        messageCount: sorted.length,
        recentMessages: sorted.map((item) => item.body),
      };
    })
    .sort((a, b) => b.deliveredAt - a.deliveredAt);
}
