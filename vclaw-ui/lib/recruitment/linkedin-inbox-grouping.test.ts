import { describe, expect, it } from "vitest";
import { groupLinkedInInboundMessagesForAutoReply } from "@/lib/recruitment/linkedin-inbox-grouping";

describe("groupLinkedInInboundMessagesForAutoReply", () => {
  it("groups multiple new messages from the same candidate into one auto-reply target", () => {
    const grouped = groupLinkedInInboundMessagesForAutoReply([
      {
        body: "tin 3",
        createdAt: new Date("2026-05-20T08:03:00.000Z"),
        conversation: {
          externalThreadId: "thread-1",
          title: "Nguyen A",
          candidate: {
            id: "cand-1",
            name: "Nguyen A",
            linkedinProfileIdUrl: "https://www.linkedin.com/in/ACo123",
            profileUrl: null,
            extractedInfo: null,
          },
        },
      },
      {
        body: "tin 1",
        createdAt: new Date("2026-05-20T08:01:00.000Z"),
        conversation: {
          externalThreadId: "thread-1",
          title: "Nguyen A",
          candidate: {
            id: "cand-1",
            name: "Nguyen A",
            linkedinProfileIdUrl: "https://www.linkedin.com/in/ACo123",
            profileUrl: null,
            extractedInfo: null,
          },
        },
      },
      {
        body: "tin 2",
        createdAt: new Date("2026-05-20T08:02:00.000Z"),
        conversation: {
          externalThreadId: "thread-1",
          title: "Nguyen A",
          candidate: {
            id: "cand-1",
            name: "Nguyen A",
            linkedinProfileIdUrl: "https://www.linkedin.com/in/ACo123",
            profileUrl: null,
            extractedInfo: null,
          },
        },
      },
    ]);

    expect(grouped).toHaveLength(1);
    expect(grouped[0]).toMatchObject({
      candidateId: "cand-1",
      senderName: "Nguyen A",
      threadId: "thread-1",
      lastMessageText: "tin 3",
      messageCount: 3,
      recentMessages: ["tin 1", "tin 2", "tin 3"],
    });
  });
});
