import { describe, expect, it, vi } from "vitest";
import { ThreadType } from "./zca-constants.js";
import type { Message } from "./zca-client.js";

vi.mock("openclaw/plugin-sdk/state-paths", () => ({
  resolveStateDir: vi.fn(() => "/tmp"),
}));

vi.mock("../runtime-api.js", () => ({
  loadOutboundMediaFromUrl: vi.fn(),
}));

describe("toInboundMessage (OA / wrapper threadId)", async () => {
  const {
    zalouserBuildInboundFromZcaForTest,
    zalouserDecodeWsFrameHeaderForTest,
    zalouserExtractDecodedWsBatchesForTest,
  } = await import("./zalo-js.js");

  it("map DM thường uidFrom + content", () => {
    const msg = {
      type: ThreadType.User,
      threadId: "123456789",
      isSelf: false,
      data: {
        uidFrom: "123456789",
        idTo: "987654321",
        content: "ping",
        msgType: "webchat",
        ts: Date.now(),
      },
    } as unknown as Message;
    const n = zalouserBuildInboundFromZcaForTest(msg);
    expect(n?.threadId).toBe("123456789");
    expect(n?.senderId).toBe("123456789");
    expect(n?.content).toBe("ping");
    expect(n?.msgType).toBe("webchat");
  });

  it("fallback senderId/threadId từ fromUid khi không có threadId wrapper", () => {
    const msg = {
      type: ThreadType.User,
      isSelf: false,
      data: {
        fromUid: "222",
        idTo: "333",
        content: "x",
        ts: 1,
      },
    } as unknown as Message;
    const n = zalouserBuildInboundFromZcaForTest(msg);
    expect(n?.senderId).toBe("222");
    expect(n?.threadId).toBe("222");
  });

  it("map pageMsgs Techcombank dùng uidFrom làm threadId khi idTo là 0", () => {
    const msg = {
      type: 2,
      threadId: "7199462320524442313",
      isSelf: false,
      data: {
        uidFrom: "7199462320524442313",
        idTo: "0",
        dName: "Techcombank",
        msgType: "webchat",
        content: "So du TK +10,000 VND",
        ts: 2,
      },
    } as unknown as Message;

    const n = zalouserBuildInboundFromZcaForTest(msg);

    expect(n?.isChannel).toBe(true);
    expect(n?.threadId).toBe("7199462320524442313");
    expect(n?.senderId).toBe("7199462320524442313");
    expect(n?.senderName).toBe("Techcombank");
  });

  it("decode được header frame WebSocket thô để soi cmd chưa được zca-js parse", () => {
    const frame = Buffer.from([1, 0x09, 0x02, 0x00, 0x7b, 0x7d]);

    expect(zalouserDecodeWsFrameHeaderForTest(frame)).toEqual({
      version: 1,
      cmd: 521,
      subCmd: 0,
      bytes: 6,
    });
  });

  it("extract pageMsgs trong frame user sync để không rơi tin nhắn kênh", () => {
    const batches = zalouserExtractDecodedWsBatchesForTest(
      {
        data: {
          msgs: [
            {
              uidFrom: "111",
              idTo: "999",
              content: "friend",
              ts: 1,
            },
          ],
          pageMsgs: [
            {
              uidFrom: "7199462320524442313",
              idTo: "0",
              dName: "Techcombank",
              msgType: "webchat",
              content: "TK 123 so du +10,000 VND",
              ts: 2,
            },
          ],
        },
      },
      { pageMessagesOnly: true },
    );

    expect(batches).toHaveLength(1);
    expect(batches[0]?.source).toBe("decoded_pageMsgs");
    expect(batches[0]?.messages[0]?.threadId).toBe("7199462320524442313");
    expect(batches[0]?.messages[0]?.type).not.toBe(ThreadType.User);
  });
});
