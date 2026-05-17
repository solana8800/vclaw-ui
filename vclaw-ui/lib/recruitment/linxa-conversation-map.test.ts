import { describe, expect, it } from "vitest";
import {
  extractLinxaConversations,
  mapLinxaConversationToCandidate,
} from "./linxa-conversation-map";

describe("mapLinxaConversationToCandidate", () => {
  it("map profileUrl và sentiment", () => {
    const row = mapLinxaConversationToCandidate({
      name: "Nguyen Van A",
      profileUrl: "https://www.linkedin.com/in/nguyen-a",
      headline: "Senior Dev",
      chatId: "chat-1",
      sentiment: "POSITIVE",
      labels: ["interested"],
    });
    expect(row?.profileUrl).toContain("/in/nguyen-a");
    expect(row?.sentiment).toBe("POSITIVE");
    expect(row?.linxaChatId).toBe("chat-1");
    expect(row?.source).toBe("LINXA_INBOX");
  });

  it("map Linxa participantUrl + tên riêng", () => {
    const row = mapLinxaConversationToCandidate({
      chatId: "2-abc",
      participantFirstName: "Que",
      participantLastName: "Le",
      participantTitle: "Talent Acquisition",
      participantUrl: "https://www.linkedin.com/in/ACoAACPvLaUBZSLI4tKk4p3bo8Exktaf2elLYhI/",
      participantLinkedinId: "ACoAACPvLaUBZSLI4tKk4p3bo8Exktaf2elLYhI",
    });
    expect(row?.name).toBe("Que Le");
    expect(row?.headline).toBe("Talent Acquisition");
    expect(row?.profileUrl).toBe(
      "https://www.linkedin.com/in/ACoAACPvLaUBZSLI4tKk4p3bo8Exktaf2elLYhI",
    );
    expect(row?.linxaChatId).toBe("2-abc");
  });

  it("null khi không có profile và chatId", () => {
    expect(mapLinxaConversationToCandidate({ name: "X" })).toBeNull();
  });

  it("lưu preview tin nhắn từ list Linxa", () => {
    const row = mapLinxaConversationToCandidate({
      chatId: "c-preview",
      participantUrl: "https://www.linkedin.com/in/foo",
      lastMessage: "Em quan tâm vị trí này ạ",
    });
    expect(row?.chatInfo).toContain("quan tâm");
  });

  it("lưu được chỉ với chatId (profileUrl giả lập)", () => {
    const row = mapLinxaConversationToCandidate({
      chatId: "only-chat",
      participantFirstName: "A",
      participantLastName: "B",
    });
    expect(row?.linxaChatId).toBe("only-chat");
    expect(row?.profileUrl).toContain("linxa://chat/");
  });
});

describe("extractLinxaConversations", () => {
  it("đọc mảng data", () => {
    const list = extractLinxaConversations({ data: [{ name: "A", profileUrl: "https://linkedin.com/in/a" }] });
    expect(list).toHaveLength(1);
  });

  it("đọc mảng gốc từ Linxa API", () => {
    const list = extractLinxaConversations([
      { chatId: "1", participantUrl: "https://www.linkedin.com/in/foo" },
    ]);
    expect(list).toHaveLength(1);
  });
});
